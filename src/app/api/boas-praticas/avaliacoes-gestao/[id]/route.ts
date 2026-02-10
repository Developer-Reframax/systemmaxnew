import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { StatusBoaPratica } from '@/types/boas-praticas'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyJWTToken(request)
    if (!auth.success) return NextResponse.json({ error: auth.error }, { status: 401 })
    const { id } = await context.params

    const { data: pratica } = await supabase
      .from('boaspraticas_praticas')
      .select('id, contrato, responsavel_etapa, status')
      .eq('id', id)
      .maybeSingle()

    if (!pratica) return NextResponse.json({ error: 'Boa pratica nao encontrada' }, { status: 404 })
    if (pratica.responsavel_etapa !== auth.user?.matricula || pratica.status !== 'Aguardando avaliacao da gestao') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const [{ data: itens }, { data: respostas }] = await Promise.all([
      supabase.from('boaspraticas_itens_avaliacao').select('id, item, eliminatoria').order('id'),
      supabase
        .from('boaspraticas_respostas_avaliacao')
        .select('item_id, resposta')
        .eq('pratica_id', id)
    ])

    return NextResponse.json({
      success: true,
      data: pratica,
      itens: itens || [],
      respostas: respostas || []
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyJWTToken(request)
    if (!auth.success) return NextResponse.json({ error: auth.error }, { status: 401 })
    const { id } = await context.params
    const body = await request.json()
    const respostas: { item_id: number; resposta: boolean }[] = Array.isArray(body.respostas) ? body.respostas : []
    const relevancia = Number(body.relevancia)
    if (!relevancia || relevancia < 1 || relevancia > 5) {
      return NextResponse.json({ error: 'Relevancia obrigatoria (1 a 5)' }, { status: 400 })
    }

    const { data: pratica } = await supabase
      .from('boaspraticas_praticas')
      .select('id, contrato, responsavel_etapa, status')
      .eq('id', id)
      .maybeSingle()
    if (!pratica) return NextResponse.json({ error: 'Boa pratica nao encontrada' }, { status: 404 })
    if (pratica.responsavel_etapa !== auth.user?.matricula || pratica.status !== 'Aguardando avaliacao da gestao') {
      return NextResponse.json({ error: 'Acesso negado ou status invalido' }, { status: 403 })
    }

    const { data: itens } = await supabase.from('boaspraticas_itens_avaliacao').select('id, eliminatoria')
    const itensData = (itens || []) as { id: number; eliminatoria?: boolean | null }[]
    const itensIds = itensData.map((i) => i.id)
    const idsRespondidos = respostas.map((r) => r.item_id)
    const faltando = itensIds.filter((idItem) => !idsRespondidos.includes(idItem))
    if (faltando.length > 0) {
      return NextResponse.json({ error: 'Todos os itens sao obrigatorios' }, { status: 400 })
    }

    await supabase
      .from('boaspraticas_respostas_avaliacao')
      .delete()
      .eq('pratica_id', id)

    await supabase.from('boaspraticas_respostas_avaliacao').insert(
      respostas.map((r) => ({
        pratica_id: id,
        item_id: r.item_id,
        resposta: !!r.resposta,
        avaliador_matricula: auth.user?.matricula
      }))
    )

    const eliminatoriasMap = new Map<number, boolean>()
    itensData.forEach((i) => eliminatoriasMap.set(i.id, Boolean(i.eliminatoria)))
    const possuiEliminatoriaPositiva = respostas.some(
      (resp) => eliminatoriasMap.get(resp.item_id) && resp.resposta === true
    )

    if (possuiEliminatoriaPositiva) {
      await supabase
        .from('boaspraticas_praticas')
        .update({
          status: 'Concluído' as StatusBoaPratica,
          responsavel_etapa: null,
          eliminada: true,
          relevancia: null
        })
        .eq('id', id)

      return NextResponse.json({
        success: true,
        eliminada: true,
        message:
          'De acordo com as respostas, a pratica foi marcada como eliminada e nao seguira o fluxo de avaliacao/premiacao.'
      })
    }

    await supabase
      .from('boaspraticas_praticas')
      .update({
        status: 'Aguardando validacao' as StatusBoaPratica,
        responsavel_etapa: 127520,
        relevancia
      })
      .eq('id', id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
