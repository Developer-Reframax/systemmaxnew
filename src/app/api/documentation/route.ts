import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface DocumentationPayload {
  id?: string
  title: string
  slug: string
  content: string
  is_main?: boolean
}

const sanitizeSlug = (slug: string) => {
  if (!slug) return ''
  const cleaned = slug.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-/_]/g, '')
  return cleaned.startsWith('/') ? cleaned : `/${cleaned}`
}

const ensureAdminOrEditor = (role?: string | null) => {
  if (!role) return false
  return ['Admin', 'Editor'].includes(role)
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status ?? 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const slugParam = searchParams.get('slug')
    const onlyMain = searchParams.get('main') === 'true'

    if (slugParam) {
      const normalizedSlug = sanitizeSlug(slugParam)
      const { data, error } = await supabase
        .from('documentation_pages')
        .select('*')
        .eq('slug', normalizedSlug)
        .maybeSingle()

      if (error) {
        console.error('Erro ao buscar página de documentação:', error)
        return NextResponse.json(
          { success: false, message: 'Erro ao buscar página' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, page: data })
    }

    let query = supabase
      .from('documentation_pages')
      .select('*')
      .order('is_main', { ascending: false })
      .order('updated_at', { ascending: false })

    if (onlyMain) {
      query = query.eq('is_main', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao listar páginas de documentação:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao listar páginas' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, pages: data ?? [] })
  } catch (error) {
    console.error('Erro na rota de documentação (GET):', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status ?? 401 }
      )
    }

    if (!ensureAdminOrEditor(authResult.user?.role)) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado' },
        { status: 403 }
      )
    }

    const payload = (await request.json()) as DocumentationPayload
    const title = payload.title?.trim()
    const slug = sanitizeSlug(payload.slug)
    const content = payload.content ?? ''
    const is_main = Boolean(payload.is_main)

    if (!title || !slug || !content) {
      return NextResponse.json(
        { success: false, message: 'Título, slug e conteúdo são obrigatórios' },
        { status: 400 }
      )
    }

    if (is_main) {
      await supabase
        .from('documentation_pages')
        .update({ is_main: false })
        .neq('slug', slug)
    }

    const { data, error } = await supabase
      .from('documentation_pages')
      .insert({
        title,
        slug,
        content,
        is_main,
        created_by: authResult.user?.matricula ?? null
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar página de documentação:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao criar página' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, page: data }, { status: 201 })
  } catch (error) {
    console.error('Erro na rota de documentação (POST):', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status ?? 401 }
      )
    }

    if (!ensureAdminOrEditor(authResult.user?.role)) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado' },
        { status: 403 }
      )
    }

    const payload = (await request.json()) as DocumentationPayload
    const { id } = payload
    const title = payload.title?.trim()
    const slug = sanitizeSlug(payload.slug)
    const content = payload.content ?? ''
    const is_main = Boolean(payload.is_main)

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID da página é obrigatório' },
        { status: 400 }
      )
    }

    if (!title || !slug || !content) {
      return NextResponse.json(
        { success: false, message: 'Título, slug e conteúdo são obrigatórios' },
        { status: 400 }
      )
    }

    if (is_main) {
      await supabase
        .from('documentation_pages')
        .update({ is_main: false })
        .neq('id', id)
    }

    const { data, error } = await supabase
      .from('documentation_pages')
      .update({
        title,
        slug,
        content,
        is_main,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar página de documentação:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao atualizar página' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, page: data })
  } catch (error) {
    console.error('Erro na rota de documentação (PUT):', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status ?? 401 }
      )
    }

    if (!ensureAdminOrEditor(authResult.user?.role)) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado' },
        { status: 403 }
      )
    }

    const { id } = (await request.json()) as { id?: string }
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID da página é obrigatório' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('documentation_pages')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao remover página de documentação:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao remover página' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro na rota de documentação (DELETE):', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
