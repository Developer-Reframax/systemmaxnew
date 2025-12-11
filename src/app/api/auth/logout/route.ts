import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/auth'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value
    const body = await request.json().catch(() => ({}))
    const { matricula_usuario, fim_sessao } = body

    if (token) {
      const decoded = verifyToken(token)
      if (
        decoded &&
        matricula_usuario &&
        Number(decoded.matricula) !== Number(matricula_usuario)
      ) {
        return NextResponse.json(
          { success: false, message: 'Acesso negado' },
          { status: 403 }
        )
      }

      const matriculaParaEncerrar = matricula_usuario || decoded?.matricula
      if (matriculaParaEncerrar) {
        const { error } = await supabase
          .from('sessoes')
          .update({ fim_sessao })
          .eq('matricula_usuario', matriculaParaEncerrar)
          .is('fim_sessao', null)
          .order('inicio_sessao', { ascending: false })
          .limit(1)

        if (error) {
          console.error('Erro ao atualizar sessÇœo:', error)
        }
      }
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logout realizado com sucesso'
    })

    response.cookies.set('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0
    })

    return response
  } catch (error) {
    console.error('Logout API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

