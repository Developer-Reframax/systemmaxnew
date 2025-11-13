'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  Eye,
  UserCheck,
  Search,
  MapPin,
  User,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react'
import MainLayout from '@/components/Layout/MainLayout'
import { toast } from 'sonner'
import AvaliacaoConversacional from '@/components/desvios/AvaliacaoConversacional'


interface Desvio {
  id: string
  titulo: string
  descricao: string
  local: string
  data_ocorrencia: string
  status: string
  gravidade: string
  potencial: string
  potencial_local?: string
  ver_agir: boolean
  data_limite: string
  created_at: string
  natureza: {
    id: string
    natureza: string
  }
  tipo: {
    id: string
    tipo: string
  }
  responsavel: {
    matricula: string
    nome: string
  }
  criador: {
    nome: string
  }
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  matricula: string;
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface AvaliacaoModal {
  isOpen: boolean
  desvio: Desvio | null
}

export default function AvaliarDesvios() {
  const { user } = useAuth()
  const [desvios, setDesvios] = useState<Desvio[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingUsuarios, setLoadingUsuarios] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [avaliacaoModal, setAvaliacaoModal] = useState<AvaliacaoModal>({
    isOpen: false,
    desvio: null
  })
  
  const [avaliacaoConversacional, setAvaliacaoConversacional] = useState<{
    isOpen: boolean
    desvio: Desvio | null
  }>({
    isOpen: false,
    desvio: null
  })
  const [avaliacaoForm, setAvaliacaoForm] = useState({
    responsavel: '',
    observacoes: '',
    data_limite: ''
  })
  const [submittingAvaliacao, setSubmittingAvaliacao] = useState(false)
  
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  
  // Filtros
  const [filters, setFilters] = useState({
    search: '',
    gravidade: '',
    ver_agir: '',
    data_inicio: '',
    data_fim: ''
  })

  const loadDesvios = useCallback(async () => {
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
        status: 'Aguardando Avaliação', // Apenas desvios aguardando avaliação
        ...Object.fromEntries(
          Object.entries(filters).filter(([, value]) => value !== '')
        )
      })

      const response = await fetch(`/api/desvios?${params}`, {
        headers: {
          'Authorization': `Bearer ${auth_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar desvios')
      }

      const data = await response.json()
      
      if (data.success) {
        setDesvios(data.data)
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages
        }))
      } else {
        toast.error(data.message || 'Erro ao carregar desvios')
      }
      
    } catch (error) {
      console.error('Error loading desvios:', error)
      toast.error('Erro ao carregar desvios')
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [pagination.page, pagination.limit, filters])

  useEffect(() => {
    loadDesvios()
  }, [loadDesvios])

  useEffect(() => {
    if (avaliacaoModal.isOpen) {
      loadUsuarios()
    }
  }, [avaliacaoModal.isOpen])

  const loadUsuarios = async () => {
    try {
      setLoadingUsuarios(true)
      
      const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${auth_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setUsuarios(data.users)
        }
      }
    } catch (error) {
      console.error('Error loading usuarios:', error)
    } finally {
      setLoadingUsuarios(false)
    }
  }

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset para primeira página
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      gravidade: '',
      ver_agir: '',
      data_inicio: '',
      data_fim: ''
    })
  }

  const closeAvaliacaoModal = () => {
    setAvaliacaoModal({ isOpen: false, desvio: null })
    setAvaliacaoForm({
      responsavel: '',
      observacoes: '',
      data_limite: ''
    })
  }

  const openAvaliacaoConversacional = (desvio: Desvio) => {
    setAvaliacaoConversacional({
      isOpen: true,
      desvio
    })
  }

  const closeAvaliacaoConversacional = () => {
    setAvaliacaoConversacional({
      isOpen: false,
      desvio: null
    })
  }

  const handleAvaliacaoSuccess = () => {
    loadDesvios() // Recarregar a lista de desvios
  }

  const handleAvaliacao = async () => {
    if (!avaliacaoModal.desvio) return

    if (!avaliacaoForm.responsavel) {
      toast.error('Selecione um responsável')
      return
    }

    if (avaliacaoModal.desvio.ver_agir && !avaliacaoForm.data_limite) {
      toast.error('Data limite é obrigatória para desvios Ver & Agir')
      return
    }

    try {
      setSubmittingAvaliacao(true)
      
      const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch(`/api/desvios/${avaliacaoModal.desvio.id}/avaliar`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${auth_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(avaliacaoForm)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success('Desvio avaliado com sucesso')
        closeAvaliacaoModal()
        loadDesvios() // Recarregar lista
      } else {
        toast.error(data.message || 'Erro ao avaliar desvio')
      }
    } catch (error) {
      console.error('Error evaluating desvio:', error)
      toast.error('Erro ao avaliar desvio')
    } finally {
      setSubmittingAvaliacao(false)
    }
  }

  // Função para obter cor do potencial
  const getPotencialColor = (potencial: string) => {
    switch (potencial?.toLowerCase()) {
      case 'trivial':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case 'moderado':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
      case 'substancial':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
      case 'intolerável':
      case 'intoleravel':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
    }
  }

  // Função para truncar texto
  const truncateText = (text: string, maxLength: number = 150) => {
    if (!text) return ''
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  // Função para verificar se está vencido
  const isVencido = (dataLimite: string | null) => {
    if (!dataLimite) return false
    const hoje = new Date()
    const limite = new Date(dataLimite)
    return limite < hoje
  }



  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR')
  }

  // Verificar se usuário tem permissão para avaliar
  const canEvaluate = user?.role === 'Admin' || user?.role === 'Editor'

  if (!canEvaluate) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Acesso Negado
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Você não tem permissão para avaliar desvios.
            </p>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <UserCheck className="h-12 w-12 mr-4" />
              <div>
                <h1 className="text-2xl font-bold">Avaliar Desvios</h1>
                <p className="text-orange-100 mt-1">
                  Avalie e defina responsáveis para os desvios reportados
                </p>
                <p className="text-orange-200 text-sm mt-1">
                  {pagination.total} desvios aguardando avaliação
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Título, descrição ou local..."
                  className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Gravidade
              </label>
              <select
                value={filters.gravidade}
                onChange={(e) => handleFilterChange('gravidade', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Todas</option>
                <option value="Baixa">Baixa</option>
                <option value="Média">Média</option>
                <option value="Alta">Alta</option>
                <option value="Crítica">Crítica</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ver & Agir
              </label>
              <select
                value={filters.ver_agir}
                onChange={(e) => handleFilterChange('ver_agir', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Todos</option>
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Desvios */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          {(loading || initialLoad) ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : desvios.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Nenhum desvio para avaliar
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {Object.values(filters).some(v => v !== '') 
                  ? 'Tente ajustar os filtros de busca'
                  : 'Todos os desvios foram avaliados'
                }
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Desvio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Potencial
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Criador
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Criado em
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                    {desvios.map((desvio) => {
                      const vencido = isVencido(desvio.data_limite)
                      
                      return (
                        <tr key={desvio.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          vencido ? 'bg-red-50 dark:bg-red-900/10' : ''
                        }`}>
                          <td className="px-6 py-4">
                            <div className="flex items-start">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  {desvio.ver_agir && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                                      <Clock className="h-3 w-3 mr-1" />
                                      Ver & Agir
                                    </span>
                                  )}
                                  {vencido && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Vencido
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                  {truncateText(desvio.descricao)}
                                </p>
                                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
                                  <MapPin className="h-4 w-4 mr-1" />
                                  <span className="truncate">{desvio.local}</span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {desvio.natureza.natureza} • {desvio.tipo.tipo}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPotencialColor(desvio.potencial)}`}>
                                {desvio.potencial}
                              </span>
                              {desvio.potencial_local && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Local: {desvio.potencial_local}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-1 text-gray-400" />
                              <span className="text-sm text-gray-900 dark:text-white">
                                {desvio.criador.nome}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatDateTime(desvio.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => window.location.href = `/desvios/${desvio.id}`}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                title="Visualizar"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => openAvaliacaoConversacional(desvio)}
                                className="bg-orange-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-orange-700 transition-colors flex items-center"
                              >
                                <UserCheck className="h-3 w-3 mr-1" />
                                Avaliar
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {pagination.totalPages > 1 && (
                <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-600 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.max(prev.page - 1, 1) }))}
                      disabled={pagination.page === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.page + 1, prev.totalPages) }))}
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
                        <span className="font-medium">
                          {(pagination.page - 1) * pagination.limit + 1}
                        </span>{' '}
                        até{' '}
                        <span className="font-medium">
                          {Math.min(pagination.page * pagination.limit, pagination.total)}
                        </span>{' '}
                        de{' '}
                        <span className="font-medium">{pagination.total}</span>{' '}
                        resultados
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => setPagination(prev => ({ ...prev, page: Math.max(prev.page - 1, 1) }))}
                          disabled={pagination.page === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          let pageNum
                          if (pagination.totalPages <= 5) {
                            pageNum = i + 1
                          } else if (pagination.page <= 3) {
                            pageNum = i + 1
                          } else if (pagination.page >= pagination.totalPages - 2) {
                            pageNum = pagination.totalPages - 4 + i
                          } else {
                            pageNum = pagination.page - 2 + i
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                pageNum === pagination.page
                                  ? 'z-10 bg-orange-50 dark:bg-orange-900/20 border-orange-500 text-orange-600 dark:text-orange-400'
                                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                              }`}
                            >
                              {pageNum}
                            </button>
                          )
                        })}
                        
                        <button
                          onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.page + 1, prev.totalPages) }))}
                          disabled={pagination.page === pagination.totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal de Avaliação */}
        {avaliacaoModal.isOpen && avaliacaoModal.desvio && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Avaliar Desvio
                </h3>
                <button
                  onClick={closeAvaliacaoModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-6">
                {/* Informações do Desvio */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    {avaliacaoModal.desvio.titulo}
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Local:</span>
                      <p className="text-gray-900 dark:text-white">{avaliacaoModal.desvio.local}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Potencial:</span>
                      <p className="text-gray-900 dark:text-white">
                        {avaliacaoModal.desvio.potencial}
                        {avaliacaoModal.desvio.potencial_local && (
                          <span className="text-gray-600 dark:text-gray-400 ml-2">
                            (Local: {avaliacaoModal.desvio.potencial_local})
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Natureza:</span>
                      <p className="text-gray-900 dark:text-white">{avaliacaoModal.desvio.natureza.natureza}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Tipo:</span>
                      <p className="text-gray-900 dark:text-white">{avaliacaoModal.desvio.tipo.tipo}</p>
                    </div>
                  </div>
                  {avaliacaoModal.desvio.ver_agir && (
                    <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/20 rounded border-l-4 border-red-500">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-red-600 dark:text-red-400 mr-2" />
                        <span className="text-sm font-medium text-red-800 dark:text-red-300">
                          Desvio Ver & Agir - Requer ação imediata
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="mt-3">
                    <span className="text-gray-500 dark:text-gray-400">Descrição:</span>
                    <p className="text-gray-900 dark:text-white mt-1">{avaliacaoModal.desvio.descricao}</p>
                  </div>
                </div>

                {/* Formulário de Avaliação */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Responsável *
                    </label>
                    {loadingUsuarios ? (
                      <div className="flex items-center justify-center py-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                      </div>
                    ) : (
                      <select
                        value={avaliacaoForm.responsavel}
                        onChange={(e) => setAvaliacaoForm(prev => ({ ...prev, responsavel: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                        required
                      >
                        <option value="">Selecione um responsável</option>
                        {usuarios.map((usuario) => (
                          <option key={usuario.id} value={usuario.matricula}>
                            {usuario.nome} ({usuario.email})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {avaliacaoModal.desvio.ver_agir && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Data Limite *
                      </label>
                      <input
                        type="date"
                        value={avaliacaoForm.data_limite}
                        onChange={(e) => setAvaliacaoForm(prev => ({ ...prev, data_limite: e.target.value }))}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Observações da Avaliação
                    </label>
                    <textarea
                      value={avaliacaoForm.observacoes}
                      onChange={(e) => setAvaliacaoForm(prev => ({ ...prev, observacoes: e.target.value }))}
                      rows={4}
                      placeholder="Adicione observações sobre a avaliação, orientações para o responsável, etc."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={closeAvaliacaoModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAvaliacao}
                  disabled={submittingAvaliacao || !avaliacaoForm.responsavel}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {submittingAvaliacao ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Avaliando...
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Avaliar Desvio
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Componente de Avaliação Conversacional */}
        <AvaliacaoConversacional
          isOpen={avaliacaoConversacional.isOpen}
          desvio={avaliacaoConversacional.desvio}
          onClose={closeAvaliacaoConversacional}
          onSuccess={handleAvaliacaoSuccess}
        />
      </div>
    </MainLayout>
  )
}
