import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function PUT(request: NextRequest) {
  try {
    // Verificar token de autenticação
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Token de acesso requerido' }, { status: 401 })
    }
    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Token invalido ou expirado' }, { status: 401 })
    }


    if (!token || !user.matricula) {
      return NextResponse.json(
        { success: false, message: 'Token inválido: matrícula não encontrada' },
        { status: 401 }
      )
    }
    const matricula = user.matricula

    // Obter dados da requisição
    const body = await request.json()
    const { accepted } = body

    if (typeof accepted !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'Campo "accepted" é obrigatório e deve ser boolean' },
        { status: 400 }
      )
    }

    // Atualizar aceitação de termos
    const { error } = await supabase
      .from('usuarios')
      .update({
        termos: accepted,
        updated_at: new Date().toISOString()
      })
      .eq('matricula', matricula)

    if (error) {
      console.error('Erro ao atualizar termos:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao atualizar termos de uso' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: accepted ? 'Termos aceitos com sucesso' : 'Termos recusados'
    })

  } catch (error) {
    console.error('Erro na atualização de termos:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
