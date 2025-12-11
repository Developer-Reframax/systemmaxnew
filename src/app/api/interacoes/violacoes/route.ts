import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/auth'

// Configuração do Supabase com Service Role Key para bypass do RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!


const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})


// GET /api/interacoes/violacoes - Listar violações
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Token de acesso requerido' }, { status: 401 })
    }
    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Token invalido ou expirado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const contratoId = searchParams.get('contrato_id')

    // Usar contrato_id da query string se fornecido, senão usar contrato_raiz do token
    const contratoFiltro = contratoId || user.contrato_raiz

    let query = supabase
      .from('interacao_violacoes')
      .select('id, violacao, contrato_id, created_at, updated_at')
      .eq('contrato_id', contratoFiltro)
      .order('violacao')

    if (search) {
      query = query.ilike('violacao', `%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar violações:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar violações' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/interacoes/violacoes - Criar nova violação
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autorização necessário' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    if (!decoded || !decoded.contrato_raiz) {
      return NextResponse.json(
        { error: 'Token inválido ou contrato_raiz não encontrado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { violacao } = body

    if (!violacao) {
      return NextResponse.json(
        { error: 'Violação é obrigatória' },
        { status: 400 }
      )
    }

    // Verificar se já existe para este contrato
    const { data: existing } = await supabase
      .from('interacao_violacoes')
      .select('id')
      .eq('violacao', violacao)
      .eq('contrato_id', decoded.contrato_raiz)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Violação já existe' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('interacao_violacoes')
      .insert({
        violacao,
        contrato_id: decoded.contrato_raiz
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar violação:', error)
      return NextResponse.json(
        { error: 'Erro ao criar violação' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/interacoes/violacoes - Atualizar violação
export async function PUT(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autorização necessário' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    if (!decoded || !decoded.contrato_raiz) {
      return NextResponse.json(
        { error: 'Token inválido ou contrato_raiz não encontrado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id, violacao } = body

    if (!id || !violacao) {
      return NextResponse.json(
        { error: 'ID e violação são obrigatórios' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('interacao_violacoes')
      .update({ violacao })
      .eq('id', id)
      .eq('contrato_id', decoded.contrato_raiz)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar violação:', error)
      return NextResponse.json(
        { error: 'Erro ao atualizar violação' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/interacoes/violacoes - Deletar violação
export async function DELETE(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autorização necessário' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    if (!decoded || !decoded.contrato_raiz) {
      return NextResponse.json(
        { error: 'Token inválido ou contrato_raiz não encontrado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID é obrigatório' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('interacao_violacoes')
      .delete()
      .eq('id', id)
      .eq('contrato_id', decoded.contrato_raiz)
      .select()
      .single()

    if (error) {
      console.error('Erro ao deletar violação:', error)
      return NextResponse.json(
        { error: 'Erro ao deletar violação' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: { message: 'Violação deletada com sucesso' } })
  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
