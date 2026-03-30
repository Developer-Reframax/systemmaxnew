import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface UsuarioDetalhado {
  matricula: number
  nome?: string | null
  email?: string | null
  funcao?: string | null
  equipe?:
    | { equipe?: string | null }
    | Array<{ equipe?: string | null }>
    | null
  letra?:
    | { letra?: string | null }
    | Array<{ letra?: string | null }>
    | null
}

interface UsuarioBasico {
  matricula?: number | null
  nome?: string | null
  email?: string | null
  funcao?: string | null
  contrato_raiz?: string | null
}

interface ParticipanteRegistro3P {
  id: number
  matricula_participante?: number | null
  participante?: UsuarioBasico | UsuarioBasico[] | null
}

interface Registro3PExportacao {
  id: number
  atividade?: string | null
  paralisacao_realizada?: boolean | null
  riscos_avaliados?: boolean | null
  ambiente_avaliado?: boolean | null
  passo_descrito?: boolean | null
  hipoteses_levantadas?: boolean | null
  atividade_segura?: boolean | null
  tipo?: string | null
  created_at?: string | null
  area?: { id?: number; local?: string | null; contrato?: string | null } | Array<{ id?: number; local?: string | null; contrato?: string | null }> | null
  criador?: UsuarioBasico | UsuarioBasico[] | null
  participantes?: ParticipanteRegistro3P[] | null
}

const firstItem = <T,>(value?: T | T[] | null): T | null => {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

const getNestedValue = <T extends Record<string, unknown>>(
  value: T | T[] | null | undefined,
  key: keyof T
) => {
  const item = firstItem(value)
  const nestedValue = item?.[key]
  return typeof nestedValue === 'string' ? nestedValue : null
}

const enrichUsuario = (
  matricula: number | null | undefined,
  fallback: UsuarioBasico | null,
  usuariosMap: Map<number, UsuarioDetalhado>
) => {
  if (!matricula) {
    return {
      matricula_colaborador: null,
      nome_colaborador: fallback?.nome || null,
      funcao_colaborador: fallback?.funcao || null,
      equipe_colaborador: null,
      letra_colaborador: null
    }
  }

  const usuarioDetalhado = usuariosMap.get(matricula)

  return {
    matricula_colaborador: matricula,
    nome_colaborador: usuarioDetalhado?.nome || fallback?.nome || null,
    funcao_colaborador: usuarioDetalhado?.funcao || fallback?.funcao || null,
    equipe_colaborador: getNestedValue(usuarioDetalhado?.equipe, 'equipe'),
    letra_colaborador: getNestedValue(usuarioDetalhado?.letra, 'letra')
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 })
    }

    const contrato = authResult.user?.contrato_raiz
    if (!contrato) {
      return NextResponse.json({ error: 'Contrato do usuario nao informado' }, { status: 400 })
    }

    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select(`
        matricula,
        nome,
        email,
        funcao,
        equipe:equipes!usuarios_equipe_id_fkey(equipe),
        letra:letras!usuarios_letra_id_fkey(letra)
      `)
      .eq('contrato_raiz', contrato)
      .order('nome', { ascending: true })

    if (usuariosError) {
      console.error('Erro ao buscar usuarios para exportacao de 3P:', usuariosError)
      return NextResponse.json({ error: 'Erro ao buscar usuarios' }, { status: 500 })
    }

    const usuariosMap = new Map<number, UsuarioDetalhado>()
    ;(usuarios as UsuarioDetalhado[] | null | undefined)?.forEach((usuario) => {
      usuariosMap.set(Number(usuario.matricula), usuario)
    })

    const { data: registros, error: registrosError } = await supabase
      .from('registros_3ps')
      .select(`
        id,
        atividade,
        paralisacao_realizada,
        riscos_avaliados,
        ambiente_avaliado,
        passo_descrito,
        hipoteses_levantadas,
        atividade_segura,
        tipo,
        created_at,
        area:locais(id, local, contrato),
        criador:usuarios!registros_3ps_matricula_criador_fkey!inner(matricula, nome, email, funcao, contrato_raiz),
        participantes:participantes_3ps(
          id,
          matricula_participante,
          participante:usuarios!participantes_3ps_matricula_participante_fkey(matricula, nome, email, funcao)
        )
      `)
      .eq('criador.contrato_raiz', contrato)
      .order('created_at', { ascending: false })

    if (registrosError) {
      console.error('Erro ao buscar registros 3P para exportacao:', registrosError)
      return NextResponse.json({ error: 'Erro ao buscar registros 3P' }, { status: 500 })
    }

    const rows = ((registros as Registro3PExportacao[] | null) || []).flatMap((registro) => {
      const areaInfo = firstItem(registro.area)
      const criadorInfo = firstItem(registro.criador)
      const creatorMatricula = criadorInfo?.matricula || null
      const creatorContrato = criadorInfo?.contrato_raiz || null
      const creatorDetalhes = enrichUsuario(creatorMatricula, criadorInfo, usuariosMap)
      const baseRow = {
        registro_id: registro.id,
        data_hora_registro: registro.created_at || null,
        area_id: areaInfo?.id || null,
        area: areaInfo?.local || null,
        contrato: creatorContrato || contrato,
        atividade: registro.atividade || null,
        tipo_3p: registro.tipo || null,
        paralisacao_realizada: registro.paralisacao_realizada ?? null,
        riscos_avaliados: registro.riscos_avaliados ?? null,
        ambiente_avaliado: registro.ambiente_avaliado ?? null,
        passo_descrito: registro.passo_descrito ?? null,
        hipoteses_levantadas: registro.hipoteses_levantadas ?? null,
        atividade_segura: registro.atividade_segura ?? null,
        matricula_criador: creatorDetalhes.matricula_colaborador,
        nome_criador: creatorDetalhes.nome_colaborador
      }

      const exportRows = [
        {
          ...baseRow,
          tipo_vinculo: 'Criador',
          ...creatorDetalhes
        }
      ]

      const processedMatriculas = new Set<number>()
      if (creatorMatricula) {
        processedMatriculas.add(creatorMatricula)
      }

      registro.participantes?.forEach((participanteRegistro) => {
        const participanteInfo = firstItem(participanteRegistro.participante)
        const matriculaParticipante =
          participanteRegistro.matricula_participante || participanteInfo?.matricula || null

        if (!matriculaParticipante || processedMatriculas.has(matriculaParticipante)) {
          return
        }

        processedMatriculas.add(matriculaParticipante)

        exportRows.push({
          ...baseRow,
          tipo_vinculo: 'Participante',
          ...enrichUsuario(matriculaParticipante, participanteInfo, usuariosMap)
        })
      })

      return exportRows
    })

    return NextResponse.json({
      success: true,
      data: rows
    })
  } catch (error) {
    console.error('Erro na API de exportacao de colaboradores 3P:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
