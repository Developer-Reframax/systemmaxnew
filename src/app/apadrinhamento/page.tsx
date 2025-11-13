'use client'

import { useState, useEffect } from 'react'
import { Users, Clock, CheckCircle, AlertTriangle, Plus, List, BarChart3 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import MainLayout from '@/components/Layout/MainLayout'
import { ApadrinhamentoStats, Apadrinhamento } from '@/lib/types/apadrinhamento'

export default function ApadrinhamentoDashboard() {
  const [stats, setStats] = useState<ApadrinhamentoStats | null>(null)
  const [apadrinhamentosAtivos, setApadrinhamentosAtivos] = useState<Apadrinhamento[]>([])
  const [proximosVencimento, setProximosVencimento] = useState<Apadrinhamento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

      // Carregar estatísticas
      const statsResponse = await fetch('/api/apadrinhamento/stats', {
        headers: {
          'Authorization': `Bearer ${auth_token}`
        }
      })
      if (!statsResponse.ok) {
        throw new Error('Erro ao carregar estatísticas')
      }
      const statsData = await statsResponse.json()
      setStats(statsData)

      // Carregar apadrinhamentos ativos (últimos 5)
      const ativosResponse = await fetch('/api/apadrinhamento?status=Ativo&limit=5', {
        headers: {
          'Authorization': `Bearer ${auth_token}`
        }
      })
      if (!ativosResponse.ok) {
        throw new Error('Erro ao carregar apadrinhamentos ativos')
      }
      const ativosData = await ativosResponse.json()
      setApadrinhamentosAtivos(ativosData.data || [])

      // Carregar próximos ao vencimento
      const hoje = new Date()
      const proximosSete = new Date()
      proximosSete.setDate(hoje.getDate() + 7)

      const proximosResponse = await fetch('/api/apadrinhamento?status=Ativo&limit=10', {
        headers: {
          'Authorization': `Bearer ${auth_token}`
        }
      })
      if (!proximosResponse.ok) {
        throw new Error('Erro ao carregar próximos vencimentos')
      }
      const proximosData = await proximosResponse.json()
      
      // Filtrar próximos ao vencimento no frontend
      const proximos = (proximosData.data || []).filter((apadrinhamento: Apadrinhamento) => {
        const dataFim = new Date(apadrinhamento.data_fim)
        return dataFim >= hoje && dataFim <= proximosSete
      })
      setProximosVencimento(proximos)

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
      toast.error('Erro ao carregar dados do dashboard')
    } finally {
      setLoading(false)
    }
  }

  const calcularProgresso = (dataInicio: string, dataFim: string) => {
    const inicio = new Date(dataInicio)
    const fim = new Date(dataFim)
    const hoje = new Date()
    
    const totalDias = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
    const diasDecorridos = Math.ceil((hoje.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
    
    return Math.min(Math.max((diasDecorridos / totalDias) * 100, 0), 100)
  }

  const formatarData = (data: string) => {
    // Adicionar 'T00:00:00' para garantir que seja interpretado como horário local
    const date = new Date(data + 'T00:00:00')
    return date.toLocaleDateString('pt-BR')
  }

  const diasRestantes = (dataFim: string) => {
    const fim = new Date(dataFim)
    const hoje = new Date()
    const diff = Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(diff, 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <MainLayout>
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard de Apadrinhamento</h1>
            <p className="text-gray-600">Acompanhe o progresso dos apadrinhamentos de colaboradores</p>
          </div>
          <div className="flex gap-3 mt-4 sm:mt-0">
            <Link
              href="/apadrinhamento/novo"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Apadrinhamento
            </Link>
            <Link
              href="/apadrinhamento/lista"
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <List className="w-4 h-4 mr-2" />
              Ver Todos
            </Link>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ativos</p>
                <p className="text-3xl font-bold text-blue-600">{stats?.total_ativos || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Concluídos</p>
                <p className="text-3xl font-bold text-green-600">{stats?.total_concluidos || 0}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Vencidos</p>
                <p className="text-3xl font-bold text-red-600">{stats?.total_vencidos || 0}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Próximos ao Vencimento</p>
                <p className="text-3xl font-bold text-yellow-600">{stats?.proximos_vencimento || 0}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Apadrinhamentos Ativos */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Apadrinhamentos Ativos</h2>
              <p className="text-sm text-gray-600 mt-1">Últimos apadrinhamentos em andamento</p>
            </div>
            <div className="p-6">
              {apadrinhamentosAtivos.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhum apadrinhamento ativo</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {apadrinhamentosAtivos.map((apadrinhamento) => {
                    const progresso = calcularProgresso(apadrinhamento.data_inicio, apadrinhamento.data_fim)
                    return (
                      <div key={apadrinhamento.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {apadrinhamento.novato?.nome || apadrinhamento.matricula_novato}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Padrinho: {apadrinhamento.padrinho?.nome || apadrinhamento.matricula_padrinho}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {apadrinhamento.tipo_apadrinhamento}
                            </p>
                          </div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {apadrinhamento.status}
                          </span>
                        </div>
                        <div className="mb-2">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Progresso</span>
                            <span>{Math.round(progresso)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progresso}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Início: {formatarData(apadrinhamento.data_inicio)}</span>
                          <span>Fim: {formatarData(apadrinhamento.data_fim)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Próximos ao Vencimento */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Próximos ao Vencimento</h2>
              <p className="text-sm text-gray-600 mt-1">Apadrinhamentos que vencem nos próximos 7 dias</p>
            </div>
            <div className="p-6">
              {proximosVencimento.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhum vencimento próximo</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {proximosVencimento.map((apadrinhamento) => {
                    const dias = diasRestantes(apadrinhamento.data_fim)
                    return (
                      <div key={apadrinhamento.id} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {apadrinhamento.novato?.nome || apadrinhamento.matricula_novato}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Padrinho: {apadrinhamento.padrinho?.nome || apadrinhamento.matricula_padrinho}
                            </p>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            dias <= 3 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {dias === 0 ? 'Vence hoje' : `${dias} dias`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{apadrinhamento.tipo_apadrinhamento}</span>
                          <span>Vence em: {formatarData(apadrinhamento.data_fim)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Estatísticas por Tipo */}
        {stats && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Distribuição por Tipo</h2>
              <p className="text-sm text-gray-600 mt-1">Apadrinhamentos ativos por categoria</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="p-4 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="font-medium text-gray-900">Novo Colaborador</h3>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{stats.por_tipo['Novo colaborador']}</p>
                </div>
                <div className="text-center">
                  <div className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                    <BarChart3 className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="font-medium text-gray-900">Operador de Ponte</h3>
                  <p className="text-2xl font-bold text-green-600 mt-1">{stats.por_tipo['Novo operador de ponte']}</p>
                </div>
                <div className="text-center">
                  <div className="p-4 bg-purple-100 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                    <Users className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="font-medium text-gray-900">Operador de Empilhadeira</h3>
                  <p className="text-2xl font-bold text-purple-600 mt-1">{stats.por_tipo['Novo operador de empilhadeira']}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
