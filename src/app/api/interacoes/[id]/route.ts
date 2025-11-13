import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Buscar interação por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'ID da interação é obrigatório' }, { status: 400 })
    }

    const { data: interacao, error } = await supabase
      .from('interacoes')
      .select(`
        *,
        tipo:interacao_tipos(id, tipo),
        unidade:interacao_unidades(id, unidade),
        area:interacao_areas(id, area),
        classificacao:interacao_classificacoes(id, classificacao),
        violacao:interacao_violacoes(id, violacao),
        grande_risco:interacao_grandes_riscos(id, grandes_riscos),
        local_interacao:interacao_local_instalacao(id, local_instalacao),
        colaborador:usuarios!interacoes_matricula_colaborador_fkey(matricula, nome, email, funcao),
        coordenador:usuarios!interacoes_matricula_coordenador_fkey(matricula, nome, email, funcao),
        supervisor:usuarios!interacoes_matricula_supervisor_fkey(matricula, nome, email, funcao),
        local:locais(id, local, contrato)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Interação não encontrada' }, { status: 404 })
      }
      console.error('Erro ao buscar interação:', error)
      return NextResponse.json({ error: 'Erro ao buscar interação' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      interacao
    })
  } catch (error) {
    console.error('Erro na API de interação por ID:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// PUT - Atualizar interação
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const { id } = await params
    const interacaoData = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'ID da interação é obrigatório' }, { status: 400 })
    }

    // Validar valores dos enums se fornecidos
    if (interacaoData.metodo_coach && !['Sim', 'Não'].includes(interacaoData.metodo_coach)) {
      return NextResponse.json({ 
        error: 'Método coach deve ser "Sim" ou "Não"' 
      }, { status: 400 })
    }

    if (interacaoData.houve_desvios && !['Sim', 'Não'].includes(interacaoData.houve_desvios)) {
      return NextResponse.json({ 
        error: 'Houve desvios deve ser "Sim" ou "Não"' 
      }, { status: 400 })
    }

    if (interacaoData.evento && !['ROTINA', 'PARADA'].includes(interacaoData.evento)) {
      return NextResponse.json({ 
        error: 'Evento deve ser "ROTINA" ou "PARADA"' 
      }, { status: 400 })
    }

    if (interacaoData.instante && !['N/A', 'HORA SEGURA', 'INSPEÇÃO DE SEGURANÇA'].includes(interacaoData.instante)) {
      return NextResponse.json({ 
        error: 'Instante deve ser "N/A", "HORA SEGURA" ou "INSPEÇÃO DE SEGURANÇA"' 
      }, { status: 400 })
    }

    // Verificar se a interação existe
    const { error: checkError } = await supabase
      .from('interacoes')
      .select('id')
      .eq('id', id)
      .single()

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Interação não encontrada' }, { status: 404 })
      }
      console.error('Erro ao verificar interação:', checkError)
      return NextResponse.json({ error: 'Erro ao verificar interação' }, { status: 500 })
    }

    // Atualizar interação
    const { data, error } = await supabase
      .from('interacoes')
      .update(interacaoData)
      .eq('id', id)
      .select(`
        *,
        tipo:interacao_tipos(id, tipo),
        unidade:interacao_unidades(id, unidade),
        area:interacao_areas(id, area),
        classificacao:interacao_classificacoes(id, classificacao),
        violacao:interacao_violacoes(id, violacao),
        grande_risco:interacao_grandes_riscos(id, grandes_riscos),
        local_interacao:interacao_local_instalacao(id, local_instalacao),
        colaborador:usuarios!interacoes_matricula_colaborador_fkey(matricula, nome, email, funcao),
        coordenador:usuarios!interacoes_matricula_coordenador_fkey(matricula, nome, email, funcao),
        supervisor:usuarios!interacoes_matricula_supervisor_fkey(matricula, nome, email, funcao),
        local:locais(id, local, contrato)
      `)
      .single()

    if (error) {
      console.error('Erro ao atualizar interação:', error)
      return NextResponse.json({ error: 'Erro ao atualizar interação' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      interacao: data,
      message: 'Interação atualizada com sucesso'
    })
  } catch (error) {
    console.error('Erro na API de atualização de interação:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE - Excluir interação
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    // Verificar se é admin ou editor
    if (!authResult.user || (authResult.user.role !== 'Admin' && authResult.user.role !== 'Editor')) {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores e editores podem excluir interações.' }, { status: 403 })
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'ID da interação é obrigatório' }, { status: 400 })
    }

    // Verificar se a interação existe
    const { error: checkError } = await supabase
      .from('interacoes')
      .select('id')
      .eq('id', id)
      .single()

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Interação não encontrada' }, { status: 404 })
      }
      console.error('Erro ao verificar interação:', checkError)
      return NextResponse.json({ error: 'Erro ao verificar interação' }, { status: 500 })
    }

    // Excluir interação
    const { error } = await supabase
      .from('interacoes')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao excluir interação:', error)
      return NextResponse.json({ error: 'Erro ao excluir interação' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Interação excluída com sucesso'
    })
  } catch (error) {
    console.error('Erro na API de exclusão de interação:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}