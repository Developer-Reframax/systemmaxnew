'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, Clock, CheckCircle, Plus, List, Target, UserCheck, BarChart3 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

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
  registros3psPorTipo: Record<string, number>
  registros3psPorDia: Array<{ data: string; count: number }>
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
  
      const response = await fetch(`/api/3ps/stats?periodo=${periodo}`, {
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
          </div>
        </div>

        {/* Cards de Estatisticas */}
        <div className="space-y-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
                  <p className="text-sm font-medium text-gray-600">Taxa de Aprovacao</p>
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
                  <p className="text-sm font-medium text-gray-600">Media Participantes</p>
                  <p className="text-3xl font-bold text-indigo-600">{stats?.resumo.mediaParticipantes || 0}</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-full">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <Link
              href="/3ps/meus-registros"
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Meus Registros</p>
                  <p className="text-lg font-semibold text-gray-900">Ver minhas participacoes</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-full">
                  <List className="w-6 h-6 text-gray-700" />
                </div>
              </div>
            </Link>

            <Link
              href="/3ps/relatorios"
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Relatorios</p>
                  <p className="text-lg font-semibold text-gray-900">Indicadores gerais</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-full">
                  <BarChart3 className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </Link>

            <Link
              href="/3ps/colaboradores"
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Colaboradores</p>
                  <p className="text-lg font-semibold text-gray-900">Relatorio por pessoa</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <UserCheck className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
  )
}
