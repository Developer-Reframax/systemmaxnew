import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Listar todas as categorias
export async function GET() {
  try {
    console.log('Buscando categorias OAC...')
    
    const { data: categorias, error } = await supabase
      .from('categorias_oac')
      .select(`
        *,
        subcategorias_oac (
          id,
          subcategoria,
          topico_subcategoria
        )
      `)
      .order('categoria')

    if (error) {
      console.error('Erro ao buscar categorias:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar categorias' },
        { status: 500 }
      )
    }

    console.log('Categorias encontradas:', categorias?.length || 0)
    return NextResponse.json(categorias)
  } catch (error) {
    console.error('Erro ao buscar categorias:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar nova categoria
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { categoria, topico_categoria } = body

    // Validação dos dados
    if (!categoria || !topico_categoria) {
      return NextResponse.json(
        { error: 'Categoria e tópico são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se a categoria já existe
    const { data: categoriaExistente } = await supabase
      .from('categorias_oac')
      .select('id')
      .eq('categoria', categoria)
      .single()

    if (categoriaExistente) {
      return NextResponse.json(
        { error: 'Categoria já existe' },
        { status: 409 }
      )
    }

    // Criar nova categoria
    const { data: novaCategoria, error } = await supabase
      .from('categorias_oac')
      .insert([{
        categoria,
        topico_categoria
      }])
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar categoria:', error)
      return NextResponse.json(
        { error: 'Erro ao criar categoria' },
        { status: 500 }
      )
    }

    return NextResponse.json(novaCategoria, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar categoria:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
