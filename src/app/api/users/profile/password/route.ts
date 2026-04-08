import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { hashPassword, verifyPassword } from '@/lib/auth'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, message: authResult.error || 'Nao autenticado' },
        { status: authResult.status || 401 }
      )
    }

    const body = await request.json()
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''
    const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : ''

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'Informe a senha atual, a nova senha e a confirmacao.' },
        { status: 400 }
      )
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'As senhas informadas nao coincidem.' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'A nova senha deve ter pelo menos 6 caracteres.' },
        { status: 400 }
      )
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { success: false, message: 'A nova senha precisa ser diferente da senha atual.' },
        { status: 400 }
      )
    }

    const { data: existingUser, error: fetchError } = await supabase
      .from('usuarios')
      .select('matricula, password_hash')
      .eq('matricula', authResult.user.matricula)
      .single()

    if (fetchError || !existingUser) {
      return NextResponse.json(
        { success: false, message: 'Usuario nao encontrado.' },
        { status: 404 }
      )
    }

    const currentPasswordValid = await verifyPassword(currentPassword, existingUser.password_hash)
    if (!currentPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'A senha atual informada esta incorreta.' },
        { status: 400 }
      )
    }

    const hashedPassword = await hashPassword(newPassword)

    const { error: updateError } = await supabase
      .from('usuarios')
      .update({
        password_hash: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('matricula', authResult.user.matricula)

    if (updateError) {
      console.error('Erro ao atualizar senha do perfil:', updateError)
      return NextResponse.json(
        { success: false, message: 'Erro ao atualizar a senha.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Senha alterada com sucesso.'
    })
  } catch (error) {
    console.error('Erro na troca de senha do perfil:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}
