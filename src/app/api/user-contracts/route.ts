import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)


// GET - Buscar contratos de um usuário específico
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Token de acesso requerido' }, { status: 401 })
    }
    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Token invalido ou expirado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const matricula = searchParams.get('matricula')

    if (!matricula) {
      return NextResponse.json({ error: 'Matrícula do usuário é obrigatória' }, { status: 400 })
    }

    // Buscar contratos do usuário com informações do contrato
    const { data: userContracts, error } = await supabase
      .from('usuario_contratos')
      .select(`
        id,
        matricula_usuario,
        codigo_contrato,
        created_at,
        contratos (
          codigo,
          nome,
          local,
          status
        )
      `)
      .eq('matricula_usuario', matricula)

    if (error) {
      console.error('Erro ao buscar contratos do usuário:', error)
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }

    return NextResponse.json({ userContracts })
  } catch (error) {
    console.error('Erro no GET /api/user-contracts:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST - Adicionar acesso de usuário a contrato
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Token de acesso requerido' }, { status: 401 })
    }
    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Token invalido ou expirado' }, { status: 401 })
    }

    const { matricula, codigo } = await request.json()

    if (!matricula || !codigo) {
      return NextResponse.json({ error: 'Matrícula do usuário e código do contrato são obrigatórios' }, { status: 400 })
    }

    // Verificar se o usuário existe
    const { data: userExists } = await supabase
      .from('usuarios')
      .select('matricula')
      .eq('matricula', matricula)
      .single()

    if (!userExists) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Verificar se o contrato existe
    const { data: contractExists } = await supabase
      .from('contratos')
      .select('codigo')
      .eq('codigo', codigo)
      .single()

    if (!contractExists) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
    }

    // Verificar se o relacionamento já existe
    const { data: existingRelation } = await supabase
      .from('usuario_contratos')
      .select('id')
      .eq('matricula_usuario', matricula)
      .eq('codigo_contrato', codigo)
      .single()

    if (existingRelation) {
      return NextResponse.json({ error: 'Usuário já tem acesso a este contrato' }, { status: 409 })
    }

    // Criar o relacionamento
    const { data: newRelation, error } = await supabase
      .from('usuario_contratos')
      .insert({
        matricula_usuario: matricula,
        codigo_contrato: codigo
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar relacionamento usuário-contrato:', error)
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Acesso ao contrato adicionado com sucesso',
      relation: newRelation 
    }, { status: 201 })
  } catch (error) {
    console.error('Erro no POST /api/user-contracts:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE - Remover acesso de usuário a contrato
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Token de acesso requerido' }, { status: 401 })
    }
    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Token invalido ou expirado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const matricula = searchParams.get('matricula')
    const codigo = searchParams.get('codigo')

    if (!matricula || !codigo) {
      return NextResponse.json({ error: 'Matrícula do usuário e código do contrato são obrigatórios' }, { status: 400 })
    }

    // Verificar se o relacionamento existe
    const { data: existingRelation } = await supabase
      .from('usuario_contratos')
      .select('id')
      .eq('matricula_usuario', matricula)
      .eq('codigo_contrato', codigo)
      .single()

    if (!existingRelation) {
      return NextResponse.json({ error: 'Relacionamento não encontrado' }, { status: 404 })
    }

    // Remover o relacionamento
    const { error } = await supabase
      .from('usuario_contratos')
      .delete()
      .eq('matricula_usuario', matricula)
      .eq('codigo_contrato', codigo)

    if (error) {
      console.error('Erro ao remover relacionamento usuário-contrato:', error)
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Acesso ao contrato removido com sucesso' 
    })
  } catch (error) {
    console.error('Erro no DELETE /api/user-contracts:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
