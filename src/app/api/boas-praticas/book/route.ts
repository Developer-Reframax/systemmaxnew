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
    const search = searchParams.get('search') || ''
    const tag = searchParams.get('tag')
    const pilar = searchParams.get('pilar')
    const categoria = searchParams.get('categoria')
    const elimina = searchParams.get('elimina')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '12', 10)
    const offset = (page - 1) * limit

    let query = supabase
      .from('boaspraticas_praticas')
      .select(
        'id, titulo, descricao, descricao_problema, objetivo, status, relevancia, categoria, pilar, elimina_desperdicio, tags, created_at, autor_nome:matricula_cadastrante, validacao, visualizacoes, likes'
      )
      .eq('validacao', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.or(`titulo.ilike.%${search}%,descricao.ilike.%${search}%,descricao_problema.ilike.%${search}%`)
    }
    if (tag) {
      query = query.contains('tags', [Number(tag)])
    }
    if (pilar) {
      query = query.eq('pilar', Number(pilar))
    }
    if (categoria) {
      query = query.eq('categoria', Number(categoria))
    }
    if (elimina) {
      query = query.eq('elimina_desperdicio', Number(elimina))
    }

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: 'Erro ao listar book de boas praticas' }, { status: 500 })
    }

    const praticas = data || []

    const ids = praticas.map((p) => p.id).filter(Boolean)
    const likesMap = new Map<string, number>()

    if (ids.length > 0) {
      const { data: likesData, error: likesError } = await supabase
        .from('boaspraticas_likes')
        .select('pratica_id')
        .in('pratica_id', ids)

      if (likesError) {
        console.error('Erro ao buscar likes do book:', likesError)
      } else if (likesData) {
        likesData.forEach((row) => {
          const id = String(row.pratica_id)
          likesMap.set(id, (likesMap.get(id) || 0) + 1)
        })
      }
    }

    const dataWithLikes = praticas.map((p) => {
      const id = String(p.id)
      const likeCount = likesMap.has(id) ? likesMap.get(id)! : 0
      return { ...p, likes: likeCount }
    })

    return NextResponse.json({
      success: true,
      data: dataWithLikes,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 1
      }
    })
  } catch (err) {
    console.error('Erro no book GET:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
