import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function requireAuth(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
  if (!token) {
    return {
      user: null,
      response: NextResponse.json(
        { success: false, error: 'Token de acesso requerido' },
        { status: 401 }
      )
    }
  }

  const user = verifyToken(token)
  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { success: false, error: 'Token invalido ou expirado' },
        { status: 401 }
      )
    }
  }

  return { user, response: null as NextResponse | null }
}

// GET - Buscar todas as funcionalidades ativas
export async function GET(request: NextRequest) {
  try {
    // Autenticacao via cookie: apenas verifica presenca/validade basica do JWT
    const { user, response } = requireAuth(request)
    if (!user) return response!

    // Permissao: somente Admin ou Editor
    if (user.role !== 'Admin' && user.role !== 'Editor') {
      return NextResponse.json(
        { success: false, error: 'Acesso negado. Apenas Admin e Editor podem gerenciar funcionalidades.' },
        { status: 403 }
      )
    }

    // Buscar funcionalidades ativas de todos os modulos
    const { data: functionalities, error } = await supabase
      .from('modulo_funcionalidades')
      .select(
        `
        *,
        modulos(
          id,
          nome,
          tipo
        )
      `
      )
      .eq('ativa', true)
      .order('nome')

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      functionalities: functionalities || []
    })
  } catch (error) {
    console.error('Erro na API de funcionalidades:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
