import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'
import { InteracaoFiltros } from '@/lib/types/interacoes'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Buscar interações com filtros e paginação
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    // Extrair parâmetros de filtro
    const filtros: InteracaoFiltros = {
      data_inicio: searchParams.get('data_inicio') || undefined,
      data_fim: searchParams.get('data_fim') || undefined,
      tipo_id: searchParams.get('tipo_id') || undefined,
      unidade_id: searchParams.get('unidade_id') || undefined,
      area_id: searchParams.get('area_id') || undefined,
      classificacao_id: searchParams.get('classificacao_id') || undefined,
      matricula_colaborador: authResult.user?.matricula || undefined,
      houve_desvios: searchParams.get('houve_desvios') as 'Sim' | 'Não' || undefined,
      evento: searchParams.get('evento') as 'ROTINA' | 'PARADA' || undefined,
      metodo_coach: searchParams.get('metodo_coach') as 'Sim' | 'Não' || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10')
    }

    // Construir query base
    let query = supabase
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

    // Aplicar filtros
    if (filtros.data_inicio) {
      query = query.gte('data', filtros.data_inicio)
    }
    if (filtros.data_fim) {
      query = query.lte('data', filtros.data_fim)
    }
    if (filtros.tipo_id) {
      query = query.eq('tipo_id', filtros.tipo_id)
    }
    if (filtros.unidade_id) {
      query = query.eq('unidade_id', filtros.unidade_id)
    }
    if (filtros.area_id) {
      query = query.eq('area_id', filtros.area_id)
    }
    if (filtros.classificacao_id) {
      query = query.eq('classificacao_id', filtros.classificacao_id)
    }
    if (filtros.matricula_colaborador) {
      query = query.eq('matricula_colaborador', filtros.matricula_colaborador)
    }
    if (filtros.houve_desvios) {
      query = query.eq('houve_desvios', filtros.houve_desvios)
    }
    if (filtros.evento) {
      query = query.eq('evento', filtros.evento)
    }
    if (filtros.metodo_coach) {
      query = query.eq('metodo_coach', filtros.metodo_coach)
    }

    // Aplicar paginação
    const from = ((filtros.page || 1) - 1) * (filtros.limit || 10)
    const to = from + (filtros.limit || 10) - 1

    // Executar query com paginação
    const { data: interacoes, error, count } = await query
      .range(from, to)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar interações:', error)
      return NextResponse.json({ error: 'Erro ao buscar interações' }, { status: 500 })
    }

    // Calcular informações de paginação
    const totalPages = Math.ceil((count || 0) / (filtros.limit || 10))
    const hasNextPage = (filtros.page || 1) < totalPages
    const hasPrevPage = (filtros.page || 1) > 1

    return NextResponse.json({
      success: true,
      interacoes,
      pagination: {
        currentPage: filtros.page || 1,
        totalPages,
        totalItems: count || 0,
        itemsPerPage: filtros.limit || 10,
        hasNextPage,
        hasPrevPage
      }
    })
  } catch (error) {
    console.error('Erro na API de interações:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST - Criar nova interação
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const interacaoData = await request.json()

    // Validar campos obrigatórios
    const camposObrigatorios = [
      'tipo_id', 'metodo_coach', 'data', 'unidade_id', 'empresa', 'area_id',
      'local_id', 'houve_desvios', 'descricao', 'acao', 'evento', 'instante',
      'matricula_colaborador', 'classificacao_id', 'local_interacao_id',
      'matricula_coordenador', 'matricula_supervisor'
    ]

    for (const campo of camposObrigatorios) {
      if (!interacaoData[campo] && interacaoData[campo] !== 0) {
        return NextResponse.json({ 
          error: `Campo obrigatório não informado: ${campo}` 
        }, { status: 400 })
      }
    }

    // Validar valores dos enums
    if (!['Sim', 'Não'].includes(interacaoData.metodo_coach)) {
      return NextResponse.json({ 
        error: 'Método coach deve ser "Sim" ou "Não"' 
      }, { status: 400 })
    }

    if (!['Sim', 'Não'].includes(interacaoData.houve_desvios)) {
      return NextResponse.json({ 
        error: 'Houve desvios deve ser "Sim" ou "Não"' 
      }, { status: 400 })
    }

    if (!['ROTINA', 'PARADA'].includes(interacaoData.evento)) {
      return NextResponse.json({ 
        error: 'Evento deve ser "ROTINA" ou "PARADA"' 
      }, { status: 400 })
    }

    if (!['N/A', 'HORA SEGURA', 'INSPEÇÃO DE SEGURANÇA'].includes(interacaoData.instante)) {
      return NextResponse.json({ 
        error: 'Instante deve ser "N/A", "HORA SEGURA" ou "INSPEÇÃO DE SEGURANÇA"' 
      }, { status: 400 })
    }

    // Inserir interação
    const { data, error } = await supabase
      .from('interacoes')
      .insert(interacaoData)
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
      console.error('Erro ao criar interação:', error)
      return NextResponse.json({ error: 'Erro ao criar interação' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      interacao: data,
      message: 'Interação criada com sucesso'
    }, { status: 201 })
  } catch (error) {
    console.error('Erro na API de interações:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
