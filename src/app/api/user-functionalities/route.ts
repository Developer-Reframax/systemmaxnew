import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Verifica autenticacao/role usando cookie HttpOnly
async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
  if (!token) {
    return { user: null, error: 'Token nao fornecido' }
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return { user: null, error: 'Token invalido ou expirado' }
  }

  if (!['Admin', 'Editor'].includes(decoded.role)) {
    return {
      user: decoded,
      error: 'Acesso negado. Apenas administradores e editores podem gerenciar funcionalidades de usuarios.'
    }
  }

  return { user: decoded, error: undefined }
}

export async function GET(request: NextRequest) {
  try {
    const { error: authError } = await verifyAuth(request)
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const matricula = searchParams.get('matricula')

    if (!matricula) {
      return NextResponse.json(
        { success: false, error: 'Matricula do usuario e obrigatoria' },
        { status: 400 }
      )
    }

    const { data: userFunctionalities, error } = await supabase
      .from('funcionalidade_usuarios')
      .select(`
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
      `)
      .eq('matricula_usuario', parseInt(matricula))

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
    const { error: authError } = await verifyAuth(request)
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 })
    }

    const body = await request.json()
    const { matricula_usuario, funcionalidade_id } = body

    if (!matricula_usuario || !funcionalidade_id) {
      return NextResponse.json(
        { success: false, error: 'Matricula do usuario e ID da funcionalidade sao obrigatorios' },
        { status: 400 }
      )
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
    const { error: authError } = await verifyAuth(request)
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 })
    }

    const body = await request.json()
    const { matricula_usuario, funcionalidade_id } = body

    if (!matricula_usuario || !funcionalidade_id) {
      return NextResponse.json(
        { success: false, error: 'Matricula do usuario e ID da funcionalidade sao obrigatorios' },
        { status: 400 }
      )
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

