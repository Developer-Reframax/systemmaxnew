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

    const { data, error } = await supabase
      .from('boaspraticas_praticas')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Boa pratica nao encontrada' }, { status: 404 })
    if (data.responsavel_etapa !== auth.user?.matricula) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { data: itens } = await supabase
      .from('boaspraticas_itens_avaliacao')
      .select('*')
      .order('id')

    return NextResponse.json({ success: true, data, itens: itens || [] })
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

    if (!respostas.length) return NextResponse.json({ error: 'Respostas obrigatorias' }, { status: 400 })

    // validar pratica e responsavel
    const { data: pratica } = await supabase
      .from('boaspraticas_praticas')
      .select('id, contrato, responsavel_etapa, status')
      .eq('id', id)
      .single()
    if (!pratica) return NextResponse.json({ error: 'Boa pratica nao encontrada' }, { status: 404 })
    if (pratica.responsavel_etapa !== auth.user?.matricula || pratica.status !== 'Aguardando avaliacao do sesmt') {
      return NextResponse.json({ error: 'Acesso negado ou status invalido' }, { status: 403 })
    }

    const { data: itens } = await supabase.from('boaspraticas_itens_avaliacao').select('id, eliminatoria')
    const itensData = (itens || []) as { id: number; eliminatoria?: boolean | null }[]
    const itensIds = itensData.map((i) => i.id)
    const idsRespondidos = respostas.map(r => r.item_id)
    const faltando = itensIds.filter(idItem => !idsRespondidos.includes(idItem))
    if (faltando.length > 0) {
      return NextResponse.json({ error: 'Todos os itens sao obrigatorios' }, { status: 400 })
    }

    await supabase.from('boaspraticas_respostas_avaliacao').insert(
      respostas.map(r => ({
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
          eliminada: true
        })
        .eq('id', id)

      return NextResponse.json({
        success: true,
        eliminada: true,
        message:
          'De acordo com as respostas, a pratica foi marcada como eliminada e nao seguira o fluxo de avaliacao/premiacao.'
      })
    }

    // buscar responsavel gestor
    let novoResponsavel: number | null = null
    if (pratica.contrato) {
      const { data: respContrato } = await supabase
        .from('boaspraticas_responsaveis_contratos')
        .select('responsavel_gestor')
        .eq('codigo_contrato', pratica.contrato)
        .maybeSingle()
      if (respContrato?.responsavel_gestor) novoResponsavel = respContrato.responsavel_gestor
    }

    await supabase
      .from('boaspraticas_praticas')
      .update({
        status: 'Aguardando avaliacao da gestao' as StatusBoaPratica,
        responsavel_etapa: novoResponsavel
      })
      .eq('id', id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
