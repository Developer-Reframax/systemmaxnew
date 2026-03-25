import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/auth'
import { getUserPermissions, userHasFunctionality } from '@/lib/permissions-server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MANAGE_USER_FUNCTIONALITIES_SLUG = 'editar_funcionalidades_usuarios'

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
  if (!token) {
    return { user: null, error: 'Token nao fornecido', status: 401 }
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return { user: null, error: 'Token invalido ou expirado', status: 401 }
  }

  return { user: decoded, error: undefined, status: undefined }
}

async function getManageableFunctionalityIds(user: NonNullable<Awaited<ReturnType<typeof verifyAuth>>['user']>) {
  const permissions = await getUserPermissions(user)

  return Array.from(
    new Set(
      (permissions?.modulos || []).flatMap((modulo) =>
        modulo.funcionalidades.map((funcionalidade) => funcionalidade.id)
      )
    )
  )
}

async function canManageUserFunctionalities(
  user: NonNullable<Awaited<ReturnType<typeof verifyAuth>>['user']>
) {
  return userHasFunctionality(user, MANAGE_USER_FUNCTIONALITIES_SLUG)
}

async function validateManagedFunctionalityAccess(
  user: NonNullable<Awaited<ReturnType<typeof verifyAuth>>['user']>,
  functionalityId: string
) {
  const canManage = await canManageUserFunctionalities(user)
  if (!canManage) {
    return {
      error:
        'Acesso negado. A funcionalidade editar_funcionalidades_usuarios e obrigatoria.',
      status: 403
    }
  }

  const manageableFunctionalityIds = await getManageableFunctionalityIds(user)
  if (!manageableFunctionalityIds.includes(functionalityId)) {
    return {
      error:
        'Acesso negado. Voce so pode gerenciar funcionalidades que tambem possui acesso.',
      status: 403
    }
  }

  return { error: undefined, status: undefined }
}

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError, status: authStatus } = await verifyAuth(request)
    if (authError) {
      return NextResponse.json({ error: authError }, { status: authStatus || 401 })
    }
    if (!user) {
      return NextResponse.json({ error: 'Usuario nao autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const matricula = searchParams.get('matricula')

    if (!matricula) {
      return NextResponse.json(
        { success: false, error: 'Matricula do usuario e obrigatoria' },
        { status: 400 }
      )
    }

    const matriculaNumber = parseInt(matricula, 10)
    if (Number.isNaN(matriculaNumber)) {
      return NextResponse.json(
        { success: false, error: 'Matricula invalida' },
        { status: 400 }
      )
    }

    const isSelf = user.matricula === matriculaNumber
    const canManage = await canManageUserFunctionalities(user)

    if (!isSelf && !canManage) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Acesso negado. A funcionalidade editar_funcionalidades_usuarios e obrigatoria.'
        },
        { status: 403 }
      )
    }

    const manageableFunctionalityIds = canManage
      ? await getManageableFunctionalityIds(user)
      : []

    let query = supabase
      .from('funcionalidade_usuarios')
      .select(
        `
        *,
        funcionalidade:modulo_funcionalidades(
          id,
          nome,
          descricao,
          modulo_id,
          modulo:modulos(
            id,
            nome,
            tipo
          )
        )
      `
      )
      .eq('matricula_usuario', matriculaNumber)

    if (canManage) {
      if (manageableFunctionalityIds.length === 0) {
        return NextResponse.json({
          success: true,
          userFunctionalities: []
        })
      }

      query = query.in('funcionalidade_id', manageableFunctionalityIds)
    }

    const { data: userFunctionalities, error } = await query

    if (error) {
      console.error('Erro ao buscar funcionalidades do usuario:', error)
      return NextResponse.json(
        { success: false, error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      userFunctionalities: userFunctionalities || []
    })
  } catch (error) {
    console.error('Erro na API de funcionalidades do usuario:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError, status: authStatus } = await verifyAuth(request)
    if (authError) {
      return NextResponse.json({ error: authError }, { status: authStatus || 401 })
    }
    if (!user) {
      return NextResponse.json({ error: 'Usuario nao autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { matricula_usuario, funcionalidade_id } = body

    if (!matricula_usuario || !funcionalidade_id) {
      return NextResponse.json(
        { success: false, error: 'Matricula do usuario e ID da funcionalidade sao obrigatorios' },
        { status: 400 }
      )
    }

    const { error: accessError, status: accessStatus } = await validateManagedFunctionalityAccess(
      user,
      funcionalidade_id
    )
    if (accessError) {
      return NextResponse.json({ success: false, error: accessError }, { status: accessStatus || 403 })
    }

    const { data: existing, error: checkError } = await supabase
      .from('funcionalidade_usuarios')
      .select('*')
      .eq('matricula_usuario', matricula_usuario)
      .eq('funcionalidade_id', funcionalidade_id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Erro na verificacao de funcionalidade:', checkError)
      return NextResponse.json(
        { success: false, error: 'Erro ao verificar funcionalidade existente' },
        { status: 500 }
      )
    }

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Usuario ja tem acesso a esta funcionalidade' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('funcionalidade_usuarios')
      .insert({
        matricula_usuario,
        funcionalidade_id
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao inserir funcionalidade para usuario:', error)
      return NextResponse.json(
        { success: false, error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      userFunctionality: data
    })
  } catch (error) {
    console.error('Erro na API de funcionalidades do usuario:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, error: authError, status: authStatus } = await verifyAuth(request)
    if (authError) {
      return NextResponse.json({ error: authError }, { status: authStatus || 401 })
    }
    if (!user) {
      return NextResponse.json({ error: 'Usuario nao autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { matricula_usuario, funcionalidade_id } = body

    if (!matricula_usuario || !funcionalidade_id) {
      return NextResponse.json(
        { success: false, error: 'Matricula do usuario e ID da funcionalidade sao obrigatorios' },
        { status: 400 }
      )
    }

    const { error: accessError, status: accessStatus } = await validateManagedFunctionalityAccess(
      user,
      funcionalidade_id
    )
    if (accessError) {
      return NextResponse.json({ success: false, error: accessError }, { status: accessStatus || 403 })
    }

    const { error } = await supabase
      .from('funcionalidade_usuarios')
      .delete()
      .eq('matricula_usuario', matricula_usuario)
      .eq('funcionalidade_id', funcionalidade_id)

    if (error) {
      console.error('Erro ao remover funcionalidade do usuario:', error)
      return NextResponse.json(
        { success: false, error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Acesso a funcionalidade removido com sucesso'
    })
  } catch (error) {
    console.error('Erro na API de funcionalidades do usuario:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
