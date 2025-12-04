'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import MainLayout from '@/components/Layout/MainLayout'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { Activity, AlertTriangle, CheckCircle, Clock, LineChart as LineIcon, Shield } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts'
import type { ReadinessDashboardData, ReadinessRiskLevel } from '@/lib/types/readiness'

interface Filters {
  matricula: string
  periodo: string
}

export default function ProntidaoDashboardPage() {
  const { user } = useAuth()
  const [filters, setFilters] = useState<Filters>({ matricula: '', periodo: '30' })
  const [data, setData] = useState<ReadinessDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.matricula) {
      setFilters((prev) => ({ ...prev, matricula: String(prev.matricula || user.matricula) }))
    }
    loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const params = new URLSearchParams()
      if (filters.matricula) params.append('matricula', filters.matricula)
      params.append('periodo', filters.periodo || '30')

      const response = await fetch(`/api/prontidao/dashboard?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Erro ao carregar dashboard')
      }

      setData(payload.data as ReadinessDashboardData)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar dashboard')
    } finally {
      setLoading(false)
    }
  }

  const renderRiskBadge = (risk?: ReadinessRiskLevel | null) => {
    if (!risk) return null
    const color =
      risk === 'APTO'
        ? 'bg-green-100 text-green-800'
        : risk === 'ALERTA'
          ? 'bg-yellow-100 text-yellow-800'
          : 'bg-red-100 text-red-800'
    return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${color}`}>{risk}</span>
  }

  const totalSessions = data?.total_sessions || 0
  const pct = (value: number) => (totalSessions > 0 ? Math.round((value / totalSessions) * 100) : 0)

  const chartData =
    data?.score_history
      .filter((item) => item.readiness_score !== null)
      .map((item) => ({
        date: new Date(item.started_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        score: item.readiness_score
      })) || []

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="h-10 w-10" />
              <div>
                <h1 className="text-2xl font-bold">Dashboard de Prontidão Cognitiva</h1>
                <p className="text-indigo-100">Visão geral de risco, desempenho e desvios por matrícula.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 justify-end">
              <Link
                href="/prontidao"
                className="inline-flex items-center px-3 py-2 rounded-md bg-white/10 text-white border border-white/20 hover:bg-white/20 text-sm font-semibold"
              >
                Voltar
              </Link>
              <input
                type="text"
                value={filters.matricula}
                onChange={(e) => setFilters((prev) => ({ ...prev, matricula: e.target.value }))}
                placeholder="Filtrar matrícula"
                className="rounded-md px-3 py-2 text-sm text-gray-900 bg-white"
              />
              <select
                value={filters.periodo}
                onChange={(e) => setFilters((prev) => ({ ...prev, periodo: e.target.value }))}
                className="rounded-md px-3 py-2 text-sm text-gray-900 bg-white"
              >
                <option value="7">7 dias</option>
                <option value="30">30 dias</option>
                <option value="90">90 dias</option>
              </select>
              <button
                onClick={loadDashboard}
                className="px-4 py-2 bg-white text-indigo-700 rounded-md font-semibold"
              >
                Atualizar
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full" />
          </div>
        )}

        {!loading && data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">APTO</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {pct(data.distribution.apto)}%
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {data.distribution.apto} sessões
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">ALERTA</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {pct(data.distribution.alerta)}%
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-500" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {data.distribution.alerta} sessões
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">ALTO RISCO</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {pct(data.distribution.alto_risco)}%
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {data.distribution.alto_risco} sessões
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Desvios abertos</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {data.open_deviations}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-500" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Monitoramento ativo</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 lg:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <LineIcon className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Evolução do score</h3>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Total de sessões: {totalSessions}
                  </p>
                </div>
                <div className="h-72">
                  {chartData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-sm text-gray-500 dark:text-gray-400">
                      Sem dados suficientes para exibir o gráfico.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Últimas sessões
                  </h3>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {data.latest_sessions.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma sessão encontrada.</p>
                  )}
                  {data.latest_sessions.map((session) => (
                    <div
                      key={session.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-800 dark:text-gray-100">
                          {session.matricula}
                        </span>
                        {renderRiskBadge(session.risk_level)}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(session.started_at).toLocaleString('pt-BR')}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-200">
                        Score: {session.readiness_score ?? 0}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  )
}
