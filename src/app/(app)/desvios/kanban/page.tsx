'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  RefreshCcw,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  Shield,
  CalendarClock,
  User,
  ArrowRight
} from 'lucide-react'
import { toast } from 'sonner'

interface DesvioCard {
  id: string
  descricao: string
  local: string
  status: string
  potencial: string
  potencial_local?: string | null
  contrato?: string
  created_at: string
  risco_associado?: { risco_associado: string }
  natureza?: { natureza: string }
  tipo?: { tipo: string }
  responsavel_nome?: string | null
}

const STATUS_COLUMNS = [
  { key: 'Aguardando Avaliação', label: 'Aguardando Avaliação', icon: Clock, color: 'border-yellow-500/60' },
  { key: 'Em Andamento', label: 'Em Andamento', icon: AlertTriangle, color: 'border-blue-500/60' },
  { key: 'Vencido', label: 'Vencido', icon: XCircle, color: 'border-red-500/60' },
  { key: 'Concluído', label: 'Concluído', icon: CheckCircle, color: 'border-green-500/60' }
]

const statusBadge = (status: string) => {
  switch (status) {
    case 'Aguardando Avaliação':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
    case 'Em Andamento':
      return 'bg-blue-100 text-blue-800 border border-blue-200'
    case 'Concluído':
      return 'bg-green-100 text-green-800 border border-green-200'
    case 'Vencido':
      return 'bg-red-100 text-red-800 border border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-200'
  }
}

const potencialBadge = (potencial: string) => {
  switch (potencial) {
    case 'Intolerável':
      return 'bg-red-600 text-white'
    case 'Substancial':
      return 'bg-orange-500 text-white'
    case 'Moderado':
      return 'bg-amber-500 text-white'
    case 'Trivial':
      return 'bg-emerald-600 text-white'
    default:
      return 'bg-gray-500 text-white'
  }
}

export default function DesviosKanban() {
  const { user } = useAuth()
  const [desvios, setDesvios] = useState<DesvioCard[]>([])
  const [loading, setLoading] = useState(true)

  const carregarDesvios = async () => {
    try {
      setLoading(true)
    
      const params = new URLSearchParams({ limit: '150' })
      const response = await fetch(`/api/desvios?${params.toString()}`, {
        method: 'GET'
      })

      if (!response.ok) throw new Error('Erro ao carregar desvios')

      const result = await response.json()
      if (result.success) {
        setDesvios(result.data || [])
      } else {
        toast.error(result.message || 'Falha ao carregar desvios')
      }
    } catch (error) {
      console.error('Erro ao buscar desvios', error)
      toast.error('Erro ao buscar desvios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDesvios()
  }, [])

  const columns = useMemo(() => {
    return STATUS_COLUMNS.map((col) => ({
      ...col,
      items: desvios.filter((d) => d.status === col.key)
    }))
  }, [desvios])

  const formatDate = (value: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    return date.toLocaleDateString('pt-BR')
  }

  return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-orange-600 font-semibold">Desvios</p>
            <h1 className="text-3xl font-bold text-gray-900">Visão Kanban</h1>
            <p className="text-sm text-gray-600">
              Organize os relatos pelos status atuais. Mostrando {desvios.length} desvios.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm">
              Contrato: {user?.contrato_raiz || 'Todos'}
            </div>
            <button
              onClick={carregarDesvios}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-orange-700"
            >
              <RefreshCcw className="h-4 w-4" />
              Atualizar
            </button>
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 min-w-[820px]">
            {columns.map((column) => {
              const Icon = column.icon
              return (
                <div
                  key={column.key}
                  className="flex flex-col rounded-2xl border border-gray-200 bg-white/70 backdrop-blur shadow-md"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-orange-50 via-white to-amber-50">
                    <div className="flex items-center gap-2 text-gray-800">
                      <Icon className="h-4 w-4 text-orange-600" />
                      <h2 className="text-sm font-semibold">{column.label}</h2>
                    </div>
                    <span className="text-xs font-semibold text-gray-700 bg-white px-2 py-1 rounded-md shadow-sm border border-gray-200">
                      {column.items.length}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col gap-3 p-3 overflow-y-auto max-h-[70vh]">
                    {loading ? (
                      <div className="flex flex-col items-center gap-2 py-6 text-gray-500">
                        <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-orange-600" />
                        <span>Carregando...</span>
                      </div>
                    ) : column.items.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-center text-xs text-gray-500">
                        Nenhum desvio neste status.
                      </div>
                    ) : (
                      column.items.map((desvio) => (
                        <div
                          key={desvio.id}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-gray-700">#{desvio.id.slice(0, 6)}</span>
                            <span className={`text-[11px] rounded-full px-2 py-1 ${statusBadge(desvio.status)}`}>
                              {desvio.status}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] ${potencialBadge(desvio.potencial)}`}>
                              {desvio.potencial}{desvio.potencial_local ? ` • ${desvio.potencial_local}` : ''}
                            </span>
                          </div>

                          <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                            <Shield className="h-4 w-4 text-orange-600" />
                            {desvio.risco_associado?.risco_associado || desvio.natureza?.natureza || 'Sem classificação'}
                          </div>

                          <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                            {desvio.descricao || 'Sem descrição'}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1">
                              <MapPin className="h-3 w-3 text-gray-500" />
                              {desvio.local || 'Local não informado'}
                            </span>
                            {desvio.contrato && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1">
                                <Shield className="h-3 w-3 text-gray-500" />
                                {desvio.contrato}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1">
                              <CalendarClock className="h-3 w-3 text-gray-500" />
                              {formatDate(desvio.created_at)}
                            </span>
                          </div>

                          <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 text-gray-500" />
                              {desvio.responsavel_nome || 'Responsável não definido'}
                            </div>
                            <a
                              href={`/desvios/${desvio.id}`}
                              className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 font-medium"
                            >
                              Ver
                              <ArrowRight className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
  )
}
