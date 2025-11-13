import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Buscar todos os módulos
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const { data: modules, error } = await supabase
      .from('modulos')
      .select('id, nome, descricao, tipo, ativo, created_at')
      .order('nome')

    if (error) {
      console.error('Erro ao buscar módulos:', error)
      return NextResponse.json({ error: 'Erro ao buscar módulos' }, { status: 500 })
    }

    return NextResponse.json(modules)
  } catch (error) {
    console.error('Erro na API de módulos:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST - Criar novo módulo
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    // Verificar se é admin
    if (decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const moduleData = await request.json()

    const { data, error } = await supabase
      .from('modulos')
      .insert(moduleData)
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar módulo:', error)
      return NextResponse.json({ error: 'Erro ao criar módulo' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erro na API de módulos:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// PUT - Atualizar módulo
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    // Verificar se é admin
    if (decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { id, ...moduleData } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'ID do módulo é obrigatório' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('modulos')
      .update(moduleData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar módulo:', error)
      return NextResponse.json({ error: 'Erro ao atualizar módulo' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro na API de módulos:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE - Deletar módulo
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    // Verificar se é admin
    if (decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID do módulo é obrigatório' }, { status: 400 })
    }

    const { error } = await supabase
      .from('modulos')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao deletar módulo:', error)
      return NextResponse.json({ error: 'Erro ao deletar módulo' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Módulo deletado com sucesso' })
  } catch (error) {
    console.error('Erro na API de módulos:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
