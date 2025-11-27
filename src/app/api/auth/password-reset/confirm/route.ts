import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hashPassword } from '@/lib/auth'
import { verifyResetToken } from '@/lib/password-reset'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Token de redefinicao nao informado' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Senha nova e obrigatoria' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'A nova senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    const verified = verifyResetToken(token)

    if (!verified) {
      return NextResponse.json(
        { success: false, message: 'Token invalido ou expirado' },
        { status: 401 }
      )
    }

    const { data: user, error: findError } = await supabase
      .from('usuarios')
      .select('matricula, status')
      .eq('matricula', verified.matricula)
      .maybeSingle()

    if (findError || !user) {
      return NextResponse.json(
        { success: false, message: 'Usuario nao encontrado' },
        { status: 404 }
      )
    }

    if (user.status !== 'ativo') {
      return NextResponse.json(
        { success: false, message: 'Usuario inativo' },
        { status: 403 }
      )
    }

    const hashedPassword = await hashPassword(password)

    const { error: updateError } = await supabase
      .from('usuarios')
      .update({
        password_hash: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('matricula', verified.matricula)

    if (updateError) {
      console.error('Erro ao atualizar senha:', updateError)
      return NextResponse.json(
        { success: false, message: 'Erro ao atualizar a senha' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Senha redefinida com sucesso'
    })
  } catch (error) {
    console.error('Erro ao concluir redefinicao de senha:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno ao redefinir senha' },
      { status: 500 }
    )
  }
}
