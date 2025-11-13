import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Listar potenciais
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const contrato = searchParams.get('contrato')

    let query = supabase
      .from('potenciais')
      .select('*')
      .order('created_at', { ascending: false })

    let countQuery = supabase
      .from('potenciais')
      .select('*', { count: 'exact', head: true })

    if (contrato) {
      query = query.eq('contrato', contrato)
      countQuery = countQuery.eq('contrato', contrato)
    }

    const [{ data: potenciais, error }, { count, error: countError }] = await Promise.all([
      query,
      countQuery
    ])

    if (error || countError) {
      console.error('Erro ao buscar potenciais:', error || countError)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar potenciais' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: potenciais,
      total: count || 0
    })

  } catch (error) {
    console.error('Potentials GET API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar potencial
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { potencial_sede, potencial_local, contrato } = body

    // Validar campos obrigatórios
    if (!potencial_sede || !potencial_local || !contrato) {
      return NextResponse.json(
        { success: false, message: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar potencial_sede
    const validPotenciais = ['Intolerável', 'Substancial', 'Moderado', 'Trivial']
    if (!validPotenciais.includes(potencial_sede)) {
      return NextResponse.json(
        { success: false, message: 'Potencial sede inválido' },
        { status: 400 }
      )
    }

    // Verificar se já existe um mapeamento para este potencial_sede e contrato
    const { data: existing } = await supabase
      .from('potenciais')
      .select('id')
      .eq('potencial_sede', potencial_sede)
      .eq('contrato', contrato)
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Já existe um mapeamento para este potencial sede neste contrato' },
        { status: 409 }
      )
    }

    // Criar potencial
    const { data: newPotencial, error } = await supabase
      .from('potenciais')
      .insert({
        potencial_sede,
        potencial_local,
        contrato
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar potencial:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao criar potencial' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Potencial criado com sucesso',
      data: newPotencial
    }, { status: 201 })

  } catch (error) {
    console.error('Potentials POST API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar potencial
export async function PUT(request: NextRequest) {
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

    const body = await request.json()
    const { id, potencial_sede, potencial_local, contrato } = body

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID é obrigatório' },
        { status: 400 }
      )
    }

    // Preparar dados para atualização
    const updateData: {
      updated_at: string;
      potencial_sede?: string;
      potencial_local?: string;
      contrato?: string;
    } = { updated_at: new Date().toISOString() }
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
    console.error('Potentials PUT API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Deletar potencial
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID é obrigatório' },
        { status: 400 }
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
    console.error('Potentials DELETE API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
