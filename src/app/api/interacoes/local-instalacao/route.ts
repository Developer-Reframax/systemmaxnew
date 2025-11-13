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
      .from('interacao_local_instalacao')
      .select('id, local_instalacao, contrato_id, created_at, updated_at')
      .eq('contrato_id', contratoFiltro)
      .order('local_instalacao')

    if (search) {
      query = query.ilike('local_instalacao', `%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar locais de instalação:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar locais de instalação' },
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
    const { local_instalacao } = body

    if (!local_instalacao) {
      return NextResponse.json(
        { error: 'Local de instalação é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se já existe para este contrato
    const { data: existing } = await supabase
      .from('interacao_local_instalacao')
      .select('id')
      .eq('local_instalacao', local_instalacao)
      .eq('contrato_id', decoded.contrato_raiz)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Local de instalação já existe' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('interacao_local_instalacao')
      .insert({ 
        local_instalacao, 
        contrato_id: decoded.contrato_raiz 
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar local de instalação:', error)
      return NextResponse.json(
        { error: 'Erro ao criar local de instalação' },
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
    const { id, local_instalacao } = body

    if (!id || !local_instalacao) {
      return NextResponse.json(
        { error: 'ID e local de instalação são obrigatórios' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('interacao_local_instalacao')
      .update({ local_instalacao })
      .eq('id', id)
      .eq('contrato_id', decoded.contrato_raiz)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar local de instalação:', error)
      return NextResponse.json(
        { error: 'Erro ao atualizar local de instalação' },
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
      .from('interacao_local_instalacao')
      .delete()
      .eq('id', id)
      .eq('contrato_id', decoded.contrato_raiz)
      .select()
      .single()

    if (error) {
      console.error('Erro ao deletar local de instalação:', error)
      return NextResponse.json(
        { error: 'Erro ao deletar local de instalação' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: { message: 'Local de instalação deletado com sucesso' } })
  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
