import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Listar todas as naturezas
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
      .from('natureza')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Filtrar por contrato se especificado
    if (contrato) {
      query = query.eq('contrato', contrato)
    }

    // Aplicar paginação
    query = query.range(offset, offset + limit - 1)

    const { data: naturezas, error, count } = await query

    if (error) {
      console.error('Erro ao buscar naturezas:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar naturezas' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: naturezas,
      total: count || 0,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Natures GET API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar nova natureza
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
    const { natureza, contrato } = body

    // Validar campos obrigatórios
    if (!natureza || !contrato) {
      return NextResponse.json(
        { success: false, message: 'Natureza e contrato são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se já existe uma natureza com o mesmo nome no mesmo contrato
    const { data: existing } = await supabase
      .from('natureza')
      .select('id')
      .eq('natureza', natureza)
      .eq('contrato', contrato)
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Já existe uma natureza com este nome neste contrato' },
        { status: 409 }
      )
    }

    // Criar nova natureza
    const { data: newNatureza, error } = await supabase
      .from('natureza')
      .insert({
        natureza,
        contrato,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar natureza:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao criar natureza' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Natureza criada com sucesso',
      data: newNatureza
    }, { status: 201 })

  } catch (error) {
    console.error('Natures POST API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar natureza (atualização em lote)
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
    const { updates } = body // Array de objetos com { id, natureza?, contrato? }

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Lista de atualizações é obrigatória' },
        { status: 400 }
      )
    }

    const results = []
    
    for (const update of updates) {
      const { id, natureza, contrato } = update
      
      if (!id) {
        results.push({ id, success: false, message: 'ID é obrigatório' })
        continue
      }

      const updateData: { updated_at: string; natureza?: string; contrato?: string } = { updated_at: new Date().toISOString() }
      if (natureza) updateData.natureza = natureza
      if (contrato) updateData.contrato = contrato

      const { data: updatedNatureza, error } = await supabase
        .from('natureza')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error || !updatedNatureza) {
        results.push({ id, success: false, message: 'Erro ao atualizar natureza' })
      } else {
        results.push({ id, success: true, data: updatedNatureza })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Operação de atualização concluída',
      results
    })

  } catch (error) {
    console.error('Natures PUT API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Deletar naturezas (deleção em lote)
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
      .from('natureza')
      .delete()
      .in('id', ids)

    if (error) {
      console.error('Erro ao deletar naturezas:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao deletar naturezas' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `${ids.length} natureza(s) deletada(s) com sucesso`
    })

  } catch (error) {
    console.error('Natures DELETE API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
