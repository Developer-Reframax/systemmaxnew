'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle, ClipboardList, Loader2 } from 'lucide-react'
import type { ReadinessDeviation } from '@/lib/types/readiness'

interface Filters {
  status: string
  matricula: string
}

export default function ReadinessDeviationsPage() {
  const { user } = useAuth()
  const [filters, setFilters] = useState<Filters>({ status: '', matricula: '' })
  const [deviations, setDeviations] = useState<ReadinessDeviation[]>([])
  const [selected, setSelected] = useState<ReadinessDeviation | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user?.matricula && !filters.matricula) {
      setFilters((prev) => ({ ...prev, matricula: String(user.matricula) }))
    }
    loadDeviations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const loadDeviations = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.matricula) params.append('matricula', filters.matricula)

      const response = await fetch(`/api/prontidao/deviations?${params.toString()}`, {
        method: 'GET'
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Erro ao carregar desvios')
      }

      setDeviations(payload.data as ReadinessDeviation[])
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar desvios')
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (deviation: ReadinessDeviation) => {
    setSelected(deviation)
  }

  const updateDeviation = async () => {
    if (!selected) return
    try {
      setSaving(true)
      const payload = {
        id: selected.id,
        status: selected.status,
        responsible_matricula: selected.responsible_matricula ?? null,
        immediate_action: selected.immediate_action ?? null,
        root_cause: selected.root_cause ?? null,
        action_plan: selected.action_plan ?? null,
        due_date: selected.due_date ?? null,
        resolved_at: selected.resolved_at ?? null
      }
      const response = await fetch('/api/prontidao/deviations', {
        method: 'PUT',
        body: JSON.stringify(payload)
      })

      const responsePayload = await response.json()
      if (!response.ok || !responsePayload?.success) {
        throw new Error(responsePayload?.message || 'Erro ao atualizar desvio')
      }

      toast.success('Desvio atualizado')
      setSelected(null)
      loadDeviations()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar desvio')
    } finally {
      setSaving(false)
    }
  }

  const renderStatusBadge = (status: ReadinessDeviation['status']) => {
    const color =
      status === 'CONCLUIDO'
        ? 'bg-green-100 text-green-800'
        : status === 'EM_TRATATIVA'
          ? 'bg-yellow-100 text-yellow-800'
          : 'bg-red-100 text-red-800'
    return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${color}`}>{status}</span>
  }

  return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-10 w-10" />
              <div>
                <h1 className="text-2xl font-bold">Desvios de Prontidao</h1>
                <p className="text-orange-100">Trate riscos altos detectados automaticamente.</p>
              </div>
            </div>
            <Link
              href="/prontidao"
              className="inline-flex items-center px-3 py-2 rounded-md bg-white/10 text-white border border-white/20 hover:bg-white/20 text-sm font-semibold"
            >
              Voltar
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Todos os status</option>
              <option value="ABERTO">Aberto</option>
              <option value="EM_TRATATIVA">Em tratativa</option>
              <option value="CONCLUIDO">Concluido</option>
            </select>
            <input
              type="text"
              value={filters.matricula}
              onChange={(e) => setFilters((prev) => ({ ...prev, matricula: e.target.value }))}
              placeholder="Filtrar matricula"
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button
              onClick={loadDeviations}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm"
            >
              Aplicar filtros
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center space-x-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Desvios</h3>
            </div>
            <div className="max-h-[480px] overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
              {loading && (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                </div>
              )}
              {!loading && deviations.length === 0 && (
                <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Nenhum desvio encontrado.</div>
              )}
              {deviations.map((deviation) => (
                <button
                  key={deviation.id}
                  onClick={() => handleSelect(deviation)}
                  className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    selected?.id === deviation.id ? 'bg-gray-50 dark:bg-gray-700' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {deviation.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Matricula: {deviation.matricula} | Risco: {deviation.risk_level}
                      </p>
                    </div>
                    {renderStatusBadge(deviation.status)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center space-x-2 mb-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tratativa</h3>
            </div>

            {!selected && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Selecione um desvio para registrar tratativas.
              </p>
            )}

            {selected && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Status</label>
                  <select
                    value={selected.status}
                    onChange={(e) => setSelected({ ...selected, status: e.target.value as ReadinessDeviation['status'] })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="ABERTO">Aberto</option>
                    <option value="EM_TRATATIVA">Em tratativa</option>
                    <option value="CONCLUIDO">Concluido</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Responsavel</label>
                  <input
                    type="text"
                    value={selected.responsible_matricula || ''}
                    onChange={(e) => setSelected({ ...selected, responsible_matricula: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Matricula do responsavel"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Acao imediata</label>
                  <textarea
                    value={selected.immediate_action || ''}
                    onChange={(e) => setSelected({ ...selected, immediate_action: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Causa raiz</label>
                  <textarea
                    value={selected.root_cause || ''}
                    onChange={(e) => setSelected({ ...selected, root_cause: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Plano de acao</label>
                  <textarea
                    value={selected.action_plan || ''}
                    onChange={(e) => setSelected({ ...selected, action_plan: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={2}
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    onClick={updateDeviation}
                    disabled={saving}
                    className="px-4 py-2 bg-green-600 text-white rounded-md text-sm disabled:opacity-50"
                  >
                    {saving ? 'Salvando...' : 'Salvar tratativa'}
                  </button>
                  <button
                    onClick={() => setSelected(null)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
  )
}
