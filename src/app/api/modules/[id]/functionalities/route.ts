import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Buscar funcionalidades de um módulo
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id: moduleId } = await params

    // Verificar se o módulo existe
    const { data: module, error: moduleError } = await supabase
      .from('modulos')
      .select('id, nome')
      .eq('id', moduleId)
      .single()

    if (moduleError || !module) {
      return NextResponse.json({ error: 'Módulo não encontrado' }, { status: 404 })
    }

    // Buscar funcionalidades do módulo
    const { data: functionalities, error } = await supabase
      .from('modulo_funcionalidades')
      .select('*')
      .eq('modulo_id', moduleId)
      .order('nome')

    if (error) {
      console.error('Erro ao buscar funcionalidades:', error)
      return NextResponse.json({ error: 'Erro ao buscar funcionalidades' }, { status: 500 })
    }

    return NextResponse.json({ functionalities, module })
  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST - Criar nova funcionalidade
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem criar funcionalidades.' }, { status: 403 })
    }

    const { id: moduleId } = await params
    const body = await request.json()
    const { nome, descricao, ativa = true } = body

    if (!nome) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    // Verificar se o módulo existe
    const { data: module, error: moduleError } = await supabase
      .from('modulos')
      .select('id')
      .eq('id', moduleId)
      .single()

    if (moduleError || !module) {
      return NextResponse.json({ error: 'Módulo não encontrado' }, { status: 404 })
    }

    // Verificar se já existe funcionalidade com o mesmo nome no módulo
    const { data: existingFunctionality } = await supabase
      .from('modulo_funcionalidades')
      .select('id')
      .eq('modulo_id', moduleId)
      .eq('nome', nome)
      .single()

    if (existingFunctionality) {
      return NextResponse.json({ error: 'Já existe uma funcionalidade com este nome neste módulo' }, { status: 400 })
    }

    // Criar funcionalidade
    const { data: functionality, error } = await supabase
      .from('modulo_funcionalidades')
      .insert({
        modulo_id: moduleId,
        nome,
        descricao,
        ativa
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar funcionalidade:', error)
      return NextResponse.json({ error: 'Erro ao criar funcionalidade' }, { status: 500 })
    }

    return NextResponse.json(functionality, { status: 201 })
  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// PUT - Atualizar funcionalidade
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem atualizar funcionalidades.' }, { status: 403 })
    }

    const { id: moduleId } = await params
    const body = await request.json()
    const { functionalityId, nome, descricao, ativa } = body

    if (!functionalityId) {
      return NextResponse.json({ error: 'ID da funcionalidade é obrigatório' }, { status: 400 })
    }

    if (!nome) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    // Verificar se a funcionalidade existe e pertence ao módulo
    const { data: existingFunctionality, error: checkError } = await supabase
      .from('modulo_funcionalidades')
      .select('id, modulo_id')
      .eq('id', functionalityId)
      .eq('modulo_id', moduleId)
      .single()

    if (checkError || !existingFunctionality) {
      return NextResponse.json({ error: 'Funcionalidade não encontrada' }, { status: 404 })
    }

    // Verificar se já existe outra funcionalidade com o mesmo nome no módulo
    const { data: duplicateFunctionality } = await supabase
      .from('modulo_funcionalidades')
      .select('id')
      .eq('modulo_id', moduleId)
      .eq('nome', nome)
      .neq('id', functionalityId)
      .single()

    if (duplicateFunctionality) {
      return NextResponse.json({ error: 'Já existe uma funcionalidade com este nome neste módulo' }, { status: 400 })
    }

    // Atualizar funcionalidade
    const { data: functionality, error } = await supabase
      .from('modulo_funcionalidades')
      .update({
        nome,
        descricao,
        ativa
      })
      .eq('id', functionalityId)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar funcionalidade:', error)
      return NextResponse.json({ error: 'Erro ao atualizar funcionalidade' }, { status: 500 })
    }

    return NextResponse.json(functionality)
  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE - Excluir funcionalidade
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem excluir funcionalidades.' }, { status: 403 })
    }

    const { id: moduleId } = await params
    const { searchParams } = new URL(request.url)
    const functionalityId = searchParams.get('functionalityId')

    if (!functionalityId) {
      return NextResponse.json({ error: 'ID da funcionalidade é obrigatório' }, { status: 400 })
    }

    // Verificar se a funcionalidade existe e pertence ao módulo
    const { data: existingFunctionality, error: checkError } = await supabase
      .from('modulo_funcionalidades')
      .select('id, modulo_id')
      .eq('id', functionalityId)
      .eq('modulo_id', moduleId)
      .single()

    if (checkError || !existingFunctionality) {
      return NextResponse.json({ error: 'Funcionalidade não encontrada' }, { status: 404 })
    }

    // Verificar se existem usuários associados a esta funcionalidade
    const { data: associatedUsers, error: usersError } = await supabase
      .from('funcionalidade_usuarios')
      .select('id')
      .eq('funcionalidade_id', functionalityId)
      .limit(1)

    if (usersError) {
      console.error('Erro ao verificar usuários associados:', usersError)
      return NextResponse.json({ error: 'Erro ao verificar dependências' }, { status: 500 })
    }

    if (associatedUsers && associatedUsers.length > 0) {
      return NextResponse.json({ 
        error: 'Não é possível excluir esta funcionalidade pois existem usuários associados a ela' 
      }, { status: 400 })
    }

    // Excluir funcionalidade
    const { error } = await supabase
      .from('modulo_funcionalidades')
      .delete()
      .eq('id', functionalityId)

    if (error) {
      console.error('Erro ao excluir funcionalidade:', error)
      return NextResponse.json({ error: 'Erro ao excluir funcionalidade' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Funcionalidade excluída com sucesso' })
  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}