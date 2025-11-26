import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { StatusBoaPratica } from '@/types/boas-praticas'

type PraticaValidacaoRow = {
  id: string
  status?: string | null
  responsavel_etapa?: number | null
  contrato?: string | null
  relevancia?: number | null
  validacao?: boolean | null
  comentario_validacao?: string | null
}

type RespostaRow = { item_id: number; resposta: boolean }
type ItemAvaliacaoRow = { id: number; item: string }

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
      .select('id, status, contrato, responsavel_etapa, relevancia, validacao, comentario_validacao')
      .eq('id', id)
      .maybeSingle()

    const praticaData = (pratica as PraticaValidacaoRow | null) || null

    if (!praticaData || praticaData.status !== 'Aguardando validacao') {
      return NextResponse.json({ error: 'Boa pratica indisponivel para validacao' }, { status: 404 })
    }

    if (praticaData.responsavel_etapa !== auth.user?.matricula) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const [{ data: itens }, { data: respostas }] = await Promise.all([
      supabase.from('boaspraticas_itens_avaliacao').select('id, item').order('id'),
      supabase
        .from('boaspraticas_respostas_avaliacao')
        .select('item_id, resposta')
        .eq('pratica_id', id)
    ])

    return NextResponse.json({
      success: true,
      data: {
        ...praticaData
      },
      itens: (itens || []) as ItemAvaliacaoRow[],
      respostas: (respostas || []) as RespostaRow[]
    })
  } catch (error) {
    console.error('Erro no GET validacao:', error)
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
    const valida = Boolean(body?.valida)
    const comentario: string = body?.comentario || ''

    const { data: pratica } = await supabase
      .from('boaspraticas_praticas')
      .select('id, status, responsavel_etapa')
      .eq('id', id)
      .maybeSingle()

    const praticaData = (pratica as PraticaValidacaoRow | null) || null
    if (!praticaData || praticaData.status !== 'Aguardando validacao') {
      return NextResponse.json({ error: 'Boa pratica indisponivel para validacao' }, { status: 404 })
    }

    if (praticaData.responsavel_etapa !== auth.user?.matricula) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    if (!valida && !comentario.trim()) {
      return NextResponse.json({ error: 'Comentario obrigatorio para invalidar a boa pratica' }, { status: 400 })
    }

    const update = {
      status: (valida ? 'Aguardando votacao trimestral' : 'Concluído') as StatusBoaPratica,
      validacao: valida,
      comentario_validacao: valida ? null : comentario.trim(),
      responsavel_etapa: null
    }

    const { error } = await supabase.from('boaspraticas_praticas').update(update).eq('id', id)
    if (error) {
      return NextResponse.json({ error: 'Erro ao salvar validacao' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro no POST validacao:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
