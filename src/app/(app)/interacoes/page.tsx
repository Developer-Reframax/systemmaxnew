'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, Clock, CheckCircle, Plus, List, Shield, AlertCircle, Settings } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

interface InteracaoStats {
  resumo: {
    totalInteracoes: number
    interacoesHoje: number
    interacoesGrandesRiscos: number
    interacoesViolacoes: number
    taxaConclusao: number
  }
  interacoesPorStatus: {
    pendente: number
    em_andamento: number
    concluida: number
    cancelada: number
  }
  interacoesPorTipo: Record<string, number>
  interacoesPorClassificacao: Record<string, number>
  interacoesPorUnidade: Record<string, number>
  interacoesPorArea: Record<string, number>
  interacoesPorDia: Array<{ data: string; count: number }>
  topUsuarios: Array<{ usuario: string; count: number }>
  periodo: number
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

export default function InteracoesDashboard() {
  const [stats, setStats] = useState<InteracaoStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('30')

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true)

      const response = await fetch(`/api/interacoes/stats?periodo=${periodo}`, {
        method: 'GET'
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setStats(data.data)
        } else {
          toast.error('Erro ao carregar dados do dashboard')
        }
      } else {
        toast.error('Erro ao carregar dados do dashboard')
      }
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
      toast.error('Erro ao carregar dados do dashboard')
    } finally {
      setLoading(false)
    }
  }, [periodo])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const formatarData = (data: string) => {
    const date = new Date(data)
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  const prepararDadosGrafico = (dados: Record<string, number>) => {
    return Object.entries(dados).map(([nome, valor]) => ({
      nome,
      valor
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              {[1, 2, 3, 4, 5].map((i) => (
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
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard de Interações</h1>
            <p className="text-gray-600">Acompanhe as interações de segurança e qualidade</p>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 mt-4 sm:mt-0 w-full sm:w-auto">
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
            </select>
            <Link
              href="/interacoes/nova"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto justify-center text-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Interação
            </Link>
            <Link
              href="/interacoes/lista"
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors w-full sm:w-auto justify-center text-center"
            >
              <List className="w-4 h-4 mr-2" />
              Ver Todas
            </Link>
            <Link
              href="/interacoes/configuracoes"
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors w-full sm:w-auto justify-center text-center"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </Link>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Interações</p>
                <p className="text-3xl font-bold text-blue-600">{stats?.resumo.totalInteracoes || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Hoje</p>
                <p className="text-3xl font-bold text-green-600">{stats?.resumo.interacoesHoje || 0}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Grandes Riscos</p>
                <p className="text-3xl font-bold text-red-600">{stats?.resumo.interacoesGrandesRiscos || 0}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Violações</p>
                <p className="text-3xl font-bold text-orange-600">{stats?.resumo.interacoesViolacoes || 0}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taxa de Conclusão</p>
                <p className="text-3xl font-bold text-purple-600">{stats?.resumo.taxaConclusao || 0}%</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Interações por Dia */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Interações por Dia</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats?.interacoesPorDia || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="data" 
                  tickFormatter={formatarData}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => formatarData(value as string)}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Interações por Status */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Interações por Status</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={prepararDadosGrafico(stats?.interacoesPorStatus || {})}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ nome, valor }) => `${nome}: ${valor}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="valor"
                >
                  {prepararDadosGrafico(stats?.interacoesPorStatus || {}).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Interações por Tipo */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Interações por Tipo</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={prepararDadosGrafico(stats?.interacoesPorTipo || {})}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="valor" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Interações por Unidade */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Interações por Unidade</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={prepararDadosGrafico(stats?.interacoesPorUnidade || {})}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="valor" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Usuários */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Usuários com Mais Interações</h3>
          <div className="space-y-4">
            {stats?.topUsuarios.map((usuario, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-sm font-semibold text-blue-600">{index + 1}</span>
                  </div>
                  <span className="font-medium text-gray-900">{usuario.usuario}</span>
                </div>
                <span className="text-lg font-bold text-blue-600">{usuario.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
  )
}
