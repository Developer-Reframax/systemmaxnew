import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { getUserPermissions, userHasFunctionality } from '@/lib/permissions-server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MANAGE_USER_FUNCTIONALITIES_SLUG = 'editar_funcionalidades_usuarios'

async function requireManageUserFunctionalitiesAccess(request: NextRequest) {
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

  const canManageUserFunctionalities = await userHasFunctionality(
    user,
    MANAGE_USER_FUNCTIONALITIES_SLUG
  )

  if (!canManageUserFunctionalities) {
    return {
      user: null,
      response: NextResponse.json(
        {
          success: false,
          error:
            'Acesso negado. A funcionalidade editar_funcionalidades_usuarios e obrigatoria.'
        },
        { status: 403 }
      )
    }
  }

  return { user, response: null as NextResponse | null }
}

// GET - Buscar apenas as funcionalidades ativas que o usuario logado ja possui
export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireManageUserFunctionalitiesAccess(request)
    if (!user) return response!

    const permissions = await getUserPermissions(user)
    const allowedFunctionalityIds = Array.from(
      new Set(
        (permissions?.modulos || []).flatMap((modulo) =>
          modulo.funcionalidades.map((funcionalidade) => funcionalidade.id)
        )
      )
    )

    if (allowedFunctionalityIds.length === 0) {
      return NextResponse.json({
        success: true,
        functionalities: []
      })
    }

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
      .in('id', allowedFunctionalityIds)
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
