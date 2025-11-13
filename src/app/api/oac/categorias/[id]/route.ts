import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// PUT - Atualizar categoria
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { categoria, topico_categoria } = body

    // Validação dos dados
    if (!categoria || !topico_categoria) {
      return NextResponse.json(
        { error: 'Categoria e tópico são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se a categoria existe
    const { data: categoriaExistente } = await supabase
      .from('categorias_oac')
      .select('id')
      .eq('id', id)
      .single()

    if (!categoriaExistente) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se já existe outra categoria com o mesmo nome
    const { data: categoriaComMesmoNome } = await supabase
      .from('categorias_oac')
      .select('id')
      .eq('categoria', categoria)
      .neq('id', id)
      .single()

    if (categoriaComMesmoNome) {
      return NextResponse.json(
        { error: 'Já existe uma categoria com este nome' },
        { status: 409 }
      )
    }

    // Atualizar categoria
    const { data: categoriaAtualizada, error } = await supabase
      .from('categorias_oac')
      .update({
        categoria,
        topico_categoria
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar categoria:', error)
      return NextResponse.json(
        { error: 'Erro ao atualizar categoria' },
        { status: 500 }
      )
    }

    return NextResponse.json(categoriaAtualizada)
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir categoria
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verificar se a categoria existe
    const { data: categoriaExistente } = await supabase
      .from('categorias_oac')
      .select('id')
      .eq('id', id)
      .single()

    if (!categoriaExistente) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se existem subcategorias vinculadas
    const { data: subcategorias } = await supabase
      .from('subcategorias_oac')
      .select('id')
      .eq('categoria_pai', id)
      .limit(1)

    if (subcategorias && subcategorias.length > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir categoria que possui subcategorias' },
        { status: 409 }
      )
    }

    // Verificar se existem OACs vinculadas a esta categoria
    const { data: oacs } = await supabase
      .from('oacs')
      .select('id')
      .eq('categoria_id', id)
      .limit(1)

    if (oacs && oacs.length > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir categoria que possui OACs vinculadas' },
        { status: 409 }
      )
    }

    // Excluir categoria
    const { error } = await supabase
      .from('categorias_oac')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao excluir categoria:', error)
      return NextResponse.json(
        { error: 'Erro ao excluir categoria' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Categoria excluída com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir categoria:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}