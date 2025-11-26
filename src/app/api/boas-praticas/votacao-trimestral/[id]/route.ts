import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'

type PerguntaId = 1 | 2 | 3 | 4 | 5

type PerguntaResposta = 'insatisfatorio' | 'satisfatorio' | 'bom' | 'muito bom' | 'otimo'

const VALORES: Record<PerguntaResposta, number> = {
  insatisfatorio: 1,
  satisfatorio: 2,
  bom: 3,
  'muito bom': 4,
  otimo: 5
}

const PESOS: Record<PerguntaId, number> = {
  1: 1,
  2: 3,
  3: 2,
  4: 5,
  5: 4
}

type EnvolvidoRow = { matricula_envolvido: number }
type EvidenciaRow = { id: string; url: string; descricao?: string | null }
type UsuarioRow = { matricula: number; nome?: string | null }
type TagRow = { id: number; nome: string; cor?: string | null }
type PraticaDetalheRow = {
  id: string
  contrato?: string | null
  status?: string
  pilar?: number | null
  categoria?: number | null
  elimina_desperdicio?: number | null
  area_aplicada?: number | string | null
  matricula_cadastrante?: number | null
  tags?: unknown
  envolvidos?: EnvolvidoRow[]
  evidencias?: EvidenciaRow[]
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function carregarDetalhe(praticaId: string) {
  const { data, error } = await supabase
    .from('boaspraticas_praticas')
    .select(
      `*,
      envolvidos:boaspraticas_envolvidos(matricula_envolvido),
      evidencias:boaspraticas_evidencias(*)
    `
    )
    .eq('id', praticaId)
    .single()

  if (error || !data) return null

  const base = data as unknown as PraticaDetalheRow

  const tagsIds = Array.isArray(base.tags) ? base.tags.filter((t: unknown) => typeof t === 'number') : []
  const envolvidosMatriculas = Array.isArray(base.envolvidos)
    ? base.envolvidos.map((ev) => ev.matricula_envolvido).filter((m: unknown) => typeof m === 'number')
    : []

  const [pilarRes, categoriaRes, eliminaRes, areaRes, tagsRes, usuariosRes, autorRes] = await Promise.all([
    base.pilar
      ? supabase.from('boaspraticas_pilar').select('nome').eq('id', base.pilar).maybeSingle()
      : Promise.resolve({ data: null }),
    base.categoria
      ? supabase.from('boaspraticas_categoria').select('nome').eq('id', base.categoria).maybeSingle()
      : Promise.resolve({ data: null }),
    base.elimina_desperdicio
      ? supabase.from('boaspraticas_elimina_desperdicio').select('nome').eq('id', base.elimina_desperdicio).maybeSingle()
      : Promise.resolve({ data: null }),
    typeof base.area_aplicada === 'number'
      ? supabase.from('boaspraticas_area_aplicada').select('nome').eq('id', base.area_aplicada).maybeSingle()
      : Promise.resolve({ data: null }),
    tagsIds.length
      ? supabase.from('boaspraticas_tags_catalogo').select('id, nome, cor').in('id', tagsIds)
      : Promise.resolve({ data: [] }),
    envolvidosMatriculas.length
      ? supabase.from('usuarios').select('matricula, nome').in('matricula', envolvidosMatriculas)
      : Promise.resolve({ data: [] }),
    base.matricula_cadastrante
      ? supabase.from('usuarios').select('nome').eq('matricula', base.matricula_cadastrante).maybeSingle()
      : Promise.resolve({ data: null })
  ])

  const usuariosData = (usuariosRes.data ?? []) as unknown as UsuarioRow[]
  const usuariosMap = new Map<number, string>(usuariosData.map((u) => [u.matricula, u.nome || '']))

  return {
    ...base,
    pilar_nome: pilarRes?.data?.nome || null,
    categoria_nome: categoriaRes?.data?.nome || null,
    elimina_desperdicio_nome: eliminaRes?.data?.nome || null,
    area_aplicada_nome: typeof base.area_aplicada === 'string' ? base.area_aplicada : areaRes?.data?.nome || null,
    autor_nome: autorRes?.data?.nome || null,
    tags_detalhes: ((tagsRes.data ?? []) as unknown as TagRow[]).map((t) => ({
      id: t.id,
      nome: t.nome,
      cor: t.cor || null
    })),
    envolvidos: Array.isArray(base.envolvidos)
      ? base.envolvidos.map((ev) => ({
          ...ev,
          nome_envolvido: usuariosMap.get(ev.matricula_envolvido)
        }))
      : [],
    evidencias: Array.isArray(base.evidencias)
      ? base.evidencias.map((ev) => ({
          ...ev,
          nome_arquivo: ev.url ? ev.url.split('/').pop() || 'evidencia' : 'evidencia'
        }))
      : []
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyJWTToken(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }
    const { id } = await params

    const { data: pratica } = await supabase
      .from('boaspraticas_praticas')
      .select('id, contrato, status')
      .eq('id', id)
      .maybeSingle()

    if (!pratica || pratica.status !== 'Aguardando votacao trimestral') {
      return NextResponse.json({ error: 'Boa pratica indisponivel para votacao' }, { status: 404 })
    }

    if (auth.user?.contrato_raiz && pratica.contrato !== auth.user.contrato_raiz) {
      return NextResponse.json({ error: 'Acesso negado para este contrato' }, { status: 403 })
    }

    const { data: votoExistente } = await supabase
      .from('boaspraticas_votos')
      .select('id')
      .eq('pratica_id', id)
      .eq('matricula', auth.user?.matricula)
      .eq('tipo', 'trimestral')
      .maybeSingle()

    if (votoExistente) {
      return NextResponse.json({ error: 'Voto ja realizado para esta pratica' }, { status: 409 })
    }

    const detalhe = await carregarDetalhe(id)
    if (!detalhe) {
      return NextResponse.json({ error: 'Nao foi possivel carregar detalhes' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: detalhe })
  } catch (error) {
    console.error('Erro no GET votacao trimestral:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyJWTToken(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const respostas = body?.respostas as Record<string, PerguntaResposta>

    const perguntasIds: PerguntaId[] = [1, 2, 3, 4, 5]
    const respostasArray = perguntasIds.map((pid) => respostas?.[String(pid)])

    if (respostasArray.some((r) => !r || !(r in VALORES))) {
      return NextResponse.json({ error: 'Todas as respostas sao obrigatorias' }, { status: 400 })
    }

    const { data: pratica } = await supabase
      .from('boaspraticas_praticas')
      .select('id, contrato, status')
      .eq('id', id)
      .maybeSingle()

    if (!pratica || pratica.status !== 'Aguardando votacao trimestral') {
      return NextResponse.json({ error: 'Boa pratica indisponivel para votacao' }, { status: 404 })
    }

    if (auth.user?.contrato_raiz && pratica.contrato !== auth.user.contrato_raiz) {
      return NextResponse.json({ error: 'Acesso negado para este contrato' }, { status: 403 })
    }

    const { data: votoExistente } = await supabase
      .from('boaspraticas_votos')
      .select('id')
      .eq('pratica_id', id)
      .eq('matricula', auth.user?.matricula)
      .eq('tipo', 'trimestral')
      .maybeSingle()

    if (votoExistente) {
      return NextResponse.json({ error: 'Voto ja realizado para esta pratica' }, { status: 409 })
    }

    const nota = perguntasIds.reduce((acc, pid) => {
      const resp = respostas[String(pid)] as PerguntaResposta
      const valor = VALORES[resp]
      const peso = PESOS[pid]
      return acc + valor * peso
    }, 0)

    const { error } = await supabase.from('boaspraticas_votos').insert({
      pratica_id: id,
      matricula: auth.user?.matricula,
      tipo: 'trimestral',
      nota,
      respostas
    })

    if (error) {
      console.error('Erro ao salvar voto:', error)
      return NextResponse.json({ error: 'Erro ao salvar voto' }, { status: 500 })
    }

    return NextResponse.json({ success: true, nota })
  } catch (error) {
    console.error('Erro no POST votacao trimestral:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
