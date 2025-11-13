import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Buscar risco associado por ID
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

    const { data: riscoAssociado, error } = await supabase
      .from('riscos_associados')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !riscoAssociado) {
      return NextResponse.json(
        { success: false, message: 'Risco associado não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: riscoAssociado
    })

  } catch (error) {
    console.error('Associated Risk GET by ID API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar risco associado por ID
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
    const { risco_associado, descricao, categoria } = body

    // Preparar dados para atualização
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    
    if (risco_associado) updateData.risco_associado = risco_associado
    if (descricao !== undefined) updateData.descricao = descricao
    if (categoria !== undefined) updateData.categoria = categoria

    // Verificar se existe conflito com outro registro
    if (risco_associado) {
      const { data: existing } = await supabase
        .from('riscos_associados')
        .select('id')
        .eq('risco_associado', risco_associado)
        .neq('id', id)
        .single()

      if (existing) {
        return NextResponse.json(
          { success: false, message: 'Já existe um risco associado com este nome' },
          { status: 409 }
        )
      }
    }

    // Atualizar risco associado
    const { data: updatedRiscoAssociado, error } = await supabase
      .from('riscos_associados')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar risco associado:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao atualizar risco associado' },
        { status: 500 }
      )
    }

    if (!updatedRiscoAssociado) {
      return NextResponse.json(
        { success: false, message: 'Risco associado não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Risco associado atualizado com sucesso',
      data: updatedRiscoAssociado
    })

  } catch (error) {
    console.error('Associated Risk PUT by ID API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Deletar risco associado por ID
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

    // Verificar se o risco associado existe
    const { data: existing, error: checkError } = await supabase
      .from('riscos_associados')
      .select('id')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json(
        { success: false, message: 'Risco associado não encontrado' },
        { status: 404 }
      )
    }

    // Deletar risco associado
    const { error } = await supabase
      .from('riscos_associados')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao deletar risco associado:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao deletar risco associado' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Risco associado deletado com sucesso'
    })

  } catch (error) {
    console.error('Associated Risk DELETE by ID API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}