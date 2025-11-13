import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Listar todas as subcategorias
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoriaPai = searchParams.get('categoria_pai')

    let query = supabase
      .from('subcategorias_oac')
      .select(`
        *,
        categorias_oac!subcategorias_oac_categoria_pai_fkey (
          id,
          categoria,
          topico_categoria
        )
      `)
      .order('subcategoria', { ascending: true })

    // Filtrar por categoria pai se especificado
    if (categoriaPai) {
      query = query.eq('categoria_pai', categoriaPai)
    }

    const { data: subcategorias, error } = await query

    if (error) {
      console.error('Erro ao buscar subcategorias:', error)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

    return NextResponse.json(subcategorias)
  } catch (error) {
    console.error('Erro ao buscar subcategorias:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar nova subcategoria
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { categoria_pai, subcategoria, topico_subcategoria } = body

    // Validação dos dados
    if (!categoria_pai || !subcategoria || !topico_subcategoria) {
      return NextResponse.json(
        { error: 'Categoria pai, subcategoria e tópico são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se a categoria pai existe
    const { data: categoriaPaiExistente } = await supabase
      .from('categorias_oac')
      .select('id')
      .eq('id', categoria_pai)
      .single()

    if (!categoriaPaiExistente) {
      return NextResponse.json(
        { error: 'Categoria pai não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se a subcategoria já existe para esta categoria pai
    const { data: subcategoriaExistente } = await supabase
      .from('subcategorias_oac')
      .select('id')
      .eq('categoria_pai', categoria_pai)
      .eq('subcategoria', subcategoria)
      .single()

    if (subcategoriaExistente) {
      return NextResponse.json(
        { error: 'Subcategoria já existe para esta categoria' },
        { status: 409 }
      )
    }

    // Criar nova subcategoria
    const { data: novaSubcategoria, error } = await supabase
      .from('subcategorias_oac')
      .insert([{
        categoria_pai,
        subcategoria,
        topico_subcategoria
      }])
      .select(`
        *,
        categorias_oac!subcategorias_oac_categoria_pai_fkey (
          id,
          categoria,
          topico_categoria
        )
      `)
      .single()

    if (error) {
      console.error('Erro ao criar subcategoria:', error)
      return NextResponse.json(
        { error: 'Erro ao criar subcategoria' },
        { status: 500 }
      )
    }

    return NextResponse.json(novaSubcategoria, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar subcategoria:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
