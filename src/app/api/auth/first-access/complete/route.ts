import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'
import { hashPassword } from '@/lib/auth'
import { isFirstAccessPassword, verifyFirstAccessToken } from '@/lib/first-access'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const jwtSecret = process.env.JWT_SECRET!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    const { verificationToken, newPassword, confirmPassword } = await request.json()

    if (
      typeof verificationToken !== 'string' ||
      typeof newPassword !== 'string' ||
      typeof confirmPassword !== 'string'
    ) {
      return NextResponse.json(
        { success: false, message: 'Informe o token de validacao e a nova senha.' },
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

    const verified = verifyFirstAccessToken(verificationToken)
    if (!verified) {
      return NextResponse.json(
        { success: false, message: 'Token invalido ou expirado.' },
        { status: 401 }
      )
    }

    const { data: user, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('matricula', verified.matricula)
      .eq('status', 'ativo')
      .maybeSingle()

    if (error) {
      console.error('Erro ao buscar usuario no primeiro acesso:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao localizar o usuario para concluir o primeiro acesso.' },
        { status: 500 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Usuario nao encontrado ou inativo.' },
        { status: 404 }
      )
    }

    if (!isFirstAccessPassword(user.password_hash)) {
      return NextResponse.json(
        { success: false, message: 'Este usuario ja deixou o fluxo de primeiro acesso.' },
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
      .eq('matricula', user.matricula)

    if (updateError) {
      console.error('Erro ao concluir primeiro acesso:', updateError)
      return NextResponse.json(
        { success: false, message: 'Erro ao atualizar a senha.' },
        { status: 500 }
      )
    }

    const authToken = jwt.sign(
      {
        matricula: user.matricula,
        email: user.email,
        role: user.role,
        nome: user.nome,
        funcao: user.funcao,
        contrato_raiz: user.contrato_raiz,
        tipo: user.tipo
      },
      jwtSecret,
      { expiresIn: '24h' }
    )

    const response = NextResponse.json({
      success: true,
      message: 'Primeiro acesso concluido com sucesso.',
      user: {
        matricula: user.matricula,
        nome: user.nome,
        email: user.email,
        role: user.role,
        funcao: user.funcao,
        contrato_raiz: user.contrato_raiz,
        tipo: user.tipo
      }
    })

    response.cookies.set('auth_token', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24
    })

    return response
  } catch (error) {
    console.error('Erro ao concluir primeiro acesso:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}
