import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Função para verificar o token JWT
function verifyToken(token: string): { contrato_raiz: string; matricula: string } | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as { contrato_raiz: string; matricula: string }
  } catch {
    return null
  }
}

// GET - Listar tipos de interação
export async function GET(request: NextRequest) {
  try {
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
      .from('interacao_tipos')
      .select('id, tipo, contrato_id, created_at, updated_at')
      .eq('contrato_id', contratoFiltro)
      .order('tipo')

    if (search) {
      query = query.ilike('tipo', `%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar tipos:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar tipos' },
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

// POST - Criar novo tipo de interação
export async function POST(request: NextRequest) {
  try {
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
    const { tipo } = body

    if (!tipo) {
      return NextResponse.json(
        { error: 'Tipo é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se já existe para este contrato
    const { data: existing } = await supabase
      .from('interacao_tipos')
      .select('id')
      .eq('tipo', tipo)
      .eq('contrato_id', decoded.contrato_raiz)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Tipo já existe' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('interacao_tipos')
      .insert({ 
        tipo, 
        contrato_id: decoded.contrato_raiz 
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar tipo:', error)
      return NextResponse.json(
        { error: 'Erro ao criar tipo' },
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

// PUT - Atualizar tipo de interação
export async function PUT(request: NextRequest) {
  try {
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
    const { id, tipo } = body

    if (!id || !tipo) {
      return NextResponse.json(
        { error: 'ID e tipo são obrigatórios' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('interacao_tipos')
      .update({ tipo })
      .eq('id', id)
      .eq('contrato_id', decoded.contrato_raiz)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar tipo:', error)
      return NextResponse.json(
        { error: 'Erro ao atualizar tipo' },
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

// DELETE - Deletar tipo de interação
export async function DELETE(request: NextRequest) {
  try {
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
      .from('interacao_tipos')
      .delete()
      .eq('id', id)
      .eq('contrato_id', decoded.contrato_raiz)
      .select()
      .single()

    if (error) {
      console.error('Erro ao deletar tipo:', error)
      return NextResponse.json(
        { error: 'Erro ao deletar tipo' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: { message: 'Tipo deletado com sucesso' } })
  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
