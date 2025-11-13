import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Listar todos os tipos
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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    let query = supabase
      .from('tipos')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Filtrar por contrato se especificado
    if (contrato) {
      query = query.eq('contrato', contrato)
    }

    // Aplicar paginação
    query = query.range(offset, offset + limit - 1)

    const { data: tipos, error, count } = await query

    if (error) {
      console.error('Erro ao buscar tipos:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar tipos' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: tipos,
      total: count || 0,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Types GET API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar novo tipo
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
    const { tipo, contrato } = body

    // Validar campos obrigatórios
    if (!tipo || !contrato) {
      return NextResponse.json(
        { success: false, message: 'Tipo e contrato são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se já existe um tipo com o mesmo nome no mesmo contrato
    const { data: existing } = await supabase
      .from('tipos')
      .select('id')
      .eq('tipo', tipo)
      .eq('contrato', contrato)
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Já existe um tipo com este nome neste contrato' },
        { status: 409 }
      )
    }

    // Criar novo tipo
    const { data: newTipo, error } = await supabase
      .from('tipos')
      .insert({
        tipo,
        contrato,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar tipo:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao criar tipo' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Tipo criado com sucesso',
      data: newTipo
    }, { status: 201 })

  } catch (error) {
    console.error('Types POST API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar tipo (atualização em lote)
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
    const { updates } = body // Array de objetos com { id, tipo?, contrato? }

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Lista de atualizações é obrigatória' },
        { status: 400 }
      )
    }

    const results = []
    
    for (const update of updates) {
      const { id, tipo, contrato } = update
      
      if (!id) {
        results.push({ id, success: false, message: 'ID é obrigatório' })
        continue
      }

      const updateData: { updated_at: string; tipo?: string; contrato?: string } = { updated_at: new Date().toISOString() }
      if (tipo) updateData.tipo = tipo
      if (contrato) updateData.contrato = contrato

      const { data: updatedTipo, error } = await supabase
        .from('tipos')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error || !updatedTipo) {
        results.push({ id, success: false, message: 'Erro ao atualizar tipo' })
      } else {
        results.push({ id, success: true, data: updatedTipo })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Operação de atualização concluída',
      results
    })

  } catch (error) {
    console.error('Types PUT API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Deletar tipos (deleção em lote)
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

    const body = await request.json()
    const { ids } = body // Array de IDs para deletar

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Lista de IDs é obrigatória' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('tipos')
      .delete()
      .in('id', ids)

    if (error) {
      console.error('Erro ao deletar tipos:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao deletar tipos' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `${ids.length} tipo(s) deletado(s) com sucesso`
    })

  } catch (error) {
    console.error('Types DELETE API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
