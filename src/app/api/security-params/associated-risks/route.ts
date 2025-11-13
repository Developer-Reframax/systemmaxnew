import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Listar todos os riscos associados
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
    const categoria = searchParams.get('categoria')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    let query = supabase
      .from('riscos_associados')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Filtrar por categoria se especificado
    if (categoria) {
      query = query.eq('categoria', categoria)
    }

    // Aplicar paginação
    query = query.range(offset, offset + limit - 1)

    const { data: riscosAssociados, error, count } = await query

    if (error) {
      console.error('Erro ao buscar riscos associados:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar riscos associados' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: riscosAssociados,
      total: count || 0,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Associated Risks GET API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar novo risco associado
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
    const { risco_associado, descricao, categoria } = body

    // Validar campos obrigatórios
    if (!risco_associado) {
      return NextResponse.json(
        { success: false, message: 'Risco associado é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se já existe um risco associado com o mesmo nome
    const { data: existing } = await supabase
      .from('riscos_associados')
      .select('id')
      .eq('risco_associado', risco_associado)
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Já existe um risco associado com este nome' },
        { status: 409 }
      )
    }

    // Criar novo risco associado
    const { data: newRiscoAssociado, error } = await supabase
      .from('riscos_associados')
      .insert({
        risco_associado,
        descricao: descricao || null,
        categoria: categoria || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar risco associado:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao criar risco associado' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Risco associado criado com sucesso',
      data: newRiscoAssociado
    }, { status: 201 })

  } catch (error) {
    console.error('Associated Risks POST API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar risco associado (atualização em lote)
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
    const { updates } = body // Array de objetos com { id, risco_associado?, descricao?, categoria? }

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Lista de atualizações é obrigatória' },
        { status: 400 }
      )
    }

    const results = []
    
    for (const update of updates) {
      const { id, risco_associado, descricao, categoria } = update
      
      if (!id) {
        results.push({ id, success: false, message: 'ID é obrigatório' })
        continue
      }

      const updateData: { updated_at: string; risco_associado?: string; descricao?: string | null; categoria?: string | null } = { updated_at: new Date().toISOString() }
      if (risco_associado) updateData.risco_associado = risco_associado
      if (descricao !== undefined) updateData.descricao = descricao
      if (categoria !== undefined) updateData.categoria = categoria

      const { data: updatedRiscoAssociado, error } = await supabase
        .from('riscos_associados')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error || !updatedRiscoAssociado) {
        results.push({ id, success: false, message: 'Erro ao atualizar risco associado' })
      } else {
        results.push({ id, success: true, data: updatedRiscoAssociado })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Operação de atualização concluída',
      results
    })

  } catch (error) {
    console.error('Associated Risks PUT API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Deletar riscos associados (deleção em lote)
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
      .from('riscos_associados')
      .delete()
      .in('id', ids)

    if (error) {
      console.error('Erro ao deletar riscos associados:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao deletar riscos associados' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `${ids.length} risco(s) associado(s) deletado(s) com sucesso`
    })

  } catch (error) {
    console.error('Associated Risks DELETE API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
