import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/boas-praticas/areas-aplicadas/[id] - Buscar área aplicada por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const { id } = await params
    const { data, error } = await supabase
      .from('boaspraticas_area_aplicada')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Área aplicada não encontrada' }, { status: 404 })
      }
      console.error('Erro ao buscar área aplicada:', error)
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Erro na API de área aplicada:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// PUT /api/boas-praticas/areas-aplicadas/[id] - Atualizar área aplicada
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    if (!authResult.user?.role || !['Admin', 'Editor'].includes(authResult.user.role)) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores e editores podem editar áreas aplicadas.' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { nome } = body

    if (!nome) {
      return NextResponse.json({ error: 'Campo obrigatório: nome' }, { status: 400 })
    }

    const { data: existente } = await supabase
      .from('boaspraticas_area_aplicada')
      .select('id')
      .eq('id', id)
      .single()

    if (!existente) {
      return NextResponse.json({ error: 'Área aplicada não encontrada' }, { status: 404 })
    }

    const { data: conflito } = await supabase
      .from('boaspraticas_area_aplicada')
      .select('id')
      .eq('nome', nome)
      .neq('id', id)
      .single()

    if (conflito) {
      return NextResponse.json({ error: 'Já existe uma área aplicada com este nome' }, { status: 409 })
    }

    const { data, error: updateError } = await supabase
      .from('boaspraticas_area_aplicada')
      .update({ nome })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Erro ao atualizar área aplicada:', updateError)
      return NextResponse.json({ error: 'Erro ao atualizar área aplicada' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Erro na atualização de área aplicada:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE /api/boas-praticas/areas-aplicadas/[id] - Excluir área aplicada
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    if (!authResult.user?.role || authResult.user.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem excluir áreas aplicadas.' },
        { status: 403 }
      )
    }

    const { id } = await params

    const { data: existente } = await supabase
      .from('boaspraticas_area_aplicada')
      .select('id')
      .eq('id', id)
      .single()

    if (!existente) {
      return NextResponse.json({ error: 'Área aplicada não encontrada' }, { status: 404 })
    }

    const { data: vinculadas } = await supabase
      .from('boaspraticas_praticas')
      .select('id')
      .eq('area_aplicada', id)
      .limit(1)

    if (vinculadas && vinculadas.length > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir esta área aplicada pois existem boas práticas vinculadas a ela' },
        { status: 409 }
      )
    }

    const { error: deleteError } = await supabase
      .from('boaspraticas_area_aplicada')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Erro ao excluir área aplicada:', deleteError)
      return NextResponse.json({ error: 'Erro ao excluir área aplicada' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Área aplicada excluída com sucesso' })
  } catch (error) {
    console.error('Erro na exclusão de área aplicada:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
