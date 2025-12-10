'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  Activity,
  LayoutPanelLeft,
  TrendingUp,
  Users,
  Calendar,
  BarChart3,
  PieChart,
  Plus,
  Filter,
  Download
} from 'lucide-react'
import MainLayout from '@/components/Layout/MainLayout'
import FormularioConversacional from '@/components/desvios/FormularioConversacional'
import { toast } from 'sonner'

interface DesviosStats {
  total: number
  novos_periodo: number
  aguardando_avaliacao: number
  em_andamento: number
  concluidos: number
  vencidos: number
  tempo_medio_resolucao: number
}

interface ProximoVencimento {
  id: string
  titulo: string
  data_limite: string
  responsavel: string
  natureza: { natureza: string }
}

export default function DesviosDashboard() {
  const { user, hasRole } = useAuth()
  const [stats, setStats] = useState<DesviosStats>({
    total: 0,
    novos_periodo: 0,
    aguardando_avaliacao: 0,
    em_andamento: 0,
    concluidos: 0,
    vencidos: 0,
    tempo_medio_resolucao: 0
  })
  const [proximosVencimento, setProximosVencimento] = useState<ProximoVencimento[]>([])
  const [distribuicaoStatus, setDistribuicaoStatus] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('30')
  const [tipoVisao, setTipoVisao] = useState<'geral' | 'meus'>('geral')
  const [showNewDesvioModal, setShowNewDesvioModal] = useState(false)

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      
      const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!auth_token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      const params = new URLSearchParams({
        periodo,
        tipo: tipoVisao
      })

      const response = await fetch(`/api/desvios/stats?${params}`, {
        headers: {
          'Authorization': `Bearer ${auth_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar estatísticas')
      }

      const data = await response.json()
      
      if (data.success) {
        setStats(data.data.indicadores)
        setProximosVencimento(data.data.proximos_vencimento)
        setDistribuicaoStatus(data.data.distribuicoes.por_status)

      } else {
        toast.error(data.message || 'Erro ao carregar dados')
      }
      
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast.error('Erro ao carregar dados do dashboard')
    } finally {
      setLoading(false)
    }
  }, [periodo, tipoVisao])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'Hoje'
    if (diffInDays === 1) return 'Amanhã'
    if (diffInDays > 0) return `${diffInDays} dias`
    return `${Math.abs(diffInDays)} dias atrás`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aguardando Avaliação': return 'text-yellow-600'
      case 'Em Andamento': return 'text-blue-600'
      case 'Concluído': return 'text-green-600'
      case 'Vencido': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-12 w-12 mr-4" />
              <div>
                <h1 className="text-2xl font-bold">Relatos/Desvios de Segurança</h1>
                <p className="text-orange-100 mt-1">
                  Gestão e acompanhamento de desvios de segurança
                </p>
                <p className="text-orange-200 text-sm mt-1">
                  Usuário: {user?.nome} • Função: {user?.funcao || user?.role}
                </p>
              </div>
            </div>
            <div className="flex w-full md:w-auto justify-start md:justify-end">
              <button
                onClick={() => setShowNewDesvioModal(true)}
                className="bg-white text-orange-600 px-4 py-2 rounded-lg font-medium hover:bg-orange-50 transition-colors flex items-center w-full md:w-auto justify-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Desvio
              </button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtros:</span>
            </div>
            
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="365">Último ano</option>
            </select>

            <select
              value={tipoVisao}
              onChange={(e) => setTipoVisao(e.target.value as 'geral' | 'meus')}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="geral">Visão Geral</option>
              <option value="meus">Meus Desvios</option>
            </select>

            <button className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700 transition-colors flex items-center">
              <Download className="h-4 w-4 mr-1" />
              Exportar
            </button>
          </div>
        </div>

        {/* Indicadores */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Total de Desvios
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {stats.total}
                      </div>
                      <div className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                        +{stats.novos_periodo} novos
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium text-orange-600 dark:text-orange-400">
                  {stats.novos_periodo}
                </span> nos últimos {periodo} dias
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Aguardando Avaliação
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {stats.aguardando_avaliacao}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Pendentes de análise
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Em Andamento
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {stats.em_andamento}
                      </div>
                      <div className="ml-2 text-sm text-red-500">
                        {stats.vencidos} vencidos
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium text-red-600 dark:text-red-400">
                  {stats.vencidos}
                </span> vencidos
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Concluídos
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {stats.concluidos}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Tempo médio: <span className="font-medium text-green-600">{stats.tempo_medio_resolucao}</span> dias
              </div>
            </div>
          </div>
        </div>

        {/* Gráficos e Próximos Vencimentos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Distribuição por Status */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <PieChart className="h-5 w-5 mr-2" />
                Distribuição por Status
              </h3>
            </div>
            <div className="space-y-3">
              {Object.entries(distribuicaoStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${getStatusColor(status)}`}>
                    {status}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {count as number}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Próximos Vencimentos */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Próximos Vencimentos
              </h3>
            </div>
            <div className="space-y-3">
              {proximosVencimento.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  Nenhum desvio próximo do vencimento
                </p>
              ) : (
                proximosVencimento.slice(0, 5).map((desvio) => (
                  <div key={desvio.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {desvio.titulo}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {desvio.natureza.natureza} • Resp: {desvio.responsavel}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-red-600">
                        {formatTime(desvio.data_limite)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Menu de Ações */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Ações Rápidas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <a
              href="/desvios/meus"
              className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Users className="h-6 w-6 text-blue-600 mr-3" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Meus Desvios
              </span>
            </a>
            
            {hasRole(['Admin', 'Editor']) && (
              <a
                href="/desvios/avaliar"
                className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Avaliar Desvios
                </span>
              </a>
            )}
            
            <a
              href="/desvios/pendencias"
              className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Clock className="h-6 w-6 text-orange-600 mr-3" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Minhas Pendências
              </span>
            </a>
            
            <a
              href="/desvios/gerais"
              className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <AlertTriangle className="h-6 w-6 text-indigo-600 mr-3" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Desvios Gerais
              </span>
            </a>

            <a
              href="/desvios/central-monitoramento"
              className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Activity className="h-6 w-6 text-orange-600 mr-3" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Central de Monitoramento
              </span>
            </a>

            <a
              href="/desvios/kanban"
              className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <LayoutPanelLeft className="h-6 w-6 text-blue-600 mr-3" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Kanban de Desvios
              </span>
            </a>
            
            {hasRole('Admin') && (
              <a
                href="/desvios/configuracoes"
                className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <BarChart3 className="h-6 w-6 text-purple-600 mr-3" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Configurações
                </span>
              </a>
            )}
          </div>
        </div>

        {/* Modal Novo Desvio */}
        <FormularioConversacional
          isOpen={showNewDesvioModal}
          onClose={() => setShowNewDesvioModal(false)}
          onSuccess={loadDashboardData}
        />
      </div>
    </MainLayout>
  )
}
