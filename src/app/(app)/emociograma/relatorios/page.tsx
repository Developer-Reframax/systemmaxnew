'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  BarChart3, 
  PieChart as PieChartIcon, 
  TrendingUp,
  Users,
  AlertTriangle,
  Smile,
  Meh,
  Frown,
  ArrowLeft
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface EmociogramaStats {
  resumo: {
    total_registros: number
    bem: number
    regular: number
    pessimo: number
  }
  tendencia: Array<{
    data: string
    bem: number
    regular: number
    pessimo: number
    total: number
  }>
  alertas: {
    ativos: number
    resolvidos: number
    em_tratamento: number
  }
  tratativas: {
    total: number
    por_tipo: Record<string, number>
  }
}

const COLORS = {
  bem: '#10B981',
  regular: '#F59E0B', 
  pessimo: '#EF4444'
}

export default function EmociogramaRelatorios() {
  const router = useRouter()
  const [stats, setStats] = useState<EmociogramaStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState({
    periodo: '30d',
    escopo: 'individual'
  })

  const carregarEstatisticas = useCallback(async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        periodo: filtros.periodo,
        escopo: filtros.escopo
      })

      const response = await fetch(`/api/emociograma/stats?${params}`, {
       method: 'GET'
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.data)
      } else {
        toast.error('Erro ao carregar estatísticas')
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
      toast.error('Erro ao carregar estatísticas')
    } finally {
      setLoading(false)
    }
  }, [filtros])

  useEffect(() => {
    carregarEstatisticas()
  }, [carregarEstatisticas])

  // Preparar dados para os gráficos
  const dadosDistribuicao = stats ? [
    { name: 'Bem', value: stats.resumo.bem, color: COLORS.bem },
    { name: 'Regular', value: stats.resumo.regular, color: COLORS.regular },
    { name: 'Péssimo', value: stats.resumo.pessimo, color: COLORS.pessimo }
  ].filter(item => item.value > 0) : []

  const dadosTendencia = stats?.tendencia.map(dia => ({
    data: new Date(dia.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    bem: dia.bem,
    regular: dia.regular,
    pessimo: dia.pessimo,
    total: dia.total
  })) || []



  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    )
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/emociograma')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Relatórios de Emociograma</h1>
              <p className="text-gray-600">Análises e estatísticas detalhadas dos registros emocionais</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Período</label>
              <select
                value={filtros.periodo}
                onChange={(e) => setFiltros(prev => ({ ...prev, periodo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="90d">Últimos 90 dias</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Escopo</label>
              <select
                value={filtros.escopo}
                onChange={(e) => setFiltros(prev => ({ ...prev, escopo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="individual">Individual</option>
                <option value="equipe">Minha Equipe</option>
                <option value="geral">Geral</option>
              </select>
            </div>
          </div>
        </div>

        {stats && (
          <>
            {/* Cards de resumo */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">Total de Registros</h3>
                  <BarChart3 className="h-4 w-4 text-gray-400" />
                </div>
                <div className="text-2xl font-bold">{stats.resumo.total_registros}</div>
                <p className="text-xs text-gray-500">
                  registros no período
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">Estados Positivos</h3>
                  <Smile className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-600">{stats.resumo.bem}</div>
                <p className="text-xs text-gray-500">
                  {stats.resumo.total_registros > 0 
                    ? `${((stats.resumo.bem / stats.resumo.total_registros) * 100).toFixed(1)}%` 
                    : '0%'} do total
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">Estados de Atenção</h3>
                  <Meh className="h-4 w-4 text-yellow-600" />
                </div>
                <div className="text-2xl font-bold text-yellow-600">{stats.resumo.regular}</div>
                <p className="text-xs text-gray-500">
                  {stats.resumo.total_registros > 0 
                    ? `${((stats.resumo.regular / stats.resumo.total_registros) * 100).toFixed(1)}%` 
                    : '0%'} do total
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">Estados Críticos</h3>
                  <Frown className="h-4 w-4 text-red-600" />
                </div>
                <div className="text-2xl font-bold text-red-600">{stats.resumo.pessimo}</div>
                <p className="text-xs text-gray-500">
                  {stats.resumo.total_registros > 0 
                    ? `${((stats.resumo.pessimo / stats.resumo.total_registros) * 100).toFixed(1)}%` 
                    : '0%'} do total
                </p>
              </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Distribuição por estado */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <PieChartIcon className="w-5 h-5 mr-2" />
                  <h3 className="text-lg font-semibold">Distribuição por Estado Emocional</h3>
                </div>
                <div className="space-y-4">
                  {dadosDistribuicao.length > 0 ? (
                    <div className="space-y-3">
                      {dadosDistribuicao.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div className="flex items-center">
                            <div 
                              className="w-4 h-4 rounded mr-3" 
                              style={{ backgroundColor: item.color }}
                            ></div>
                            <span className="font-medium">{item.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{item.value}</div>
                            <div className="text-sm text-gray-500">
                              {((item.value / dadosDistribuicao.reduce((acc, curr) => acc + curr.value, 0)) * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-gray-500">
                      Nenhum dado disponível
                    </div>
                  )}
                </div>
              </div>

              {/* Tendência temporal */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  <h3 className="text-lg font-semibold">Tendência Temporal</h3>
                </div>
                <div>
                  {dadosTendencia.length > 0 ? (
                    <div className="space-y-4">
                      {dadosTendencia.map((item, index) => (
                        <div key={index} className="border-b pb-3 last:border-b-0">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{item.data}</span>
                            <span className="text-sm text-gray-500">Total: {item.total}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: COLORS.bem }}></div>
                              <span>Bem: {item.bem}</span>
                            </div>
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: COLORS.regular }}></div>
                              <span>Regular: {item.regular}</span>
                            </div>
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: COLORS.pessimo }}></div>
                              <span>Péssimo: {item.pessimo}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-gray-500">
                      Nenhum dado disponível
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Gráfico de barras - Estados por dia */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <BarChart3 className="w-5 h-5 mr-2" />
                <h3 className="text-lg font-semibold">Estados Emocionais por Dia</h3>
              </div>
              <div>
                {dadosTendencia.length > 0 ? (
                  <div className="space-y-3">
                    {dadosTendencia.map((item, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-medium">{item.data}</span>
                          <span className="text-sm text-gray-500">Total: {item.total}</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-4 h-4 rounded mr-2" style={{ backgroundColor: COLORS.bem }}></div>
                              <span className="text-sm">Bem</span>
                            </div>
                            <div className="flex items-center">
                              <div className="bg-gray-200 rounded-full h-2 w-20 mr-2">
                                <div 
                                  className="h-2 rounded-full" 
                                  style={{ 
                                    backgroundColor: COLORS.bem,
                                    width: `${item.total > 0 ? (item.bem / item.total) * 100 : 0}%`
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">{item.bem}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-4 h-4 rounded mr-2" style={{ backgroundColor: COLORS.regular }}></div>
                              <span className="text-sm">Regular</span>
                            </div>
                            <div className="flex items-center">
                              <div className="bg-gray-200 rounded-full h-2 w-20 mr-2">
                                <div 
                                  className="h-2 rounded-full" 
                                  style={{ 
                                    backgroundColor: COLORS.regular,
                                    width: `${item.total > 0 ? (item.regular / item.total) * 100 : 0}%`
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">{item.regular}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-4 h-4 rounded mr-2" style={{ backgroundColor: COLORS.pessimo }}></div>
                              <span className="text-sm">Péssimo</span>
                            </div>
                            <div className="flex items-center">
                              <div className="bg-gray-200 rounded-full h-2 w-20 mr-2">
                                <div 
                                  className="h-2 rounded-full" 
                                  style={{ 
                                    backgroundColor: COLORS.pessimo,
                                    width: `${item.total > 0 ? (item.pessimo / item.total) * 100 : 0}%`
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">{item.pessimo}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[400px] text-gray-500">
                    Nenhum dado disponível
                  </div>
                )}
              </div>
            </div>

            {/* Estatísticas de alertas e tratativas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  <h3 className="text-lg font-semibold">Alertas</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Ativos</span>
                    <span className="font-semibold text-red-600">{stats.alertas.ativos}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Em Tratamento</span>
                    <span className="font-semibold text-yellow-600">{stats.alertas.em_tratamento}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Resolvidos</span>
                    <span className="font-semibold text-green-600">{stats.alertas.resolvidos}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <Users className="w-5 h-5 mr-2" />
                  <h3 className="text-lg font-semibold">Tratativas</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total</span>
                    <span className="font-semibold">{stats.tratativas.total}</span>
                  </div>
                  {Object.entries(stats.tratativas.por_tipo).map(([tipo, quantidade]) => (
                    <div key={tipo} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 capitalize">{tipo}</span>
                      <span className="font-semibold">{quantidade}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
  )
}
