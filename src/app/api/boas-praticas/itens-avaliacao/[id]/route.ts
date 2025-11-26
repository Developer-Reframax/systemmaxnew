import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'

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
      .from('boaspraticas_itens_avaliacao')
      .select('*')
      .eq('id', Number(id))
      .maybeSingle()

    if (error || !data) return NextResponse.json({ error: 'Item nao encontrado' }, { status: 404 })
    return NextResponse.json({ success: true, data })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyJWTToken(request)
    if (!auth.success) return NextResponse.json({ error: auth.error }, { status: 401 })
    if (!auth.user?.role || !['Admin', 'Editor'].includes(String(auth.user.role))) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { id } = await context.params
    const body = await request.json()
    if (!body.item) return NextResponse.json({ error: 'Campo item obrigatorio' }, { status: 400 })
    const eliminatorio = Boolean(body.eliminatoria)

    const { data, error } = await supabase
      .from('boaspraticas_itens_avaliacao')
      .update({ item: body.item, eliminatoria: eliminatorio })
      .eq('id', Number(id))
      .select('*')
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message || 'Erro ao atualizar item' }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Item nao encontrado' }, { status: 404 })
    return NextResponse.json({ success: true, data })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyJWTToken(request)
    if (!auth.success) return NextResponse.json({ error: auth.error }, { status: 401 })
    if (!auth.user?.role || !['Admin', 'Editor'].includes(String(auth.user.role))) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { id } = await context.params
    const { error } = await supabase
      .from('boaspraticas_itens_avaliacao')
      .delete()
      .eq('id', Number(id))

    if (error) return NextResponse.json({ error: 'Erro ao excluir item' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
