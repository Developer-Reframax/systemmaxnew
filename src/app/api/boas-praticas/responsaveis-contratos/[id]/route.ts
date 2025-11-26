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
      .from('boaspraticas_responsaveis_contratos')
      .select('*')
      .eq('id', Number(id))
      .single()

    if (error || !data) return NextResponse.json({ error: 'Registro nao encontrado' }, { status: 404 })
    return NextResponse.json({ success: true, data })
  } catch  {
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
    const { codigo_contrato, responsavel_sesmt, responsavel_gestor } = body

    const { data, error } = await supabase
      .from('boaspraticas_responsaveis_contratos')
      .update({
        codigo_contrato,
        responsavel_sesmt,
        responsavel_gestor
      })
      .eq('id', Number(id))
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
    return NextResponse.json({ success: true, data })
  } catch  {
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
      .from('boaspraticas_responsaveis_contratos')
      .delete()
      .eq('id', Number(id))

    if (error) return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch  {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
