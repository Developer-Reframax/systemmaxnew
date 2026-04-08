import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { isFirstAccessPassword } from '@/lib/first-access'

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
    const body = await request.json()
    const identifier = body.email || body.identifier
    const password = body.password

    if (!identifier) {
      return NextResponse.json(
        { success: false, message: 'Email ou matricula e obrigatorio' },
        { status: 400 }
      )
    }

    const { data: user, error } = await supabase
      .from('usuarios')
      .select('*')
      .or(`email.eq.${identifier}, matricula.eq.${identifier}`)
      .eq('status', 'ativo')
      .single()

    if (error || !user) {
      return NextResponse.json(
        { success: false, message: 'Credenciais invalidas' },
        { status: 401 }
      )
    }

    if (isFirstAccessPassword(user.password_hash)) {
      return NextResponse.json({
        success: false,
        requiresFirstAccess: true,
        matricula: user.matricula,
        message: 'Primeiro acesso detectado. Confirme seus dados para cadastrar uma nova senha.'
      })
    }

    if (!password) {
      return NextResponse.json(
        { success: false, message: 'Email e senha sao obrigatorios' },
        { status: 400 }
      )
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: 'Credenciais invalidas' },
        { status: 401 }
      )
    }

    const token = jwt.sign(
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
      message: 'Login realizado com sucesso',
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

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24
    })

    return response
  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
