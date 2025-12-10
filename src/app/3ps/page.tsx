'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, Clock, CheckCircle, Plus, List, Shield, AlertCircle, Target } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import MainLayout from '@/components/Layout/MainLayout'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

interface Stats3P {
  resumo: {
    total3ps: number
    registros3psHoje: number
    taxaAprovacao: number
    areasAtivas: number
    registrosComOportunidades: number
    mediaParticipantes: number
  }
  registros3psPorArea: Record<string, number>
  registros3psPorDia: Array<{ data: string; count: number }>
  etapasAnalise: {
    paralisacaoRealizada: number
    riscosAvaliados: number
    ambienteAvaliado: number
    passoDescrito: number
    hipotesesLevantadas: number
    atividadeSegura: number
  }
  topUsuarios: Array<{ usuario: string; count: number }>
  periodo: number
}

export default function Dashboard3Ps() {
  const [stats, setStats] = useState<Stats3P | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('30')

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

      const response = await fetch(`/api/3ps/stats?periodo=${periodo}`, {
        headers: {
          'Authorization': `Bearer ${auth_token}`,
          'Content-Type': 'application/json'
        }
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

  const prepararDadosEtapas = (etapas: Stats3P['etapasAnalise']) => {
    return [
      { etapa: 'Paralisação', valor: etapas.paralisacaoRealizada },
      { etapa: 'Riscos', valor: etapas.riscosAvaliados },
      { etapa: 'Ambiente', valor: etapas.ambienteAvaliado },
      { etapa: 'Passo a Passo', valor: etapas.passoDescrito },
      { etapa: 'Hipóteses', valor: etapas.hipotesesLevantadas },
      { etapa: 'Atividade Segura', valor: etapas.atividadeSegura }
    ]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard 3 P's</h1>
            <p className="text-gray-600">Pausar, Processar, Prosseguir - Gestão de Avaliação de Riscos</p>
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
              href="/3ps/novo"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto justify-center text-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo 3P
            </Link>
            <Link
              href="/3ps/meus-registros"
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors w-full sm:w-auto justify-center text-center"
            >
              <List className="w-4 h-4 mr-2" />
              Meus Registros
            </Link>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de 3P's</p>
                <p className="text-3xl font-bold text-blue-600">{stats?.resumo.total3ps || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Hoje</p>
                <p className="text-3xl font-bold text-green-600">{stats?.resumo.registros3psHoje || 0}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taxa de Aprovação</p>
                <p className="text-3xl font-bold text-green-600">{stats?.resumo.taxaAprovacao || 0}%</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Áreas Ativas</p>
                <p className="text-3xl font-bold text-purple-600">{stats?.resumo.areasAtivas || 0}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Com Oportunidades</p>
                <p className="text-3xl font-bold text-orange-600">{stats?.resumo.registrosComOportunidades || 0}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Média Participantes</p>
                <p className="text-3xl font-bold text-indigo-600">{stats?.resumo.mediaParticipantes || 0}</p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-full">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Registros por Área */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Registros por Área</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={prepararDadosGrafico(stats?.registros3psPorArea || {})}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="nome" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="valor" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Análise das Etapas */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Análise das Etapas</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={prepararDadosEtapas(stats?.etapasAnalise || {} as Stats3P['etapasAnalise'])}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="etapa" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="valor" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráficos de linha e top usuários */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Registros por Dia */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Registros por Dia</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats?.registros3psPorDia || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="data" 
                  tickFormatter={formatarData}
                  fontSize={12}
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

          {/* Top Usuários */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Participantes</h3>
            <div className="space-y-4">
              {stats?.topUsuarios.map((usuario, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{usuario.usuario}</span>
                  </div>
                  <span className="text-sm font-bold text-blue-600">{usuario.count}</span>
                </div>
              ))}
              {(!stats?.topUsuarios || stats.topUsuarios.length === 0) && (
                <p className="text-gray-500 text-center py-8">Nenhum dado disponível</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
