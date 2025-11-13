import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

interface JWTPayload {
  userId: string
  email: string
  role: string
}

// Função para verificar autenticação e autorização
async function verifyAuth(request: NextRequest): Promise<{ user: JWTPayload; error?: string }> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!token) {
    return { user: {} as JWTPayload, error: 'Token não fornecido' }
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    
    // Verificar se o usuário tem permissão (Admin ou Editor)
    if (!['Admin', 'Editor'].includes(decoded.role)) {
      return { user: decoded, error: 'Acesso negado. Apenas administradores e editores podem gerenciar funcionalidades de usuários.' }
    }

    return { user: decoded }
  } catch {
    return { user: {} as JWTPayload, error: 'Token inválido' }
  }
}

// GET - Buscar funcionalidades de um usuário específico
export async function GET(request: NextRequest) {
  try {
    const { error: authError } = await verifyAuth(request)
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 })
    }

    // Obter matrícula do usuário da query string
    const { searchParams } = new URL(request.url)
    const matricula = searchParams.get('matricula')

    if (!matricula) {
      return NextResponse.json(
        { success: false, error: 'Matrícula do usuário é obrigatória' },
        { status: 400 }
      )
    }

    // Buscar funcionalidades do usuário
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
      console.error('Erro ao buscar funcionalidades do usuário:', error)
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
    console.error('Erro na API de funcionalidades do usuário:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Adicionar acesso a uma funcionalidade
export async function POST(request: NextRequest) {
  try {
    const { error: authError } = await verifyAuth(request)
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 })
    }

    const body = await request.json()
    console.log('POST Body recebido:', JSON.stringify(body, null, 2))
    const { matricula_usuario, funcionalidade_id } = body
    console.log('Parâmetros extraídos:', { matricula_usuario, funcionalidade_id })

    if (!matricula_usuario || !funcionalidade_id) {
      console.log('Erro: Parâmetros obrigatórios ausentes')
      return NextResponse.json(
        { success: false, error: 'Matrícula do usuário e ID da funcionalidade são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se o usuário já tem acesso à funcionalidade
    console.log('Verificando funcionalidade existente para:', { matricula_usuario, funcionalidade_id })
    const { data: existing, error: checkError } = await supabase
      .from('funcionalidade_usuarios')
      .select('*')
      .eq('matricula_usuario', matricula_usuario)
      .eq('funcionalidade_id', funcionalidade_id)
      .single()

    console.log('Resultado da verificação:', { existing, checkError })
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Erro na verificação:', checkError)
      return NextResponse.json(
        { success: false, error: 'Erro ao verificar funcionalidade existente' },
        { status: 500 }
      )
    }

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Usuário já tem acesso a esta funcionalidade' },
        { status: 400 }
      )
    }

    // Adicionar acesso à funcionalidade
    console.log('Inserindo nova funcionalidade para usuário:', { matricula_usuario, funcionalidade_id })
    const { data, error } = await supabase
      .from('funcionalidade_usuarios')
      .insert({
        matricula_usuario,
        funcionalidade_id
      })
      .select()
      .single()

    console.log('Resultado da inserção:', { data, error })
    
    if (error) {
      console.error('Erro na inserção:', error)
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
    console.error('Erro na API de funcionalidades do usuário:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Remover acesso a uma funcionalidade
export async function DELETE(request: NextRequest) {
  try {
    const { error: authError } = await verifyAuth(request)
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 })
    }

    const body = await request.json()
    console.log('DELETE Body recebido:', JSON.stringify(body, null, 2))
    const { matricula_usuario, funcionalidade_id } = body;
    console.log('Parâmetros extraídos:', { matricula_usuario, funcionalidade_id })

    if (!matricula_usuario || !funcionalidade_id) {
      console.log('Erro DELETE: Parâmetros obrigatórios ausentes')
      return NextResponse.json(
        { success: false, error: 'Matrícula do usuário e ID da funcionalidade são obrigatórios' },
        { status: 400 }
      )
    }

    // Remover acesso à funcionalidade
    console.log('Removendo funcionalidade para usuário:', { matricula_usuario, funcionalidade_id })
    const { error } = await supabase
      .from('funcionalidade_usuarios')
      .delete()
      .eq('matricula_usuario', matricula_usuario)
      .eq('funcionalidade_id', funcionalidade_id);

    console.log('Resultado da remoção:', { error })
    
    if (error) {
      console.error('Erro na remoção:', error)
      return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
    }

    return NextResponse.json({
      success: true,
      message: 'Acesso à funcionalidade removido com sucesso'
    })

  } catch (error) {
    console.error('Erro na API de funcionalidades do usuário:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
