import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/boas-praticas/tags-catalogo - Listar tags do catalogo
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = supabase
      .from('boaspraticas_tags_catalogo')
      .select('*', { count: 'exact' })
      .order('nome')

    if (search) {
      query = query.or(`nome.ilike.%${search}%,descricao.ilike.%${search}%`)
    }

    query = query.range(offset, offset + limit - 1)

    const { data: tags, error, count } = await query

    if (error) {
      console.error('Erro ao buscar tags do catalogo:', error)
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: tags,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Erro na API de tags do catalogo:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST /api/boas-praticas/tags-catalogo - Criar nova tag do catalogo
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    if (!authResult.user?.role || !['Admin', 'Editor'].includes(authResult.user.role)) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores e editores podem criar tags do catalogo.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { nome, descricao, cor } = body

    const formatName = (value: unknown) => {
      const text = typeof value === 'string' ? value.trim() : ''
      if (!text) return ''
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
    }

    const normalizedName = formatName(nome)

    if (!normalizedName) {
      return NextResponse.json({ error: 'Campo obrigatorio: nome' }, { status: 400 })
    }

    const { data: tagExistente } = await supabase
      .from('boaspraticas_tags_catalogo')
      .select('id')
      .eq('nome', normalizedName)
      .single()

    if (tagExistente) {
      return NextResponse.json({ error: 'Ja existe uma tag do catalogo com este nome' }, { status: 409 })
    }

    const { data: novaTag, error: insertError } = await supabase
      .from('boaspraticas_tags_catalogo')
      .insert({
        nome: normalizedName,
        descricao,
        cor: cor || '#6B7280'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Erro ao inserir tag do catalogo:', insertError)
      return NextResponse.json({ error: 'Erro ao criar tag do catalogo' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: novaTag }, { status: 201 })
  } catch (error) {
    console.error('Erro na API de criacao de tag do catalogo:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
