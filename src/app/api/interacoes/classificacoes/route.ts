import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

// Configuração do Supabase com Service Role Key para bypass do RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const JWT_SECRET = process.env.JWT_SECRET!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Função para verificar o token JWT e obter o usuário
function verifyToken(token: string): { contrato_raiz: string; matricula: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { contrato_raiz: string; matricula: string }
  } catch {
    return null
  }
}

// GET /api/interacoes/classificacoes - Listar classificações
export async function GET(request: NextRequest) {
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
    const search = searchParams.get('search')
    const contratoId = searchParams.get('contrato_id')

    // Usar contrato_id da query string se fornecido, senão usar contrato_raiz do token
    const contratoFiltro = contratoId || decoded.contrato_raiz

    let query = supabase
      .from('interacao_classificacoes')
      .select('id, classificacao, contrato_id, created_at, updated_at')
      .eq('contrato_id', contratoFiltro)
      .order('classificacao')

    if (search) {
      query = query.ilike('classificacao', `%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar classificações:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar classificações' },
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

// POST /api/interacoes/classificacoes - Criar nova classificação
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
    const { classificacao } = body

    if (!classificacao) {
      return NextResponse.json(
        { error: 'Classificação é obrigatória' },
        { status: 400 }
      )
    }

    // Verificar se já existe para este contrato
    const { data: existing } = await supabase
      .from('interacao_classificacoes')
      .select('id')
      .eq('classificacao', classificacao)
      .eq('contrato_id', decoded.contrato_raiz)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Classificação já existe' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('interacao_classificacoes')
      .insert({ 
        classificacao, 
        contrato_id: decoded.contrato_raiz 
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar classificação:', error)
      return NextResponse.json(
        { error: 'Erro ao criar classificação' },
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

// PUT /api/interacoes/classificacoes - Atualizar classificação
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
    const { id, classificacao } = body

    if (!id || !classificacao) {
      return NextResponse.json(
        { error: 'ID e classificação são obrigatórios' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('interacao_classificacoes')
      .update({ classificacao })
      .eq('id', id)
      .eq('contrato_id', decoded.contrato_raiz)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar classificação:', error)
      return NextResponse.json(
        { error: 'Erro ao atualizar classificação' },
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

// DELETE /api/interacoes/classificacoes - Deletar classificação
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
      .from('interacao_classificacoes')
      .delete()
      .eq('id', id)
      .eq('contrato_id', decoded.contrato_raiz)
      .select()
      .single()

    if (error) {
      console.error('Erro ao deletar classificação:', error)
      return NextResponse.json(
        { error: 'Erro ao deletar classificação' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: { message: 'Classificação deletada com sucesso' } })
  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
