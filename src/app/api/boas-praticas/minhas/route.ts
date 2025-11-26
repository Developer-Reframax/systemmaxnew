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

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '10', 10)
    const search = url.searchParams.get('search')
    const start = (page - 1) * limit
    const end = start + limit - 1

    let query = supabase
      .from('boaspraticas_praticas')
      .select('*', { count: 'exact' })
      .eq('matricula_cadastrante', auth.user?.matricula)

    if (search) {
      query = query.or(`titulo.ilike.%${search}%,descricao.ilike.%${search}%`)
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(start, end)

    if (error) return NextResponse.json({ error: 'Erro ao listar minhas boas práticas' }, { status: 500 })
    return NextResponse.json({ success: true, data, page, limit, total: count || 0 })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
