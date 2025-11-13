import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Buscar potencial por ID
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

    const { data: potencial, error } = await supabase
      .from('potenciais')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !potencial) {
      return NextResponse.json(
        { success: false, message: 'Potencial não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: potencial
    })

  } catch (error) {
    console.error('Potential GET by ID API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar potencial por ID
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
    const { potencial_sede, potencial_local, contrato } = body

    // Preparar dados para atualização
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    
    if (potencial_sede) {
      const validPotenciais = ['Intolerável', 'Substancial', 'Moderado', 'Trivial']
      if (!validPotenciais.includes(potencial_sede)) {
        return NextResponse.json(
          { success: false, message: 'Potencial sede inválido' },
          { status: 400 }
        )
      }
      updateData.potencial_sede = potencial_sede
    }
    if (potencial_local) updateData.potencial_local = potencial_local
    if (contrato) updateData.contrato = contrato

    // Verificar se existe conflito com outro registro
    if (potencial_sede && contrato) {
      const { data: existing } = await supabase
        .from('potenciais')
        .select('id')
        .eq('potencial_sede', potencial_sede)
        .eq('contrato', contrato)
        .neq('id', id)
        .single()

      if (existing) {
        return NextResponse.json(
          { success: false, message: 'Já existe um mapeamento para este potencial sede neste contrato' },
          { status: 409 }
        )
      }
    }

    // Atualizar potencial
    const { data: updatedPotencial, error } = await supabase
      .from('potenciais')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar potencial:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao atualizar potencial' },
        { status: 500 }
      )
    }

    if (!updatedPotencial) {
      return NextResponse.json(
        { success: false, message: 'Potencial não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Potencial atualizado com sucesso',
      data: updatedPotencial
    })

  } catch (error) {
    console.error('Potential PUT by ID API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Deletar potencial por ID
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

    // Verificar se o potencial existe
    const { data: existing, error: checkError } = await supabase
      .from('potenciais')
      .select('id')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json(
        { success: false, message: 'Potencial não encontrado' },
        { status: 404 }
      )
    }

    // Deletar potencial
    const { error } = await supabase
      .from('potenciais')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao deletar potencial:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao deletar potencial' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Potencial deletado com sucesso'
    })

  } catch (error) {
    console.error('Potential DELETE by ID API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}