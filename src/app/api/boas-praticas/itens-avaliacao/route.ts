import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyJWTToken(request)
    if (!auth.success) return NextResponse.json({ error: auth.error }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const search = searchParams.get('search')
    const offset = (page - 1) * limit

    let query = supabase
      .from('boaspraticas_itens_avaliacao')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (search) {
      query = query.ilike('item', `%${search}%`)
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1)
    if (error) return NextResponse.json({ error: 'Erro ao listar itens' }, { status: 500 })

    return NextResponse.json({
      success: true,
      data,
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) }
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyJWTToken(request)
    if (!auth.success) return NextResponse.json({ error: auth.error }, { status: 401 })
    if (!auth.user?.role || !['Admin', 'Editor'].includes(String(auth.user.role))) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    if (!body.item) return NextResponse.json({ error: 'Campo item obrigatorio' }, { status: 400 })
    const eliminatorio = Boolean(body.eliminatoria)

    const { data, error } = await supabase
      .from('boaspraticas_itens_avaliacao')
      .insert({ item: body.item, eliminatoria: eliminatorio })
      .select('*')
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message || 'Erro ao criar item' }, { status: 500 })
    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
