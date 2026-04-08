import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  extractFirstAndLastName,
  generateFirstAccessToken,
  isFirstAccessPassword,
  normalizeNameForComparison
} from '@/lib/first-access'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    const { matricula, firstName, lastName } = await request.json()
    const normalizedMatricula = Number(matricula)
    const normalizedFirstName = typeof firstName === 'string' ? normalizeNameForComparison(firstName) : ''
    const normalizedLastName = typeof lastName === 'string' ? normalizeNameForComparison(lastName) : ''

    if (!normalizedMatricula || !normalizedFirstName || !normalizedLastName) {
      return NextResponse.json(
        { success: false, message: 'Informe a matricula, o primeiro nome e o ultimo nome.' },
        { status: 400 }
      )
    }

    const { data: user, error } = await supabase
      .from('usuarios')
      .select('matricula, nome, password_hash, status')
      .eq('matricula', normalizedMatricula)
      .eq('status', 'ativo')
      .maybeSingle()

    if (error || !user) {
      return NextResponse.json(
        { success: false, message: 'Usuario nao encontrado ou inativo.' },
        { status: 404 }
      )
    }

    if (!isFirstAccessPassword(user.password_hash)) {
      return NextResponse.json(
        { success: false, message: 'Este usuario ja possui senha cadastrada.' },
        { status: 400 }
      )
    }

    const { firstName: expectedFirstName, lastName: expectedLastName } = extractFirstAndLastName(
      user.nome || ''
    )

    if (normalizedFirstName !== expectedFirstName || normalizedLastName !== expectedLastName) {
      return NextResponse.json(
        { success: false, message: 'Os dados nao coincidem com a matricula informada.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Dados confirmados. Agora cadastre sua nova senha.',
      verificationToken: generateFirstAccessToken(user.matricula)
    })
  } catch (error) {
    console.error('Erro ao validar primeiro acesso:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}
