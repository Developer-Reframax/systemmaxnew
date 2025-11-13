import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

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
    console.log('Raw request body:', body)
    
    // Aceitar tanto 'email' quanto 'identifier' para compatibilidade
    const email = body.email || body.identifier
    const password = body.password

    console.log('=== LOGIN DEBUG ===')
    console.log('Received login request for:', email)
    console.log('Password provided:', password ? 'Yes' : 'No')
    console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Not set')
    console.log('Service Key:', supabaseServiceKey ? 'Set' : 'Not set')

    if (!email || !password) {
      console.log('Missing credentials - email:', !!email, 'password:', !!password)
      return NextResponse.json(
        { success: false, message: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar usuário no banco
    console.log('Searching for user with email:', email)
    const { data: user, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .eq('status', 'ativo')
      .single()

    console.log('Database query result:')
    console.log('- User found:', !!user)
    console.log('- Error:', error)
    if (user) {
      console.log('- User data:', {
        matricula: user.matricula,
        nome: user.nome,
        email: user.email,
        status: user.status,
        role: user.role,
        password_hash_exists: !!user.password_hash,
        password_hash_length: user.password_hash?.length || 0
      })
    }

    if (error || !user) {
      console.log('User not found or database error:', error)
      return NextResponse.json(
        { success: false, message: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    // Verificar senha
    console.log('Comparing password...')
    console.log('- Provided password:', password)
    console.log('- Stored hash:', user.password_hash)
    
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    console.log('- Password comparison result:', isValidPassword)

    if (!isValidPassword) {
      console.log('Password comparison failed')
      return NextResponse.json(
        { success: false, message: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    console.log('Password verified successfully, generating JWT token...')

    // Gerar token JWT
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

    console.log('JWT token generated successfully')
    console.log('Login successful for user:', user.email)

    return NextResponse.json({
      success: true,
      message: 'Login realizado com sucesso',
      token,
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

  } catch (error) {
    console.error('=== LOGIN ERROR ===')
    console.error('Login API error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
