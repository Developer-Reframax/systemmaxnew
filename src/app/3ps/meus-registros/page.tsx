'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Target,
  Eye,
  Edit,
  Trash2,
  Search,
  Calendar,
  MapPin,
  Plus,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Users
} from 'lucide-react'
import MainLayout from '@/components/Layout/MainLayout'
import { toast } from 'sonner'
import Link from 'next/link'

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
    matricula: number
    nome: string
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
  
  // Filtros
  const [filters, setFilters] = useState({
    search: '',
    atividade_segura: '',
    data_inicio: '',
    data_fim: ''
  })

  const loadRegistros = useCallback(async () => {
    try {
      setLoading(true)
      
      const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!auth_token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        meus: 'true', // Filtrar apenas registros do usuário logado
        ...Object.fromEntries(
          Object.entries(filters).filter(([, value]) => value !== '')
        )
      })

      const response = await fetch(`/api/3ps?${params}`, {
        headers: {
          'Authorization': `Bearer ${auth_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar registros 3P')
      }

      const data = await response.json()
      
      if (data.success) {
        setRegistros(data.data)
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages
        }))
      } else {
        toast.error(data.error || 'Erro ao carregar registros 3P')
      }
      
    } catch (error) {
      console.error('Error loading registros 3P:', error)
      toast.error('Erro ao carregar registros 3P')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, filters])

  useEffect(() => {
    loadRegistros()
  }, [loadRegistros])

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset para primeira página
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      atividade_segura: '',
      data_inicio: '',
      data_fim: ''
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro 3P?')) {
      return
    }

    try {
      const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch(`/api/3ps/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${auth_token}`
        }
      })

      if (response.ok) {
        toast.success('Registro 3P excluído com sucesso')
        loadRegistros()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Erro ao excluir registro 3P')
      }
    } catch (error) {
      console.error('Error deleting registro 3P:', error)
      toast.error('Erro ao excluir registro 3P')
    }
  }

  const getAtividadeSeguraColor = (atividade_segura: boolean) => {
    return atividade_segura 
      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
  }

  const getAtividadeSeguraLabel = (atividade_segura: boolean) => {
    return atividade_segura ? 'Segura' : 'Não Segura'
  }

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

  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text) return '-'
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text
  }

  const getProcessStagesSummary = (registro: Registro3P) => {
    const stages = [
      { label: 'Pausar', value: registro.paralisacao_realizada },
      { label: 'Processar', value: registro.riscos_avaliados && registro.ambiente_avaliado && registro.passo_descrito && registro.hipoteses_levantadas },
      { label: 'Prosseguir', value: registro.atividade_segura }
    ]
    
    const completedStages = stages.filter(stage => stage.value).length
    return `${completedStages}/3 etapas`
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
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
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Registro 3P
            </Link>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Buscar por atividade..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status da Atividade
              </label>
              <select
                value={filters.atividade_segura}
                onChange={(e) => handleFilterChange('atividade_segura', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">Todos</option>
                <option value="true">Segura</option>
                <option value="false">Não Segura</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data Início
              </label>
              <input
                type="date"
                value={filters.data_inicio}
                onChange={(e) => handleFilterChange('data_inicio', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data Fim
              </label>
              <input
                type="date"
                value={filters.data_fim}
                onChange={(e) => handleFilterChange('data_fim', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Limpar Filtros
            </button>
          </div>
        </div>

        {/* Lista de Registros */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500 dark:text-gray-400">Carregando registros...</p>
            </div>
          ) : registros.length === 0 ? (
            <div className="p-8 text-center">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Nenhum registro encontrado
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Você ainda não criou nenhum registro 3P ou nenhum registro corresponde aos filtros aplicados.
              </p>
              <Link
                href="/3ps/novo"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Registro
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Atividade
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Área
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Etapas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Participantes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {registros.map((registro) => (
                      <tr key={registro.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {truncateText(registro.atividade, 80)}
                            </p>
                            {registro.oportunidades && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Oportunidades: {truncateText(registro.oportunidades, 60)}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm text-gray-900 dark:text-white">
                            <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                            {registro.area.local}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {getProcessStagesSummary(registro)}
                          </div>
                          <div className="flex space-x-1 mt-1">
                            <div className={`w-2 h-2 rounded-full ${registro.paralisacao_realizada ? 'bg-green-500' : 'bg-gray-300'}`} title="Pausar" />
                            <div className={`w-2 h-2 rounded-full ${(registro.riscos_avaliados && registro.ambiente_avaliado && registro.passo_descrito && registro.hipoteses_levantadas) ? 'bg-green-500' : 'bg-gray-300'}`} title="Processar" />
                            <div className={`w-2 h-2 rounded-full ${registro.atividade_segura ? 'bg-green-500' : 'bg-red-500'}`} title="Prosseguir" />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAtividadeSeguraColor(registro.atividade_segura)}`}>
                            {registro.atividade_segura ? (
                              <CheckCircle className="w-3 h-3 mr-1" />
                            ) : (
                              <AlertCircle className="w-3 h-3 mr-1" />
                            )}
                            {getAtividadeSeguraLabel(registro.atividade_segura)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm text-gray-900 dark:text-white">
                            <Users className="w-4 h-4 text-gray-400 mr-2" />
                            {registro.participantes.length}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <Calendar className="w-4 h-4 mr-2" />
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
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              href={`/3ps/${registro.id}/editar`}
                              className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDelete(registro.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {pagination.totalPages > 1 && (
                <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                        disabled={pagination.page === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                        disabled={pagination.page === pagination.totalPages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Próximo
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          Mostrando{' '}
                          <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span>
                          {' '}até{' '}
                          <span className="font-medium">
                            {Math.min(pagination.page * pagination.limit, pagination.total)}
                          </span>
                          {' '}de{' '}
                          <span className="font-medium">{pagination.total}</span>
                          {' '}resultados
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                          <button
                            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                            disabled={pagination.page === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          
                          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                            const pageNumber = i + 1
                            return (
                              <button
                                key={pageNumber}
                                onClick={() => setPagination(prev => ({ ...prev, page: pageNumber }))}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  pagination.page === pageNumber
                                    ? 'z-10 bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                                }`}
                              >
                                {pageNumber}
                              </button>
                            )
                          })}
                          
                          <button
                            onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                            disabled={pagination.page === pagination.totalPages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
    </MainLayout>
  )
}