import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const periodo = searchParams.get('periodo') || '30' // dias
    const contrato_id = searchParams.get('contrato_id')

    const dataInicio = new Date()
    dataInicio.setDate(dataInicio.getDate() - parseInt(periodo))

    let baseQuery = supabase
      .from('interacoes')
      .select(`
        *,
        tipo:interacao_tipos(tipo),
        unidade:interacao_unidades(unidade),
        area:interacao_areas(area),
        classificacao:interacao_classificacoes(classificacao),
        violacao:interacao_violacoes(violacao),
        grande_risco:interacao_grandes_riscos(grandes_riscos),
        local_instalacao:interacao_local_instalacao(local_instalacao),
        colaborador:usuarios!interacoes_matricula_colaborador_fkey(nome, matricula)
      `)
      .gte('data', dataInicio.toISOString().split('T')[0])

    if (contrato_id) {
      baseQuery = baseQuery.eq('contrato_id', contrato_id)
    }

    const { data: interacoes, error } = await baseQuery

    if (error) {
      console.error('Erro ao buscar estatísticas:', error)
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }

    // Estatísticas gerais
    const totalInteracoes = interacoes?.length || 0
    const interacoesHoje = interacoes?.filter(i => 
      new Date(i.data).toDateString() === new Date().toDateString()
    ).length || 0

    // Interações por status
    const interacoesPorStatus = {
      pendente: interacoes?.filter(i => i.status === 'pendente').length || 0,
      em_andamento: interacoes?.filter(i => i.status === 'em_andamento').length || 0,
      concluida: interacoes?.filter(i => i.status === 'concluida').length || 0,
      cancelada: interacoes?.filter(i => i.status === 'cancelada').length || 0
    }

    // Interações por tipo
    const interacoesPorTipo = interacoes?.reduce((acc: Record<string, number>, interacao) => {
      const tipo = interacao.tipo?.tipo || 'Não informado'
      acc[tipo] = (acc[tipo] || 0) + 1
      return acc
    }, {}) || {}

    // Interações por classificação
    const interacoesPorClassificacao = interacoes?.reduce((acc: Record<string, number>, interacao) => {
      const classificacao = interacao.classificacao?.classificacao || 'Não informado'
      acc[classificacao] = (acc[classificacao] || 0) + 1
      return acc
    }, {}) || {}

    // Interações por unidade
    const interacoesPorUnidade = interacoes?.reduce((acc: Record<string, number>, interacao) => {
      const unidade = interacao.unidade?.unidade || 'Não informado'
      acc[unidade] = (acc[unidade] || 0) + 1
      return acc
    }, {}) || {}

    // Interações por área
    const interacoesPorArea = interacoes?.reduce((acc: Record<string, number>, interacao) => {
      const area = interacao.area?.area || 'Não informado'
      acc[area] = (acc[area] || 0) + 1
      return acc
    }, {}) || {}

    // Interações por dia (últimos 30 dias)
    const interacoesPorDia = []
    for (let i = parseInt(periodo) - 1; i >= 0; i--) {
      const data = new Date()
      data.setDate(data.getDate() - i)
      const dataStr = data.toISOString().split('T')[0]
      const count = interacoes?.filter(interacao => 
        interacao.data === dataStr
      ).length || 0
      
      interacoesPorDia.push({
        data: dataStr,
        count
      })
    }

    // Top 5 usuários com mais interações
    const usuariosInteracoes = interacoes?.reduce((acc: Record<string, number>, interacao) => {
      const usuario = interacao.colaborador?.nome || 'Não informado'
      const matricula = interacao.colaborador?.matricula || ''
      const key = `${usuario} (${matricula})`
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {}) || {}

    const topUsuarios = Object.entries(usuariosInteracoes)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([usuario, count]) => ({ usuario, count }))

    // Interações com grandes riscos
    const interacoesGrandesRiscos = interacoes?.filter(i => i.grande_risco_id).length || 0

    // Interações com violações
    const interacoesViolacoes = interacoes?.filter(i => i.violacao_id).length || 0

    // Taxa de conclusão
    const taxaConclusao = totalInteracoes > 0 
      ? Math.round((interacoesPorStatus.concluida / totalInteracoes) * 100)
      : 0

    return NextResponse.json({
      success: true,
      data: {
        resumo: {
          totalInteracoes,
          interacoesHoje,
          interacoesGrandesRiscos,
          interacoesViolacoes,
          taxaConclusao
        },
        interacoesPorStatus,
        interacoesPorTipo,
        interacoesPorClassificacao,
        interacoesPorUnidade,
        interacoesPorArea,
        interacoesPorDia,
        topUsuarios,
        periodo: parseInt(periodo)
      }
    })
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
