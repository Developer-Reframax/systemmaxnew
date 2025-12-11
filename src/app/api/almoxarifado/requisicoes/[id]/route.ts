import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const AUTH_ERROR = { error: 'Token de acesso requerido' }

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json(AUTH_ERROR, { status: 401 })
    }
    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Token invalido ou expirado' }, { status: 401 })
    }

    const { id } = await params

    const { data: requisicao, error } = await supabase
      .from('requisicoes')
      .select(`
        *,
        solicitante:usuarios!matricula_solicitante(matricula, nome),
        aprovador:usuarios!matricula_aprovador(matricula, nome),
        entregador:usuarios!matricula_entregador(matricula, nome),
        itens:requisicoes_itens(
          id,
          quantidade_solicitada,
          quantidade_entregue,
          preco_unitario,
          subtotal,
          item:itens_almoxarifado(id, nome, categoria, imagem_url, estoque_atual)
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if ((error as { code?: string }).code === 'PGRST116') {
        return NextResponse.json({ error: 'Requisicao nao encontrada' }, { status: 404 })
      }
      console.error('Erro ao buscar requisicao:', error)
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: requisicao
    })
  } catch (error) {
    console.error('Erro na API de requisicao:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json(AUTH_ERROR, { status: 401 })
    }
    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Token invalido ou expirado' }, { status: 401 })
    }

    const body = await request.json()
    const { observacoes } = body
    const { id } = await params

    const { data: requisicaoExistente, error: fetchError } = await supabase
      .from('requisicoes')
      .select('id, status, matricula_solicitante')
      .eq('id', id)
      .single()

    if (fetchError) {
      if ((fetchError as { code?: string }).code === 'PGRST116') {
        return NextResponse.json({ error: 'Requisicao nao encontrada' }, { status: 404 })
      }
      console.error('Erro ao buscar requisicao:', fetchError)
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }

    if (requisicaoExistente.matricula_solicitante !== user.matricula) {
      return NextResponse.json(
        { error: 'Você só pode editar suas próprias requisicoes' },
        { status: 403 }
      )
    }

    if (requisicaoExistente.status !== 'pendente') {
      return NextResponse.json(
        { error: 'Apenas requisicoes pendentes podem ser editadas' },
        { status: 400 }
      )
    }

    const { data: requisicaoAtualizada, error: updateError } = await supabase
      .from('requisicoes')
      .update({
        observacoes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        solicitante:usuarios!matricula_solicitante(matricula, nome),
        itens:requisicoes_itens(
          id,
          quantidade_solicitada,
          preco_unitario,
          subtotal,
          item:itens_almoxarifado(id, nome, categoria, imagem_url)
        )
      `)
      .single()

    if (updateError) {
      console.error('Erro ao atualizar requisicao:', updateError)
      return NextResponse.json({ error: 'Erro ao atualizar requisicao' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: requisicaoAtualizada
    })
  } catch (error) {
    console.error('Erro na API de atualizacao de requisicao:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

