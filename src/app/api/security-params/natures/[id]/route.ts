import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Buscar natureza por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    const { id } = await params

    const { data: natureza, error } = await supabase
      .from('natureza')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !natureza) {
      return NextResponse.json(
        { success: false, message: 'Natureza não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: natureza
    })

  } catch (error) {
    console.error('Nature GET by ID API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar natureza por ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    // Verificar se o usuário tem permissão (Admin ou Editor)
    if (!authResult.user || !['Admin', 'Editor'].includes(authResult.user.role)) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado - permissão insuficiente' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { natureza, contrato } = body

    // Preparar dados para atualização
    const updateData: { updated_at: string; natureza?: string; contrato?: string } = { updated_at: new Date().toISOString() }
    
    if (natureza) updateData.natureza = natureza
    if (contrato) updateData.contrato = contrato

    // Verificar se existe conflito com outro registro
    if (natureza && contrato) {
      const { data: existing } = await supabase
        .from('natureza')
        .select('id')
        .eq('natureza', natureza)
        .eq('contrato', contrato)
        .neq('id', id)
        .single()

      if (existing) {
        return NextResponse.json(
          { success: false, message: 'Já existe uma natureza com este nome neste contrato' },
          { status: 409 }
        )
      }
    }

    // Atualizar natureza
    const { data: updatedNatureza, error } = await supabase
      .from('natureza')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar natureza:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao atualizar natureza' },
        { status: 500 }
      )
    }

    if (!updatedNatureza) {
      return NextResponse.json(
        { success: false, message: 'Natureza não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Natureza atualizada com sucesso',
      data: updatedNatureza
    })

  } catch (error) {
    console.error('Nature PUT by ID API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Deletar natureza por ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    // Verificar se o usuário tem permissão (Admin ou Editor)
    if (!authResult.user || !['Admin', 'Editor'].includes(authResult.user.role)) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado - permissão insuficiente' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Verificar se a natureza existe
    const { data: existing, error: checkError } = await supabase
      .from('natureza')
      .select('id')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json(
        { success: false, message: 'Natureza não encontrada' },
        { status: 404 }
      )
    }

    // Deletar natureza
    const { error } = await supabase
      .from('natureza')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao deletar natureza:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao deletar natureza' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Natureza deletada com sucesso'
    })

  } catch (error) {
    console.error('Nature DELETE by ID API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}