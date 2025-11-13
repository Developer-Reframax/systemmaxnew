import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// PUT - Atualizar subcategoria
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { categoria_pai, subcategoria, topico_subcategoria } = body

    // Validação dos dados
    if (!categoria_pai || !subcategoria || !topico_subcategoria) {
      return NextResponse.json(
        { error: 'Categoria pai, subcategoria e tópico são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se a subcategoria existe
    const { data: subcategoriaExistente } = await supabase
      .from('subcategorias_oac')
      .select('id')
      .eq('id', id)
      .single()

    if (!subcategoriaExistente) {
      return NextResponse.json(
        { error: 'Subcategoria não encontrada' },
        { status: 404 }
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

    // Verificar se já existe outra subcategoria com o mesmo nome na mesma categoria pai
    const { data: subcategoriaComMesmoNome } = await supabase
      .from('subcategorias_oac')
      .select('id')
      .eq('categoria_pai', categoria_pai)
      .eq('subcategoria', subcategoria)
      .neq('id', id)
      .single()

    if (subcategoriaComMesmoNome) {
      return NextResponse.json(
        { error: 'Já existe uma subcategoria com este nome nesta categoria' },
        { status: 409 }
      )
    }

    // Atualizar subcategoria
    const { data: subcategoriaAtualizada, error } = await supabase
      .from('subcategorias_oac')
      .update({
        categoria_pai,
        subcategoria,
        topico_subcategoria
      })
      .eq('id', id)
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
      console.error('Erro ao atualizar subcategoria:', error)
      return NextResponse.json(
        { error: 'Erro ao atualizar subcategoria' },
        { status: 500 }
      )
    }

    return NextResponse.json(subcategoriaAtualizada)
  } catch (error) {
    console.error('Erro ao atualizar subcategoria:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir subcategoria
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verificar se a subcategoria existe
    const { data: subcategoriaExistente } = await supabase
      .from('subcategorias_oac')
      .select('id')
      .eq('id', id)
      .single()

    if (!subcategoriaExistente) {
      return NextResponse.json(
        { error: 'Subcategoria não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se existem OACs vinculadas a esta subcategoria
    const { data: oacs } = await supabase
      .from('oacs')
      .select('id')
      .eq('subcategoria_id', id)
      .limit(1)

    if (oacs && oacs.length > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir subcategoria que possui OACs vinculadas' },
        { status: 409 }
      )
    }

    // Excluir subcategoria
    const { error } = await supabase
      .from('subcategorias_oac')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao excluir subcategoria:', error)
      return NextResponse.json(
        { error: 'Erro ao excluir subcategoria' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Subcategoria excluída com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir subcategoria:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}