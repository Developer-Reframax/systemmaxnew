import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Buscar local por ID
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

    const { data: local, error } = await supabase
      .from('locais')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !local) {
      return NextResponse.json(
        { success: false, message: 'Local não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: local
    })

  } catch (error) {
    console.error('Location GET by ID API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar local por ID
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
    const { local, contrato } = body

    // Validar campos obrigatórios
    if (!local || !contrato) {
      return NextResponse.json(
        { success: false, message: 'Local e contrato são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar tamanho do campo local
    if (local.length > 100) {
      return NextResponse.json(
        { success: false, message: 'Nome do local deve ter no máximo 100 caracteres' },
        { status: 400 }
      )
    }

    // Verificar se existe conflito com outro registro
    const { data: existing } = await supabase
      .from('locais')
      .select('id')
      .eq('local', local)
      .eq('contrato', contrato)
      .neq('id', id)
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Já existe um local com este nome neste contrato' },
        { status: 409 }
      )
    }

    // Atualizar local
    const { data: updatedLocal, error } = await supabase
      .from('locais')
      .update({
        local,
        contrato,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar local:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao atualizar local' },
        { status: 500 }
      )
    }

    if (!updatedLocal) {
      return NextResponse.json(
        { success: false, message: 'Local não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Local atualizado com sucesso',
      data: updatedLocal
    })

  } catch (error) {
    console.error('Location PUT by ID API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Deletar local por ID
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

    // Verificar se o local existe
    const { data: existing, error: checkError } = await supabase
      .from('locais')
      .select('id')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json(
        { success: false, message: 'Local não encontrado' },
        { status: 404 }
      )
    }

    // Deletar local
    const { error } = await supabase
      .from('locais')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao deletar local:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao deletar local' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Local deletado com sucesso'
    })

  } catch (error) {
    console.error('Location DELETE by ID API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}