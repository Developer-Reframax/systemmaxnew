import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { hashPassword } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Listar usuários (apenas admins)
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    // Verificar se é admin ou editor usando o role do token JWT
    if (!authResult.user || !authResult.user.role || !['Admin', 'Editor'].includes(authResult.user.role)) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado - apenas administradores e editores' },
        { status: 403 }
      )
    }

    // Buscar usuários do mesmo contrato_raiz
    let query = supabase
      .from('usuarios')
      .select(`
        matricula, 
        nome, 
        email, 
        funcao, 
        contrato_raiz, 
        status, 
        role, 
        phone, 
        created_at,
        letra_id,
        equipe_id,
        letra:letras!usuarios_letra_id_fkey(id, letra),
        equipe:equipes!usuarios_equipe_id_fkey(id, equipe)
      `)
      .order('created_at', { ascending: false })

    // Se não for Admin, filtrar pelo contrato_raiz do usuário logado
    if (authResult.user.role !== 'Admin' && authResult.user.contrato_raiz) {
      query = query.eq('contrato_raiz', authResult.user.contrato_raiz)
    }

    const { data: users, error } = await query

    if (error) {
      console.error('Erro ao buscar usuários:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar usuários' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      users
    })

  } catch (error) {
    console.error('Users GET API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar usuário
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    const body = await request.json()
    const {
      matricula,
      nome,
      email,
      funcao,
      contrato_raiz,
      status,
      role,
      phone,
      password_hash,
      letra_id,
      equipe_id,
      terms_reconhecimento_facial,
      termsReconhecimentoFacial,
      termsBiometria
    } = body

    if (!matricula) {
      return NextResponse.json(
        { success: false, message: 'Matrícula é obrigatória' },
        { status: 400 }
      )
    }

    // Verificar se é admin ou o próprio usuário usando o role do token JWT
    const isAdmin = authResult.user?.role === 'Admin'
    const isOwnProfile = authResult.user?.matricula === matricula

    if (!isAdmin && !isOwnProfile) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Preparar dados para atualização
    const updateData: Record<string, unknown> = {}
    if (nome) updateData.nome = nome
    if (email) updateData.email = email
    if (funcao) updateData.funcao = funcao
    if (contrato_raiz) updateData.contrato_raiz = contrato_raiz
    if (phone !== undefined) updateData.phone = phone
    if (letra_id !== undefined) updateData.letra_id = letra_id
    if (equipe_id !== undefined) updateData.equipe_id = equipe_id

    const consentFlag =
      terms_reconhecimento_facial ??
      termsReconhecimentoFacial ??
      termsBiometria
    if (consentFlag !== undefined) updateData.terms_reconhecimento_facial = consentFlag
    
    // Hash da senha se fornecida
    if (password_hash) {
      updateData.password_hash = await hashPassword(password_hash)
    }
    
    // Apenas admins podem alterar role e status
    if (isAdmin) {
      if (role) updateData.role = role
      if (status) updateData.status = status
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, message: 'Nenhum dado válido para atualizar' },
        { status: 400 }
      )
    }

    // Verificar se o usuário existe antes de atualizar
    const { data: existingUser, error: checkError } = await supabase
      .from('usuarios')
      .select('matricula')
      .eq('matricula', matricula)
      .single()

    if (checkError || !existingUser) {
      return NextResponse.json(
        { success: false, message: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Atualizar usuário
    const { data: updatedUser, error } = await supabase
      .from('usuarios')
      .update(updateData)
      .eq('matricula', matricula)
      .select(`
        matricula, 
        nome, 
        email, 
        funcao, 
        contrato_raiz, 
        status, 
        role, 
        phone,
        letra_id,
        equipe_id,
        letra:letras!usuarios_letra_id_fkey(id, letra),
        equipe:equipes!usuarios_equipe_id_fkey(id, equipe)
      `)

    if (error) {
      console.error('Erro ao atualizar usuário:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao atualizar usuário' },
        { status: 500 }
      )
    }

    if (!updatedUser || updatedUser.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Nenhum usuário foi atualizado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Usuário atualizado com sucesso',
      user: updatedUser[0]
    })

  } catch (error) {
    console.error('Users PUT API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Desativar usuário (apenas admins)
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const matricula = searchParams.get('matricula')

    if (!matricula) {
      return NextResponse.json(
        { success: false, message: 'Matrícula é obrigatória' },
        { status: 400 }
      )
    }

    // Verificar se é admin usando o role do token JWT
    if (!authResult.user || !authResult.user.role || authResult.user.role !== 'Admin') {
      return NextResponse.json(
        { success: false, message: 'Acesso negado - apenas administradores' },
        { status: 403 }
      )
    }

    // Desativar usuário (não deletar fisicamente)
    const { error } = await supabase
      .from('usuarios')
      .update({ status: 'inativo' })
      .eq('matricula', matricula)

    if (error) {
      console.error('Erro ao desativar usuário:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao desativar usuário' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Usuário desativado com sucesso'
    })

  } catch (error) {
    console.error('Users DELETE API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
