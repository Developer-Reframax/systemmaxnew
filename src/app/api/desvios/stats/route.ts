import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Estatísticas para dashboard
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
    const contrato = searchParams.get('contrato')
    const periodo = searchParams.get('periodo') || '30' // dias
    const tipo = searchParams.get('tipo') // 'geral' ou 'meus'

    // Calcular data de início baseada no período
    const dataInicio = new Date()
    dataInicio.setDate(dataInicio.getDate() - parseInt(periodo))

    // Função helper para criar query base
    const createBaseQuery = () => {
      let query = supabase.from('desvios').select('*', { count: 'exact', head: true })
      if (contrato) {
        query = query.eq('contrato', contrato)
      }
      if (tipo === 'meus') {
        query = query.eq('matricula_user', authResult.user?.matricula)
      }
      return query
    }

    // 1. Indicadores gerais
    const [totalResult, novosPeriodoResult, aguardandoResult, emAndamentoResult, resolvidosResult, vencidosResult] = await Promise.all([
      // Total de desvios
      createBaseQuery(),
      
      // Novos no período
      createBaseQuery()
        .gte('created_at', dataInicio.toISOString()),
      
      // Aguardando avaliação
      createBaseQuery()
        .eq('status', 'Aguardando Avaliação'),
      
      // Em andamento
      createBaseQuery()
        .eq('status', 'Em Andamento'),
      
      // Resolvidos
      createBaseQuery()
        .eq('status', 'Concluído'),
      
      // Vencidos (Em Andamento com data_limite passada)
      createBaseQuery()
        .eq('status', 'Em Andamento')
        .lt('data_limite', new Date().toISOString())
    ])

    // 2. Distribuição por status
    let statusQuery = supabase
      .from('desvios')
      .select('status')
    
    if (contrato) statusQuery = statusQuery.eq('contrato', contrato)
    if (tipo === 'meus') statusQuery = statusQuery.eq('matricula_user', authResult.user?.matricula)
    
    const { data: statusData } = await statusQuery
    
    const distribuicaoStatus = statusData?.reduce((acc: Record<string, number>, item: { status: string }) => {
      acc[item.status] = (acc[item.status] || 0) + 1
      return acc
    }, {}) || {}

    // 3. Distribuição por natureza
    let naturezaQuery = supabase
      .from('desvios')
      .select(`
        natureza_id,
        natureza:natureza_id(natureza)
      `)
    
    if (contrato) naturezaQuery = naturezaQuery.eq('contrato', contrato)
    if (tipo === 'meus') naturezaQuery = naturezaQuery.eq('matricula_user', authResult.user?.matricula)
    
    const { data: naturezaData } = await naturezaQuery
    
    const distribuicaoNatureza: Record<string, number> = {}
    if (naturezaData) {
      for (const item of naturezaData) {
        const nome = (item as { natureza?: { natureza?: string } }).natureza?.natureza || 'Não informado'
        distribuicaoNatureza[nome] = (distribuicaoNatureza[nome] || 0) + 1
      }
    }

    // 4. Distribuição por tipo
    let tipoQuery = supabase
      .from('desvios')
      .select(`
        tipo_id,
        tipo:tipo_id(tipo)
      `)
    
    if (contrato) tipoQuery = tipoQuery.eq('contrato', contrato)
    if (tipo === 'meus') tipoQuery = tipoQuery.eq('matricula_user', authResult.user?.matricula)
    
    const { data: tipoData } = await tipoQuery
    
    const distribuicaoTipo: Record<string, number> = {}
    if (tipoData) {
      for (const item of tipoData) {
        const nome = (item as { tipo?: { tipo?: string } }).tipo?.tipo || 'Não informado'
        distribuicaoTipo[nome] = (distribuicaoTipo[nome] || 0) + 1
      }
    }

    // 5. Evolução temporal (últimos 30 dias)
    const diasEvolucao = 30
    const dataInicioEvolucao = new Date()
    dataInicioEvolucao.setDate(dataInicioEvolucao.getDate() - diasEvolucao)
    
    let evolucaoQuery = supabase
      .from('desvios')
      .select('created_at, status')
      .gte('created_at', dataInicioEvolucao.toISOString())
    
    if (contrato) evolucaoQuery = evolucaoQuery.eq('contrato', contrato)
    if (tipo === 'meus') evolucaoQuery = evolucaoQuery.eq('matricula_user', authResult.user?.matricula)
    
    const { data: evolucaoData } = await evolucaoQuery
    
    // Agrupar por data
    const evolucaoPorDia = evolucaoData?.reduce((acc: Record<string, { total: number; concluidos: number }>, item: { created_at: string; status: string }) => {
      const data = new Date(item.created_at).toISOString().split('T')[0]
      if (!acc[data]) {
        acc[data] = { total: 0, concluidos: 0 }
      }
      acc[data].total += 1
      if (item.status === 'Concluído') {
        acc[data].concluidos += 1
      }
      return acc
    }, {} as Record<string, { total: number; concluidos: number }>) || {}

    // 6. Top 5 responsáveis (apenas para Admin/Editor)
    interface TopResponsavel {
      responsavel: string
      count: number
    }
    let topResponsaveis: TopResponsavel[] = []
    if (['Admin', 'Editor'].includes(authResult.user?.role || '')) {
      let responsavelQuery = supabase
        .from('desvios')
        .select('responsavel')
        .not('responsavel', 'is', null)
      
      if (contrato) responsavelQuery = responsavelQuery.eq('contrato', contrato)
      
      const { data: responsavelData } = await responsavelQuery
      
      const contadorResponsaveis = responsavelData?.reduce((acc: Record<string, number>, item: { responsavel: string }) => {
        acc[item.responsavel] = (acc[item.responsavel] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}
      
      topResponsaveis = Object.entries(contadorResponsaveis)
        .sort(([,a]: [string, number], [,b]: [string, number]) => b - a)
        .slice(0, 5)
        .map(([responsavel, count]) => ({ responsavel, count: count as number }))
    }

    // 7. Tempo médio de resolução
    let tempoResolucaoQuery = supabase
      .from('desvios')
      .select('created_at, updated_at')
      .eq('status', 'Concluído')
    
    if (contrato) tempoResolucaoQuery = tempoResolucaoQuery.eq('contrato', contrato)
    if (tipo === 'meus') tempoResolucaoQuery = tempoResolucaoQuery.eq('matricula_user', authResult.user?.matricula)
    
    const { data: resolucaoData } = await tempoResolucaoQuery
    
    let tempoMedioResolucao = 0
    if (resolucaoData && resolucaoData.length > 0) {
      const tempos = resolucaoData.map((item: { created_at: string; updated_at: string }) => {
        const inicio = new Date(item.created_at)
        const fim = new Date(item.updated_at)
        return (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24) // dias
      })
      tempoMedioResolucao = tempos.reduce((a, b) => a + b, 0) / tempos.length
    }

    // 8. Desvios próximos do vencimento (próximos 7 dias)
    const proximoVencimento = new Date()
    proximoVencimento.setDate(proximoVencimento.getDate() + 7)
    
    let vencimentoQuery = supabase
      .from('desvios')
      .select(`
        id,
        titulo,
        data_limite,
        responsavel,
        natureza:natureza_id(natureza)
      `)
      .eq('status', 'Em Andamento')
      .gte('data_limite', new Date().toISOString())
      .lte('data_limite', proximoVencimento.toISOString())
    
    if (contrato) vencimentoQuery = vencimentoQuery.eq('contrato', contrato)
    if (tipo === 'meus') {
      vencimentoQuery = vencimentoQuery.or(`matricula_user.eq.${authResult.user?.matricula},responsavel.eq.${authResult.user?.matricula}`)
    }
    
    const { data: proximosVencimento } = await vencimentoQuery

    // Montar resposta
    const stats = {
      indicadores: {
        total: totalResult.count || 0,
        novos_periodo: novosPeriodoResult.count || 0,
        aguardando_avaliacao: aguardandoResult.count || 0,
        em_andamento: emAndamentoResult.count || 0,
        concluidos: resolvidosResult.count || 0,
        vencidos: vencidosResult.count || 0,
        tempo_medio_resolucao: Math.round(tempoMedioResolucao * 10) / 10 // 1 casa decimal
      },
      distribuicoes: {
        por_status: distribuicaoStatus,
        por_natureza: distribuicaoNatureza,
        por_tipo: distribuicaoTipo
      },
      evolucao_temporal: evolucaoPorDia,
      top_responsaveis: topResponsaveis,
      proximos_vencimento: proximosVencimento || [],
      periodo_analisado: {
        inicio: dataInicio.toISOString(),
        fim: new Date().toISOString(),
        dias: parseInt(periodo)
      }
    }

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
