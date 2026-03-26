'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  MapPin,
  Plus,
  Search,
  Target,
  Trash2,
  Users
} from 'lucide-react'
import { toast } from 'sonner'

interface Registro3P {
  id: string
  atividade: string
  paralisacao_realizada: boolean
  riscos_avaliados: boolean
  ambiente_avaliado: boolean
  passo_descrito: boolean
  hipoteses_levantadas: boolean
  atividade_segura: boolean
  oportunidades: string
  created_at: string
  updated_at: string
  area: {
    id: string
    local: string
  }
  criador: {
    matricula: number
    nome: string
  }
  participantes: Array<{
    matricula?: number
    nome?: string
  }>
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function MeusRegistros3P() {
  const [registros, setRegistros] = useState<Registro3P[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [filters, setFilters] = useState({
    search: '',
    atividade_segura: '',
    data_inicio: '',
    data_fim: ''
  })

  const loadRegistros = useCallback(async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        meus: 'true',
        ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''))
      })

      const response = await fetch(`/api/3ps?${params.toString()}`, {
        credentials: 'include'
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || 'Erro ao carregar registros 3P')
      }

      if (data?.success) {
        setRegistros(data.data || [])
        setPagination((prev) => ({
          ...prev,
          total: data.pagination?.total ?? data.pagination?.totalItems ?? 0,
          totalPages: data.pagination?.totalPages ?? 0
        }))
        return
      }

      toast.error(data?.error || 'Erro ao carregar registros 3P')
    } catch (error) {
      console.error('Error loading registros 3P:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar registros 3P')
    } finally {
      setLoading(false)
    }
  }, [filters, pagination.limit, pagination.page])

  useEffect(() => {
    void loadRegistros()
  }, [loadRegistros])

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      atividade_segura: '',
      data_inicio: '',
      data_fim: ''
    })
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro 3P?')) {
      return
    }

    try {
      const response = await fetch(`/api/3ps/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        toast.error(data?.error || 'Erro ao excluir registro 3P')
        return
      }

      toast.success('Registro 3P excluido com sucesso')
      void loadRegistros()
    } catch (error) {
      console.error('Error deleting registro 3P:', error)
      toast.error('Erro ao excluir registro 3P')
    }
  }

  const getAtividadeSeguraColor = (atividadeSegura: boolean) =>
    atividadeSegura
      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'

  const getAtividadeSeguraLabel = (atividadeSegura: boolean) =>
    atividadeSegura ? 'Segura' : 'Nao Segura'

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'

    try {
      return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return '-'
    }
  }

  const truncateText = (text: string, maxLength = 100) => {
    if (!text) return '-'
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text
  }

  const getProcessStagesSummary = (registro: Registro3P) => {
    const stages = [
      { value: registro.paralisacao_realizada },
      {
        value:
          registro.riscos_avaliados &&
          registro.ambiente_avaliado &&
          registro.passo_descrito &&
          registro.hipoteses_levantadas
      },
      { value: registro.atividade_segura }
    ]

    return `${stages.filter((stage) => stage.value).length}/3 etapas`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meus Registros 3P</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gerencie seus registros de Pausar, Processar e Prosseguir
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            href="/3ps/novo"
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Registro 3P
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Buscar por atividade..."
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Status da Atividade
            </label>
            <select
              value={filters.atividade_segura}
              onChange={(e) => handleFilterChange('atividade_segura', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Todos</option>
              <option value="true">Segura</option>
              <option value="false">Nao Segura</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Data Inicio
            </label>
            <input
              type="date"
              value={filters.data_inicio}
              onChange={(e) => handleFilterChange('data_inicio', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Data Fim
            </label>
            <input
              type="date"
              value={filters.data_fim}
              onChange={(e) => handleFilterChange('data_fim', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            Limpar Filtros
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {loading ? (
          <div className="p-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
            <p className="mt-2 text-gray-500 dark:text-gray-400">Carregando registros...</p>
          </div>
        ) : registros.length === 0 ? (
          <div className="p-8 text-center">
            <Target className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
              Nenhum registro encontrado
            </h3>
            <p className="mb-4 text-gray-500 dark:text-gray-400">
              Voce ainda nao criou nenhum registro 3P ou nenhum registro corresponde aos
              filtros aplicados.
            </p>
            <Link
              href="/3ps/novo"
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Registro
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      Atividade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      Area
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      Etapas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      Participantes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      Data
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      Acoes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                  {registros.map((registro) => (
                    <tr key={registro.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {truncateText(registro.atividade, 80)}
                          </p>
                          {registro.oportunidades && (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              Oportunidades: {truncateText(registro.oportunidades, 60)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-gray-900 dark:text-white">
                          <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                          {registro.area.local}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {getProcessStagesSummary(registro)}
                        </div>
                        <div className="mt-1 flex space-x-1">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              registro.paralisacao_realizada ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                            title="Pausar"
                          />
                          <div
                            className={`h-2 w-2 rounded-full ${
                              registro.riscos_avaliados &&
                              registro.ambiente_avaliado &&
                              registro.passo_descrito &&
                              registro.hipoteses_levantadas
                                ? 'bg-green-500'
                                : 'bg-gray-300'
                            }`}
                            title="Processar"
                          />
                          <div
                            className={`h-2 w-2 rounded-full ${
                              registro.atividade_segura ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            title="Prosseguir"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getAtividadeSeguraColor(
                            registro.atividade_segura
                          )}`}
                        >
                          {registro.atividade_segura ? (
                            <CheckCircle className="mr-1 h-3 w-3" />
                          ) : (
                            <AlertCircle className="mr-1 h-3 w-3" />
                          )}
                          {getAtividadeSeguraLabel(registro.atividade_segura)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-gray-900 dark:text-white">
                          <Users className="mr-2 h-4 w-4 text-gray-400" />
                          {registro.participantes.length}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <Calendar className="mr-2 h-4 w-4" />
                          {formatDate(registro.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            href={`/3ps/${registro.id}`}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Visualizar"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/3ps/${registro.id}/editar`}
                            className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => void handleDelete(registro.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <button
                      onClick={() =>
                        setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                      }
                      disabled={pagination.page === 1}
                      className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          page: Math.min(prev.totalPages, prev.page + 1)
                        }))
                      }
                      disabled={pagination.page === pagination.totalPages}
                      className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    >
                      Proximo
                    </button>
                  </div>
                  <div className="hidden flex-1 items-center justify-between sm:flex">
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Mostrando{' '}
                        <span className="font-medium">
                          {(pagination.page - 1) * pagination.limit + 1}
                        </span>{' '}
                        ate{' '}
                        <span className="font-medium">
                          {Math.min(pagination.page * pagination.limit, pagination.total)}
                        </span>{' '}
                        de <span className="font-medium">{pagination.total}</span> resultados
                      </p>
                    </div>
                    <div>
                      <nav
                        className="relative z-0 inline-flex -space-x-px rounded-md shadow-sm"
                        aria-label="Pagination"
                      >
                        <button
                          onClick={() =>
                            setPagination((prev) => ({
                              ...prev,
                              page: Math.max(1, prev.page - 1)
                            }))
                          }
                          disabled={pagination.page === 1}
                          className="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>

                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          const pageNumber = i + 1
                          return (
                            <button
                              key={pageNumber}
                              onClick={() =>
                                setPagination((prev) => ({ ...prev, page: pageNumber }))
                              }
                              className={`relative inline-flex items-center border px-4 py-2 text-sm font-medium ${
                                pagination.page === pageNumber
                                  ? 'z-10 border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                  : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400'
                              }`}
                            >
                              {pageNumber}
                            </button>
                          )
                        })}

                        <button
                          onClick={() =>
                            setPagination((prev) => ({
                              ...prev,
                              page: Math.min(prev.totalPages, prev.page + 1)
                            }))
                          }
                          disabled={pagination.page === pagination.totalPages}
                          className="relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
