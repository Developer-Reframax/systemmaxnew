import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

// Cliente Supabase com service role para bypass do RLS
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Cliente Supabase normal para operações que respeitam RLS
import { supabase } from '@/lib/supabase'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

interface JWTPayload {
  matricula: number
  email: string
  role: string
}

// Função para verificar autenticação
async function verifyAuth(request: NextRequest): Promise<{ user: JWTPayload; error?: string }> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!token) {
    return { user: {} as JWTPayload, error: 'Token não fornecido' }
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    return { user: decoded }
  } catch {
    return { user: {} as JWTPayload, error: 'Token inválido' }
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ matricula: string }> }) {
  try {
    const { user, error: authError } = await verifyAuth(request)
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 })
    }

    const { matricula: matriculaStr } = await params
    const matricula = parseInt(matriculaStr)

    // Verificar se o usuário pode acessar este perfil (Admin ou próprio usuário)
    if (user.role !== 'Admin' && user.matricula !== matricula) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Buscar dados do usuário
    const { data: userData, error } = await supabase
      .from('usuarios')
      .select('matricula, nome, email, role, funcao, contrato_raiz, status, created_at')
      .eq('matricula', matricula)
      .single()

    if (error || !userData) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    return NextResponse.json(userData)
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ matricula: string }> }) {
  try {
    const { user, error: authError } = await verifyAuth(request)
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 })
    }

    const { matricula: matriculaStr } = await params
    const matricula = parseInt(matriculaStr)

    // Verificar se o usuário pode atualizar este perfil (Admin ou próprio usuário)
    if (user.role !== 'Admin' && user.matricula !== matricula) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const { nome, email, role, funcao, contrato_raiz, status } = body

    // Atualizar dados do usuário
    const { data, error } = await supabase
      .from('usuarios')
      .update({
        nome,
        email,
        role,
        funcao,
        contrato_raiz,
        status
      })
      .eq('matricula', matricula)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar usuário:', error)
      return NextResponse.json({ error: 'Erro ao atualizar usuário' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Usuário atualizado com sucesso', user: data })
   } catch (error) {
     console.error('Erro ao atualizar usuário:', error)
     return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
   }
 }

// DELETE - Deletar usuário
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ matricula: string }> }) {
  try {
    const { user, error: authError } = await verifyAuth(request)
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 })
    }

    const { matricula: matriculaStr } = await params
    const matricula = parseInt(matriculaStr)

    if (isNaN(matricula)) {
      return NextResponse.json({ error: 'Matrícula inválida' }, { status: 400 })
    }

    // Verificar se o usuário tem permissão para deletar (apenas Admin)
    if (user.role !== 'Admin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem deletar usuários.' }, { status: 403 })
    }

    // Verificar se o usuário não está tentando deletar a si mesmo
    if (user.matricula === matricula) {
      return NextResponse.json({ error: 'Você não pode deletar sua própria conta.' }, { status: 400 })
    }

    // Verificar se o usuário existe usando service role (bypass RLS)
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('usuarios')
      .select('matricula, nome, email, status')
      .eq('matricula', matricula)
      .single()

    if (fetchError || !existingUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Realizar exclusão em cascata: primeiro deletar sessões, depois o usuário
    // Usar transação para garantir consistência
    
    // 1. Deletar todas as sessões relacionadas ao usuário
    const { error: deleteSessionsError } = await supabaseAdmin
      .from('sessoes')
      .delete()
      .eq('matricula_usuario', matricula)

    if (deleteSessionsError) {
      console.error('Erro ao deletar sessões do usuário:', deleteSessionsError)
      return NextResponse.json({ error: 'Erro ao deletar sessões do usuário' }, { status: 500 })
    }

    // 2. Deletar o usuário após remover as dependências
    const { error: deleteUserError } = await supabaseAdmin
      .from('usuarios')
      .delete()
      .eq('matricula', matricula)

    if (deleteUserError) {
      console.error('Erro ao deletar usuário:', deleteUserError)
      return NextResponse.json({ error: 'Erro ao deletar usuário' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Usuário deletado com sucesso',
      user: {
        matricula: existingUser.matricula,
        nome: existingUser.nome,
        email: existingUser.email
      }
    })
  } catch (error) {
    console.error('Erro ao deletar usuário:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}