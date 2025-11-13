import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Buscar todos os contratos
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const { data: contracts, error } = await supabase
      .from('contratos')
      .select('*')
      .order('nome')

    if (error) {
      console.error('Erro ao buscar contratos:', error)
      return NextResponse.json({ error: 'Erro ao buscar contratos' }, { status: 500 })
    }

    return NextResponse.json({ success: true, contracts })
  } catch (error) {
    console.error('Erro na API de contratos:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST - Criar novo contrato
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    // Verificar se é admin ou editor
    if (!authResult.user || (authResult.user.role !== 'Admin' && authResult.user.role !== 'Editor')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const contractData = await request.json()

    const { data, error } = await supabase
      .from('contratos')
      .insert(contractData)
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar contrato:', error)
      return NextResponse.json({ error: 'Erro ao criar contrato' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erro na API de contratos:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// PUT - Atualizar contrato
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    // Verificar se é admin ou editor
    if (!authResult.user || (authResult.user.role !== 'Admin' && authResult.user.role !== 'Editor')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { id, ...contractData } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'ID do contrato é obrigatório' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('contratos')
      .update(contractData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar contrato:', error)
      return NextResponse.json({ error: 'Erro ao atualizar contrato' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro na API de contratos:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE - Excluir contrato
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    // Verificar se é admin ou editor
    if (!authResult.user || (authResult.user.role !== 'Admin' && authResult.user.role !== 'Editor')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'ID do contrato é obrigatório' }, { status: 400 })
    }

    const { error } = await supabase
      .from('contratos')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao excluir contrato:', error)
      return NextResponse.json({ error: 'Erro ao excluir contrato' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Contrato excluído com sucesso' })
  } catch (error) {
    console.error('Erro na API de contratos:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
