import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Token de acesso requerido' }, { status: 401 })
    }
    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Token invalido ou expirado' }, { status: 401 })
    }

    const { id: moduleId } = await params

    const { data: module, error: moduleError } = await supabase
      .from('modulos')
      .select('id, nome')
      .eq('id', moduleId)
      .single()

    if (moduleError || !module) {
      return NextResponse.json({ error: 'Modulo nao encontrado' }, { status: 404 })
    }

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

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Token de acesso requerido' }, { status: 401 })
    }
    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Token invalido ou expirado' }, { status: 401 })
    }

    const { id: moduleId } = await params
    const body = await request.json()
    const { nome, descricao, ativa = true, slug, tipo } = body

    if (!nome) {
      return NextResponse.json({ error: 'Nome e obrigatorio' }, { status: 400 })
    }
    if (!slug) {
      return NextResponse.json({ error: 'Slug e obrigatorio' }, { status: 400 })
    }
    if (tipo && !['corporativo', 'exclusivo'].includes(tipo)) {
      return NextResponse.json({ error: 'Tipo invalido' }, { status: 400 })
    }

    const { data: module, error: moduleError } = await supabase
      .from('modulos')
      .select('id')
      .eq('id', moduleId)
      .single()

    if (moduleError || !module) {
      return NextResponse.json({ error: 'Modulo nao encontrado' }, { status: 404 })
    }

    const { data: existingFunctionality } = await supabase
      .from('modulo_funcionalidades')
      .select('id')
      .eq('modulo_id', moduleId)
      .eq('nome', nome)
      .single()

    if (existingFunctionality) {
      return NextResponse.json({ error: 'Ja existe uma funcionalidade com este nome neste modulo' }, { status: 400 })
    }

    const { data: functionality, error } = await supabase
      .from('modulo_funcionalidades')
      .insert({
        modulo_id: moduleId,
        nome,
        descricao,
        ativa,
        slug,
        tipo: (tipo as 'corporativo' | 'exclusivo') ?? 'corporativo'
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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Token de acesso requerido' }, { status: 401 })
    }
    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Token invalido ou expirado' }, { status: 401 })
    }

    const { id: moduleId } = await params
    const body = await request.json()
    const { functionalityId, nome, descricao, ativa, slug, tipo } = body

    if (!functionalityId) {
      return NextResponse.json({ error: 'ID da funcionalidade e obrigatorio' }, { status: 400 })
    }
    if (!nome) {
      return NextResponse.json({ error: 'Nome e obrigatorio' }, { status: 400 })
    }
    if (!slug) {
      return NextResponse.json({ error: 'Slug e obrigatorio' }, { status: 400 })
    }
    if (tipo && !['corporativo', 'exclusivo'].includes(tipo)) {
      return NextResponse.json({ error: 'Tipo invalido' }, { status: 400 })
    }

    const { data: existingFunctionality, error: checkError } = await supabase
      .from('modulo_funcionalidades')
      .select('id, modulo_id')
      .eq('id', functionalityId)
      .eq('modulo_id', moduleId)
      .single()

    if (checkError || !existingFunctionality) {
      return NextResponse.json({ error: 'Funcionalidade nao encontrada' }, { status: 404 })
    }

    const { data: duplicateFunctionality } = await supabase
      .from('modulo_funcionalidades')
      .select('id')
      .eq('modulo_id', moduleId)
      .eq('nome', nome)
      .neq('id', functionalityId)
      .single()

    if (duplicateFunctionality) {
      return NextResponse.json({ error: 'Ja existe uma funcionalidade com este nome neste modulo' }, { status: 400 })
    }

    const { data: functionality, error } = await supabase
      .from('modulo_funcionalidades')
      .update({
        nome,
        descricao,
        ativa,
        slug,
        tipo: (tipo as 'corporativo' | 'exclusivo') ?? 'corporativo'
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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Token de acesso requerido' }, { status: 401 })
    }
    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Token invalido ou expirado' }, { status: 401 })
    }

    const { id: moduleId } = await params
    const { searchParams } = new URL(request.url)
    const functionalityId = searchParams.get('functionalityId')

    if (!functionalityId) {
      return NextResponse.json({ error: 'ID da funcionalidade e obrigatorio' }, { status: 400 })
    }

    const { data: existingFunctionality, error: checkError } = await supabase
      .from('modulo_funcionalidades')
      .select('id, modulo_id')
      .eq('id', functionalityId)
      .eq('modulo_id', moduleId)
      .single()

    if (checkError || !existingFunctionality) {
      return NextResponse.json({ error: 'Funcionalidade nao encontrada' }, { status: 404 })
    }

    const { data: associatedUsers, error: usersError } = await supabase
      .from('funcionalidade_usuarios')
      .select('id')
      .eq('funcionalidade_id', functionalityId)
      .limit(1)

    if (usersError) {
      console.error('Erro ao verificar usuarios associados:', usersError)
      return NextResponse.json({ error: 'Erro ao verificar dependencias' }, { status: 500 })
    }

    if (associatedUsers && associatedUsers.length > 0) {
      return NextResponse.json({
        error: 'Nao e possivel excluir esta funcionalidade pois existem usuarios associados a ela'
      }, { status: 400 })
    }

    const { error } = await supabase
      .from('modulo_funcionalidades')
      .delete()
      .eq('id', functionalityId)

    if (error) {
      console.error('Erro ao excluir funcionalidade:', error)
      return NextResponse.json({ error: 'Erro ao excluir funcionalidade' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Funcionalidade excluida com sucesso' })
  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
