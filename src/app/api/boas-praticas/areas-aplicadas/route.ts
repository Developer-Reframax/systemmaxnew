import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/boas-praticas/areas-aplicadas - Listar áreas aplicadas
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = (page - 1) * limit

    let query = supabase
      .from('boaspraticas_area_aplicada')
      .select('*', { count: 'exact' })
      .order('nome')

    if (search) {
      query = query.ilike('nome', `%${search}%`)
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) {
      console.error('Erro ao buscar areas aplicadas:', error)
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Erro na API de areas aplicadas:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST /api/boas-praticas/areas-aplicadas - Criar área aplicada
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    if (!authResult.user?.role || !['Admin', 'Editor'].includes(authResult.user.role)) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores e editores podem criar áreas aplicadas.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { nome } = body

    if (!nome) {
      return NextResponse.json({ error: 'Campo obrigatório: nome' }, { status: 400 })
    }

    const { data: existente } = await supabase
      .from('boaspraticas_area_aplicada')
      .select('id')
      .eq('nome', nome)
      .single()

    if (existente) {
      return NextResponse.json({ error: 'Já existe uma área aplicada com este nome' }, { status: 409 })
    }

    const { data, error: insertError } = await supabase
      .from('boaspraticas_area_aplicada')
      .insert({ nome })
      .select()
      .single()

    if (insertError) {
      console.error('Erro ao criar área aplicada:', insertError)
      return NextResponse.json({ error: 'Erro ao criar área aplicada' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error('Erro na criação de área aplicada:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
