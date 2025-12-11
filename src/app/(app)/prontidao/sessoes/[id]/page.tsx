'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Activity, AlertTriangle, ArrowLeft, CheckCircle, Info } from 'lucide-react'
import type { ReadinessDeviation, ReadinessEvent, ReadinessRiskLevel, ReadinessSession } from '@/lib/types/readiness'

interface SessionDetailResponse {
  session: ReadinessSession
  events: ReadinessEvent[]
  deviation: ReadinessDeviation | null
}

export default function ReadinessSessionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState<SessionDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params?.id) {
      loadSession(String(params.id))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id])

  const loadSession = async (sessionId: string) => {
    try {
      setLoading(true)

      const response = await fetch(`/api/prontidao/sessions/${sessionId}`, {
        method: 'GET'
      })

      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Erro ao carregar sessão')
      }

      setData(payload.data as SessionDetailResponse)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar sessão')
    } finally {
      setLoading(false)
    }
  }

  const renderRiskBadge = (risk: ReadinessRiskLevel | null) => {
    if (!risk) return null
    const color =
      risk === 'APTO'
        ? 'bg-green-100 text-green-800'
        : risk === 'ALERTA'
          ? 'bg-yellow-100 text-yellow-800'
          : 'bg-red-100 text-red-800'
    return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${color}`}>{risk}</span>
  }

  const formatNumber = (value?: number | null, suffix = '') =>
    value === null || value === undefined ? '-' : `${value.toFixed(1)}${suffix}`

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
        <p className="text-gray-600 dark:text-gray-300">Sessão não encontrada.</p>
      </div>
    )
  }

  const { session, events, deviation } = data

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </button>
          <div className="bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700 px-4 py-2 rounded-md flex items-center space-x-2">
            <Activity className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-xs text-blue-800 dark:text-blue-200">Sessão</p>
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 truncate max-w-xs">{session.id}</p>
            </div>
          </div>
          {renderRiskBadge(session.risk_level)}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Tempo médio de reação</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatNumber(session.reaction_time_avg, 'ms')}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Taxa de omissão</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatNumber((session.omission_rate || 0) * 100, '%')}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Taxa de comissão</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatNumber((session.commission_rate || 0) * 100, '%')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Erro Stroop</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatNumber((session.stroop_error_rate || 0) * 100, '%')}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Índice de fadiga</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatNumber(session.fatigue_index, '%')}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Score de prontidão</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatNumber(session.readiness_score)}
            </p>
          </div>
        </div>

        {deviation && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-semibold text-red-800 dark:text-red-200">Desvio aberto</p>
                <p className="text-sm text-red-700 dark:text-red-100">{deviation.description}</p>
                <p className="text-xs text-red-600 dark:text-red-200 mt-1">
                  Status: {deviation.status} | Responsável: {deviation.responsible_matricula || 'não definido'}
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/prontidao/desvios')}
              className="text-sm font-semibold text-red-700 hover:underline"
            >
              Abrir tratativa
            </button>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center space-x-2">
            <Info className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Eventos da sessão</h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
            {events.length === 0 && (
              <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Nenhum evento registrado.</div>
            )}
            {events.map((event) => (
              <div key={event.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {event.is_correct ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {event.block_type === 'ATENCAO_SUSTENTADA' ? 'Go/No-Go' : 'Stroop'} -{' '}
                        {event.stimulus_value}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Esperado: {event.expected_response} | Resposta: {event.user_response}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                    <p>{new Date(event.timestamp).toLocaleTimeString('pt-BR')}</p>
                    <p>RT: {event.reaction_time_ms ? `${event.reaction_time_ms}ms` : '-'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
