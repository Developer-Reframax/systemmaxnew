import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Listar OACs com paginação e filtros
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const observador = searchParams.get('observador')
    const local = searchParams.get('local')
    const equipe = searchParams.get('equipe')
    const contrato = searchParams.get('contrato')
    const dataInicio = searchParams.get('data_inicio')
    const dataFim = searchParams.get('data_fim')
    const search = searchParams.get('search') // Busca por local ou equipe
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    let query = supabase
      .from('oacs')
      .select(`
        *,
        observador_info:observador(matricula, nome, email),
        desvios:desvios_oac(
          id,
          quantidade_desvios,
          descricao_desvio,
          subcategoria:item_desvio(
            id,
            subcategoria,
            categoria:categoria_pai(
              id,
              categoria
            )
          )
        ),
        plano_acao:planos_acao_oac(
          id,
          acao_recomendada,
          reconhecimento,
          condicao_abaixo_padrao,
          compromisso_formado
        )
      `)
      .order('datahora_inicio', { ascending: false })
      .range(offset, offset + limit - 1)

    let countQuery = supabase
      .from('oacs')
      .select('*', { count: 'exact', head: true })

    // Aplicar filtros
    if (observador) {
      query = query.eq('observador', observador)
      countQuery = countQuery.eq('observador', observador)
    }
    if (local) {
      query = query.ilike('local', `%${local}%`)
      countQuery = countQuery.ilike('local', `%${local}%`)
    }
    if (equipe) {
      query = query.ilike('equipe', `%${equipe}%`)
      countQuery = countQuery.ilike('equipe', `%${equipe}%`)
    }
    if (contrato) {
      query = query.eq('contrato', contrato)
      countQuery = countQuery.eq('contrato', contrato)
    }
    if (dataInicio) {
      query = query.gte('datahora_inicio', dataInicio)
      countQuery = countQuery.gte('datahora_inicio', dataInicio)
    }
    if (dataFim) {
      query = query.lte('datahora_inicio', dataFim)
      countQuery = countQuery.lte('datahora_inicio', dataFim)
    }
    if (search) {
      query = query.or(`local.ilike.%${search}%,equipe.ilike.%${search}%`)
      countQuery = countQuery.or(`local.ilike.%${search}%,equipe.ilike.%${search}%`)
    }

    const [{ data: oacs, error }, { count, error: countError }] = await Promise.all([
      query,
      countQuery
    ])

    if (error || countError) {
      console.error('Erro ao buscar OACs:', error || countError)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar OACs' },
        { status: 500 }
      )
    }

    // Enriquecer dados com informações de local e equipe
    let enrichedOacs = oacs || []
    if (enrichedOacs.length > 0) {
      // Buscar informações de locais
      const { data: locaisData } = await supabase
        .from('locais')
        .select('id, local')
      
      // Buscar informações de equipes
      const { data: equipesData } = await supabase
        .from('equipes')
        .select('id, equipe')

      // Criar mapas para lookup rápido usando o ID como chave
      const locaisMap = new Map(locaisData?.map(l => [l.id, { id: l.id, local: l.local }]) || [])
      const equipesMap = new Map(equipesData?.map(e => [e.id, { id: e.id, equipe: e.equipe }]) || [])

      // Enriquecer cada OAC
      enrichedOacs = enrichedOacs.map(oac => ({
        ...oac,
        local_info: locaisMap.get(parseInt(oac.local)) || null,
        equipe_info: equipesMap.get(oac.equipe) || null
      }))
    }

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      success: true,
      data: enrichedOacs,
      total: count || 0,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages
      }
    })

  } catch (error) {
    console.error('OACs GET API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar nova OAC
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    const body = await request.json()
    const {
      local,
      datahora_inicio,
      tempo_observacao,
      qtd_pessoas_local,
      qtd_pessoas_abordadas,
      desvios = [],
      plano_acao = {}
    } = body

    // Obter equipe e contrato do usuário autenticado
    const equipe = authResult.user?.equipe_id
    const contrato = authResult.user?.contrato_raiz

    // Validar campos obrigatórios (apenas os enviados no payload)
    if (!local || !datahora_inicio || !tempo_observacao || 
        qtd_pessoas_local === undefined || qtd_pessoas_abordadas === undefined) {
      return NextResponse.json(
        { success: false, message: 'Todos os campos obrigatórios devem ser preenchidos' },
        { status: 400 }
      )
    }

    // Validar se os dados do usuário estão disponíveis
    if (!equipe || !contrato) {
      return NextResponse.json(
        { success: false, message: 'Dados do usuário incompletos. Equipe ou contrato não encontrados.' },
        { status: 400 }
      )
    }

    // Validar números positivos
    if (tempo_observacao <= 0 || qtd_pessoas_local < 0 || qtd_pessoas_abordadas < 0) {
      return NextResponse.json(
        { success: false, message: 'Valores numéricos devem ser válidos' },
        { status: 400 }
      )
    }

    // Validar se qtd_pessoas_abordadas não é maior que qtd_pessoas_local
    if (qtd_pessoas_abordadas > qtd_pessoas_local) {
      return NextResponse.json(
        { success: false, message: 'Quantidade de pessoas abordadas não pode ser maior que pessoas no local' },
        { status: 400 }
      )
    }

    // Criar a OAC principal
    const { data: novaOac, error: oacError } = await supabase
      .from('oacs')
      .insert({
        equipe,
        local,
        datahora_inicio,
        tempo_observacao,
        observador: authResult.user?.matricula,
        qtd_pessoas_local,
        qtd_pessoas_abordadas,
        contrato
      })
      .select()
      .single()

    if (oacError) {
      console.error('Erro ao criar OAC:', oacError)
      return NextResponse.json(
        { success: false, message: 'Erro ao criar OAC' },
        { status: 500 }
      )
    }

    const oacId = novaOac.id

    // Criar desvios se existirem
    if (desvios.length > 0) {
      const desviosData = desvios.map((desvio: { item_desvio: string; quantidade_desvios?: number; descricao_desvio?: string }) => ({
        oac_id: oacId,
        item_desvio: desvio.item_desvio,
        quantidade_desvios: desvio.quantidade_desvios || 0,
        descricao_desvio: desvio.descricao_desvio || null
      }))

      const { error: desviosError } = await supabase
        .from('desvios_oac')
        .insert(desviosData)

      if (desviosError) {
        console.error('Erro ao criar desvios OAC:', desviosError)
        // Não falha a criação da OAC, apenas registra o erro
      }
    }

    // Criar plano de ação se existir
    if (Object.keys(plano_acao).length > 0) {
      const { error: planoError } = await supabase
        .from('planos_acao_oac')
        .insert({
          oac_id: oacId,
          acao_recomendada: plano_acao.acao_recomendada || null,
          reconhecimento: plano_acao.reconhecimento || null,
          condicao_abaixo_padrao: plano_acao.condicao_abaixo_padrao || null,
          compromisso_formado: plano_acao.compromisso_formado || null
        })

      if (planoError) {
        console.error('Erro ao criar plano de ação OAC:', planoError)
        // Não falha a criação da OAC, apenas registra o erro
      }
    }

    // Buscar a OAC criada com todos os relacionamentos
    const { data: oacCompleta, error: fetchError } = await supabase
      .from('oacs')
      .select(`
        *,
        observador_info:observador(matricula, nome, email),
        desvios:desvios_oac(
          id,
          quantidade_desvios,
          descricao_desvio,
          subcategoria:item_desvio(
            id,
            subcategoria,
            categoria:categoria_pai(
              id,
              categoria
            )
          )
        ),
        plano_acao:planos_acao_oac(
          id,
          acao_recomendada,
          reconhecimento,
          condicao_abaixo_padrao,
          compromisso_formado
        )
      `)
      .eq('id', oacId)
      .single()

    if (fetchError) {
      console.error('Erro ao buscar OAC criada:', fetchError)
      // Retorna a OAC básica se não conseguir buscar com relacionamentos
      return NextResponse.json({
        success: true,
        data: novaOac,
        message: 'OAC criada com sucesso'
      }, { status: 201 })
    }

    return NextResponse.json({
      success: true,
      data: oacCompleta,
      message: 'OAC criada com sucesso'
    }, { status: 201 })

  } catch (error) {
    console.error('OACs POST API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
