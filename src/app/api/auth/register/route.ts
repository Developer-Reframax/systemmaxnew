import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const jwtSecret = process.env.JWT_SECRET!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      nome,
      email,
      matricula,
      senha,
      role,
      funcao,
      contrato_raiz,
      phone,
      aceite_termos,
      letra_id,
      equipe_id,
      first_access_mode
    } = body

    if (!nome || !email || !matricula) {
      return NextResponse.json(
        { success: false, message: 'Campos obrigatorios nao preenchidos' },
        { status: 400 }
      )
    }

    if (!first_access_mode && !senha) {
      return NextResponse.json(
        { success: false, message: 'Senha e obrigatoria quando o primeiro acesso nao estiver habilitado' },
        { status: 400 }
      )
    }

    if (!aceite_termos) {
      return NextResponse.json(
        { success: false, message: 'E necessario aceitar os termos de uso' },
        { status: 400 }
      )
    }

    const { data: existingUser } = await supabase
      .from('usuarios')
      .select('matricula, email')
      .or(`matricula.eq.${matricula},email.eq.${email}`)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Usuario ja existe com esta matricula ou email' },
        { status: 409 }
      )
    }

    let hashedPassword: string | null = null
    if (!first_access_mode) {
      const saltRounds = 12
      hashedPassword = await bcrypt.hash(senha, saltRounds)
    }

    const { data: newUser, error } = await supabase
      .from('usuarios')
      .insert({
        nome,
        email,
        matricula,
        password_hash: hashedPassword,
        role: role || 'Usuario',
        funcao: funcao || 'Geral',
        contrato_raiz: contrato_raiz || null,
        phone,
        letra_id: letra_id || null,
        equipe_id: equipe_id || null,
        status: 'ativo',
        termos: aceite_termos
      })
      .select('matricula, nome, email, role, funcao, status')
      .single()

    if (error) {
      console.error('Erro ao criar usuario:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao criar usuario' },
        { status: 500 }
      )
    }

    const token = jwt.sign(
      {
        matricula: newUser.matricula,
        nome: newUser.nome,
        email: newUser.email,
        role: newUser.role
      },
      jwtSecret,
      { expiresIn: '24h' }
    )

    await supabase
      .from('sessoes')
      .insert({
        matricula_usuario: newUser.matricula,
        inicio_sessao: new Date().toISOString(),
        paginas_acessadas: 1,
        modulos_acessados: ['Registro']
      })

    return NextResponse.json({
      success: true,
      message: 'Usuario criado com sucesso',
      token,
      user: {
        matricula: newUser.matricula,
        nome: newUser.nome,
        email: newUser.email,
        role: newUser.role,
        funcao: newUser.funcao,
        status: newUser.status
      }
    })
  } catch (error) {
    console.error('Register API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
