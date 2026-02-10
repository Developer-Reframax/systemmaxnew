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

const AUTH_ERROR = { error: 'Token de acesso requerido' }

// GET /api/interacoes/grandes-riscos - Listar grandes riscos
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json(AUTH_ERROR, { status: 401 })
    }
    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Token invalido ou expirado' }, { status: 401 })
    }

    if (!token || !user.contrato_raiz) {
      return NextResponse.json(
        { error: 'Token inválido ou contrato_raiz não encontrado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const contratoId = searchParams.get('contrato_id')

    // Usar contrato_id da query string se fornecido, senão usar contrato_raiz do token
    const contratoFiltro = contratoId || user.contrato_raiz

    let query = supabase
      .from('interacao_grandes_riscos')
      .select('id, grandes_riscos, contrato_id, created_at, updated_at')
      .eq('contrato_id', contratoFiltro)
      .order('grandes_riscos')

    if (search) {
      query = query.ilike('grandes_riscos', `%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar grandes riscos:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar grandes riscos' },
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

// POST /api/interacoes/grandes-riscos - Criar novo grande risco
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
    const { grandes_riscos } = body

    if (!grandes_riscos) {
      return NextResponse.json(
        { error: 'Grande risco é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se já existe para este contrato
    const { data: existing } = await supabase
      .from('interacao_grandes_riscos')
      .select('id')
      .eq('grandes_riscos', grandes_riscos)
      .eq('contrato_id', decoded.contrato_raiz)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Grande risco já existe' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('interacao_grandes_riscos')
      .insert({
        grandes_riscos: grandes_riscos,
        contrato_id: decoded.contrato_raiz
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar grande risco:', error)
      return NextResponse.json(
        { error: 'Erro ao criar grande risco' },
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

// PUT /api/interacoes/grandes-riscos - Atualizar grande risco
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
    const { id, grandes_riscos } = body

    if (!id || !grandes_riscos) {
      return NextResponse.json(
        { error: 'ID e grande risco são obrigatórios' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('interacao_grandes_riscos')
      .update({ grandes_riscos })
      .eq('id', id)
      .eq('contrato_id', decoded.contrato_raiz)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar grande risco:', error)
      return NextResponse.json(
        { error: 'Erro ao atualizar grande risco' },
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

// DELETE /api/interacoes/grandes-riscos - Deletar grande risco
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
      .from('interacao_grandes_riscos')
      .delete()
      .eq('id', id)
      .eq('contrato_id', decoded.contrato_raiz)
      .select()
      .single()

    if (error) {
      console.error('Erro ao deletar grande risco:', error)
      return NextResponse.json(
        { error: 'Erro ao deletar grande risco' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: { message: 'Grande risco deletado com sucesso' } })
  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
