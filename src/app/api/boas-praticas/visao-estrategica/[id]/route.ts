import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'

type StatusKey = 'sesmt' | 'gestao' | 'validacao' | 'trimestral' | 'anual' | 'concluida'

type PraticaRow = {
  id: string
  contrato?: string | null
  status?: string | null
  relevancia?: number | null
}

type ResponsavelContratoRow = {
  responsavel_sesmt?: number | null
  responsavel_gestor?: number | null
}

type ComiteRow = {
  id: number
  nome: string
  tipo: 'local' | 'corporativo'
  codigo_contrato?: string | null
}

type ComiteMembroRow = {
  comite_id: number
  matricula: number
  usuario?: {
    matricula?: number | null
    nome?: string | null
  } | null
}

type VotoRow = {
  matricula: number
  tipo: 'trimestral' | 'anual'
}

type UsuarioRow = {
  matricula: number
  nome?: string | null
}

type UsuarioResumo = {
  matricula: number
  nome?: string | null
}

type EtapaCiclo = {
  chave: StatusKey
  label: string
  ativa: boolean
  concluida: boolean
}

type ParticipanteVotacao = UsuarioResumo & { votou: boolean }

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const normalizarStatus = (status?: string | null) => (status || '').trim().toLowerCase()

const obterIndiceEtapa = (status?: string | null) => {
  const value = normalizarStatus(status)
  switch (value) {
    case 'aguardando avaliacao do sesmt':
      return 0
    case 'aguardando avaliacao da gestao':
      return 1
    case 'aguardando votacao trimestral':
      return 3
    case 'aguardando validacao':
      return 2
    case 'aguardando votacao anual':
      return 4
    default:
      return 5
  }
}

const montarEtapas = (status?: string | null): EtapaCiclo[] => {
  const indice = obterIndiceEtapa(status)
  const etapas: { chave: StatusKey; label: string }[] = [
    { chave: 'sesmt', label: 'Avaliacao SESMT' },
    { chave: 'gestao', label: 'Avaliacao da gestao' },
    { chave: 'validacao', label: 'Validacao' },
    { chave: 'trimestral', label: 'Votacao trimestral' },
    { chave: 'anual', label: 'Votacao anual' },
    { chave: 'concluida', label: 'Conclusao' }
  ]

  return etapas.map((etapa, index) => ({
    ...etapa,
    ativa: index === indice,
    concluida: index < indice
  }))
}

const montarParticipantes = (
  membros: ComiteMembroRow[],
  votos: Set<number>
): ParticipanteVotacao[] =>
  membros.map((membro) => ({
    matricula: membro.matricula,
    nome: membro.usuario?.nome || undefined,
    votou: votos.has(membro.matricula)
  }))

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyJWTToken(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const { id } = await context.params

    const { data: pratica } = await supabase
      .from('boaspraticas_praticas')
      .select('id, contrato, status, relevancia')
      .eq('id', id)
      .maybeSingle()

    const praticaData = (pratica as PraticaRow | null) || null

    if (!praticaData) {
      return NextResponse.json({ error: 'Boa pratica nao encontrada' }, { status: 404 })
    }

    const [{ data: respContrato }, { data: comiteLocal }, { data: comiteCorporativo }, { data: votos }] =
      await Promise.all([
        praticaData.contrato
          ? supabase
              .from('boaspraticas_responsaveis_contratos')
              .select('responsavel_sesmt, responsavel_gestor')
              .eq('codigo_contrato', praticaData.contrato)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        praticaData.contrato
          ? supabase
              .from('boaspraticas_comite')
              .select('*')
              .eq('tipo', 'local')
              .eq('codigo_contrato', praticaData.contrato)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from('boaspraticas_comite').select('*').eq('tipo', 'corporativo').limit(1).maybeSingle(),
        supabase.from('boaspraticas_votos').select('matricula, tipo').eq('pratica_id', id)
      ])

    const responsavelContrato = (respContrato as ResponsavelContratoRow | null) || null
    const comiteLocalRow = (comiteLocal as ComiteRow | null) || null
    const comiteCorporativoRow = (comiteCorporativo as ComiteRow | null) || null
    const votosData = ((votos as VotoRow[]) || []) as VotoRow[]

    const votosTrimestral = new Set(
      votosData.filter((voto) => voto.tipo === 'trimestral').map((voto) => voto.matricula)
    )
    const votosAnual = new Set(
      votosData.filter((voto) => voto.tipo === 'anual').map((voto) => voto.matricula)
    )

    const responsaveisMatriculas = [
      responsavelContrato?.responsavel_sesmt,
      responsavelContrato?.responsavel_gestor
    ].filter((matricula): matricula is number => typeof matricula === 'number')

    const { data: usuariosResp } = responsaveisMatriculas.length
      ? await supabase.from('usuarios').select('matricula, nome').in('matricula', responsaveisMatriculas)
      : { data: [] as UsuarioRow[] }

    const usuarioMap = new Map<number, UsuarioResumo>(
      ((usuariosResp || []) as UsuarioRow[]).map((usuario) => [
        usuario.matricula,
        { matricula: usuario.matricula, nome: usuario.nome }
      ])
    )

    const [membrosLocalRes, membrosCorporativoRes] = await Promise.all([
      comiteLocalRow
        ? supabase
            .from('boaspraticas_comite_membros')
            .select('comite_id, matricula, usuario:usuarios(matricula, nome)')
            .eq('comite_id', comiteLocalRow.id)
        : Promise.resolve({ data: [] as ComiteMembroRow[] }),
      comiteCorporativoRow
        ? supabase
            .from('boaspraticas_comite_membros')
            .select('comite_id, matricula, usuario:usuarios(matricula, nome)')
            .eq('comite_id', comiteCorporativoRow.id)
        : Promise.resolve({ data: [] as ComiteMembroRow[] })
    ])

    const membrosLocal = ((membrosLocalRes.data || []) as ComiteMembroRow[]) || []
    const membrosCorporativo = ((membrosCorporativoRes.data || []) as ComiteMembroRow[]) || []

    const etapaIndice = obterIndiceEtapa(praticaData.status)

    const sesmtRealizada = etapaIndice > 0
    const gestaoRealizada = etapaIndice > 1 || typeof praticaData.relevancia === 'number'

    return NextResponse.json({
      success: true,
      data: {
        pratica: {
          id: praticaData.id,
          contrato: praticaData.contrato || null,
          status: praticaData.status || 'Sem status',
          relevancia: praticaData.relevancia ?? null
        },
        etapas: montarEtapas(praticaData.status),
        sesmt: {
          responsavel: responsavelContrato?.responsavel_sesmt
            ? usuarioMap.get(responsavelContrato.responsavel_sesmt) || {
                matricula: responsavelContrato.responsavel_sesmt
              }
            : null,
          realizada: sesmtRealizada
        },
        gestao: {
          responsavel: responsavelContrato?.responsavel_gestor
            ? usuarioMap.get(responsavelContrato.responsavel_gestor) || {
                matricula: responsavelContrato.responsavel_gestor
              }
            : null,
          relevancia: praticaData.relevancia ?? null,
          realizada: gestaoRealizada
        },
        trimestral: {
          comite: comiteLocalRow
            ? {
                id: comiteLocalRow.id,
                nome: comiteLocalRow.nome,
                tipo: comiteLocalRow.tipo,
                codigo_contrato: comiteLocalRow.codigo_contrato || null
              }
            : null,
          participantes: montarParticipantes(membrosLocal, votosTrimestral)
        },
        anual: {
          comite: comiteCorporativoRow
            ? {
                id: comiteCorporativoRow.id,
                nome: comiteCorporativoRow.nome,
                tipo: comiteCorporativoRow.tipo,
                codigo_contrato: comiteCorporativoRow.codigo_contrato || null
              }
            : null,
          participantes: montarParticipantes(membrosCorporativo, votosAnual)
        }
      }
    })
  } catch (error) {
    console.error('Erro na visao estrategica:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
