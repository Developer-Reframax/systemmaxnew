'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  Clock,
  CheckCircle,
  Eye,
  MessageSquare,
  Search,
  Calendar,
  MapPin,
  User,
  ChevronLeft,
  ChevronRight,
  X,
  Upload
} from 'lucide-react'
import MainLayout from '@/components/Layout/MainLayout'
import { toast } from 'sonner'

interface Desvio {
  id: string
  titulo: string
  descricao: string
  local: string
  data_ocorrencia: string
  status: string
  potencial: string
  potencial_local: string
  ver_agir: boolean
  data_limite: string | null
  created_at: string
  observacoes_avaliacao: string | null
  natureza: { natureza: string }
  tipo: { tipo: string }
  criador: { nome: string }
  avaliador: { nome: string } | null
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface ResolucaoModal {
  isOpen: boolean
  desvio: Desvio | null
}

export default function MinhasPendencias() {
  const { user } = useAuth()
  const [desvios, setDesvios] = useState<Desvio[]>([])
  const [loading, setLoading] = useState(true)
  const [resolucaoModal, setResolucaoModal] = useState<ResolucaoModal>({
    isOpen: false,
    desvio: null
  })
  const [resolucaoForm, setResolucaoForm] = useState({
    observacoes_resolucao: '',
    data_conclusao: new Date().toISOString().split('T')[0], // Data atual no formato YYYY-MM-DD
    imagens: [] as File[]
  })
  const [submittingResolucao, setSubmittingResolucao] = useState(false)
  
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  
  // Filtros
  const [filters, setFilters] = useState({
    search: '',
    potencial: '',
    ver_agir: '',
    vencimento: '', // próximos, vencidos, todos
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
        responsavel: user?.matricula?.toString() || '', // Matrícula do usuário logado convertida para string
        status: 'Em Andamento', // Apenas desvios em andamento
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
        throw new Error('Erro ao carregar pendências')
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
        toast.error(data.message || 'Erro ao carregar pendências')
      }
      
    } catch (error) {
      console.error('Error loading pendencias:', error)
      toast.error('Erro ao carregar pendências')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, filters, user?.matricula])

  useEffect(() => {
    loadDesvios()
  }, [loadDesvios])

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset para primeira página
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      potencial: '',
      ver_agir: '',
      vencimento: '',
      data_inicio: '',
      data_fim: ''
    })
  }

  const openResolucaoModal = (desvio: Desvio) => {
    setResolucaoModal({ isOpen: true, desvio })
    setResolucaoForm({
      observacoes_resolucao: '',
      data_conclusao: new Date().toISOString().split('T')[0],
      imagens: []
    })
  }

  const closeResolucaoModal = () => {
    setResolucaoModal({ isOpen: false, desvio: null })
    setResolucaoForm({
      observacoes_resolucao: '',
      data_conclusao: new Date().toISOString().split('T')[0],
      imagens: []
    })
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    // Validar arquivos
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} não é uma imagem válida`)
        return false
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB
        toast.error(`${file.name} é muito grande (máximo 5MB)`)
        return false
      }
      return true
    })

    if (resolucaoForm.imagens.length + validFiles.length > 5) {
      toast.error('Máximo de 5 imagens permitidas')
      return
    }

    setResolucaoForm(prev => ({
      ...prev,
      imagens: [...prev.imagens, ...validFiles]
    }))
  }

  const removeImage = (index: number) => {
    setResolucaoForm(prev => ({
      ...prev,
      imagens: prev.imagens.filter((_, i) => i !== index)
    }))
  }

  const handleResolucao = async () => {
    if (!resolucaoModal.desvio) return

    if (!resolucaoForm.observacoes_resolucao.trim()) {
      toast.error('Adicione observações sobre a resolução')
      return
    }

    if (!resolucaoForm.data_conclusao) {
      toast.error('Selecione a data de conclusão')
      return
    }

    // Validar data de conclusão
    const dataConclusao = new Date(resolucaoForm.data_conclusao)
    const hoje = new Date()
    const dataOcorrencia = new Date(resolucaoModal.desvio.data_ocorrencia)
    
    // Remover horário para comparação apenas de datas
    hoje.setHours(23, 59, 59, 999)
    dataOcorrencia.setHours(0, 0, 0, 0)
    dataConclusao.setHours(12, 0, 0, 0)

    if (dataConclusao > hoje) {
      toast.error('A data de conclusão não pode ser futura')
      return
    }

    if (dataConclusao < dataOcorrencia) {
      toast.error('A data de conclusão não pode ser anterior à data de ocorrência do desvio')
      return
    }

    try {
      setSubmittingResolucao(true)
      
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      
      // Primeiro, marcar como resolvido
      const resolverResponse = await fetch(`/api/desvios/${resolucaoModal.desvio.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'Concluído',
          observacoes_resolucao: resolucaoForm.observacoes_resolucao,
          data_conclusao: resolucaoForm.data_conclusao
        })
      })

      if (!resolverResponse.ok) {
        const data = await resolverResponse.json()
        throw new Error(data.message || 'Erro ao resolver desvio')
      }

      // Se há imagens, fazer upload
      if (resolucaoForm.imagens.length > 0) {
        for (const imagem of resolucaoForm.imagens) {
          const formData = new FormData()
          formData.append('file', imagem)
          formData.append('categoria', 'evidencia')

          const uploadResponse = await fetch(`/api/desvios/${resolucaoModal.desvio.id}/imagens`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          })

          if (!uploadResponse.ok) {
            console.error('Erro ao fazer upload da imagem:', imagem.name)
          }
        }
      }

      toast.success('Desvio resolvido com sucesso')
      closeResolucaoModal()
      loadDesvios() // Recarregar lista
      
    } catch (error) {
      console.error('Error resolving desvio:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao resolver desvio')
    } finally {
      setSubmittingResolucao(false)
    }
  }

  const getGravidadeColor = (potencial: string) => {
    switch (potencial) {
      case 'Trivial': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case 'Moderado': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
      case 'Substancial': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
      case 'Intolerável': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR')
  }

  const isVencido = (dataLimite: string | null) => {
    if (!dataLimite) return false
    return new Date(dataLimite) < new Date()
  }

  const isProximoVencimento = (dataLimite: string | null) => {
    if (!dataLimite) return false
    const limite = new Date(dataLimite)
    const hoje = new Date()
    const diffDays = Math.ceil((limite.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays <= 3 && diffDays > 0
  }

  const getDiasRestantes = (dataLimite: string | null) => {
    if (!dataLimite) return null
    const limite = new Date(dataLimite)
    const hoje = new Date()
    const diffDays = Math.ceil((limite.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="h-12 w-12 mr-4" />
              <div>
                <h1 className="text-2xl font-bold">Minhas Pendências</h1>
                <p className="text-purple-100 mt-1">
                  Desvios atribuídos a você que precisam de resolução
                </p>
                <p className="text-purple-200 text-sm mt-1">
                  {pagination.total} pendências em andamento
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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
                  className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Potencial
              </label>
              <select
                value={filters.potencial}
                onChange={(e) => handleFilterChange('potencial', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Todas</option>
                <option value="Baixa">Trivial</option>
                <option value="Média">Moderado</option>
                <option value="Alta">substancial</option>
                <option value="Crítica">Intolerável</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ver & Agir
              </label>
              <select
                value={filters.ver_agir}
                onChange={(e) => handleFilterChange('ver_agir', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Todos</option>
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vencimento
              </label>
              <select
                value={filters.vencimento}
                onChange={(e) => handleFilterChange('vencimento', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Todos</option>
                <option value="vencidos">Vencidos</option>
                <option value="proximos">Próximos (3 dias)</option>
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

        {/* Lista de Pendências */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : desvios.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Nenhuma pendência encontrada
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {Object.values(filters).some(v => v !== '') 
                  ? 'Tente ajustar os filtros de busca'
                  : 'Você não possui desvios pendentes no momento'
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
                        Data Limite
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Atribuído em
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                    {desvios.map((desvio) => {
                      const diasRestantes = getDiasRestantes(desvio.data_limite)
                      const vencido = isVencido(desvio.data_limite)
                      const proximoVencimento = isProximoVencimento(desvio.data_limite)
                      
                      return (
                        <tr key={desvio.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          vencido ? 'bg-red-50 dark:bg-red-900/10' : 
                          proximoVencimento ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''
                        }`}>
                          <td className="px-6 py-4">
                            <div className="flex items-start">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {desvio.titulo}
                                  </p>
                                  {desvio.ver_agir && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                                      <Clock className="h-3 w-3 mr-1" />
                                      Ver & Agir
                                    </span>
                                  )}
                                  {vencido && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                                      Vencido
                                    </span>
                                  )}
                                  {proximoVencimento && !vencido && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                                      Próximo vencimento
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center mt-1 text-sm text-gray-500 dark:text-gray-400">
                                  <MapPin className="h-4 w-4 mr-1" />
                                  <span className="truncate">{desvio.local}</span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                  {desvio.natureza.natureza} • {desvio.tipo.tipo}
                                </p>
                                {desvio.observacoes_avaliacao && (
                                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                                    <div className="flex items-center mb-1">
                                      <MessageSquare className="h-3 w-3 text-blue-600 dark:text-blue-400 mr-1" />
                                      <span className="font-medium text-blue-800 dark:text-blue-300">
                                        Observações do avaliador:
                                      </span>
                                    </div>
                                    <p className="text-blue-700 dark:text-blue-300">
                                      {desvio.observacoes_avaliacao}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                             <div className="flex flex-col space-y-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGravidadeColor(desvio.potencial)}`}>
                              {desvio.potencial}
                            </span>
                            {desvio.potencial_local && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Local: {desvio.potencial_local}
                              </span>
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {desvio.data_limite ? (
                              <div className={`flex items-center ${
                                vencido ? 'text-red-600 dark:text-red-400' :
                                proximoVencimento ? 'text-yellow-600 dark:text-yellow-400' :
                                'text-gray-500 dark:text-gray-400'
                              }`}>
                                <Calendar className="h-4 w-4 mr-1" />
                                <div>
                                  <div>{formatDate(desvio.data_limite)}</div>
                                  {diasRestantes !== null && (
                                    <div className="text-xs">
                                      {vencido ? 
                                        `${Math.abs(diasRestantes)} dias em atraso` :
                                        `${diasRestantes} dias restantes`
                                      }
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">Sem prazo</span>
                            )}
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
                                onClick={() => openResolucaoModal(desvio)}
                                className="bg-green-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-green-700 transition-colors flex items-center"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Resolver
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
                                  ? 'z-10 bg-purple-50 dark:bg-purple-900/20 border-purple-500 text-purple-600 dark:text-purple-400'
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

        {/* Modal de Resolução */}
        {resolucaoModal.isOpen && resolucaoModal.desvio && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Resolver Desvio
                </h3>
                <button
                  onClick={closeResolucaoModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-6">
                {/* Informações do Desvio */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    {resolucaoModal.desvio.titulo}
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Local:</span>
                      <p className="text-gray-900 dark:text-white">{resolucaoModal.desvio.local}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Gravidade:</span>
                      <p className="text-gray-900 dark:text-white">{resolucaoModal.desvio.potencial}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Natureza:</span>
                      <p className="text-gray-900 dark:text-white">{resolucaoModal.desvio.natureza.natureza}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Tipo:</span>
                      <p className="text-gray-900 dark:text-white">{resolucaoModal.desvio.tipo.tipo}</p>
                    </div>
                  </div>
                  {resolucaoModal.desvio.data_limite && (
                    <div className="mt-3 p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded border-l-4 border-yellow-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mr-2" />
                        <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                          Data limite: {formatDate(resolucaoModal.desvio.data_limite)}
                          {isVencido(resolucaoModal.desvio.data_limite) && (
                            <span className="ml-2 text-red-600 dark:text-red-400">(Vencido)</span>
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="mt-3">
                    <span className="text-gray-500 dark:text-gray-400">Descrição:</span>
                    <p className="text-gray-900 dark:text-white mt-1">{resolucaoModal.desvio.descricao}</p>
                  </div>
                </div>

                {/* Formulário de Resolução */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Observações da Resolução *
                    </label>
                    <textarea
                      value={resolucaoForm.observacoes_resolucao}
                      onChange={(e) => setResolucaoForm(prev => ({ ...prev, observacoes_resolucao: e.target.value }))}
                      rows={4}
                      placeholder="Descreva as ações tomadas para resolver o desvio, medidas implementadas, etc."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Data de Conclusão *
                    </label>
                    <input
                      type="date"
                      value={resolucaoForm.data_conclusao}
                      onChange={(e) => setResolucaoForm(prev => ({ ...prev, data_conclusao: e.target.value }))}
                      max={new Date().toISOString().split('T')[0]} // Não permite datas futuras
                      min={resolucaoModal.desvio?.data_ocorrencia ? new Date(resolucaoModal.desvio.data_ocorrencia).toISOString().split('T')[0] : undefined}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      A data não pode ser futura nem anterior à data de ocorrência do desvio
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Imagens da Resolução (opcional)
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600 dark:text-gray-400">
                          <label className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500">
                            <span>Selecionar imagens</span>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="sr-only"
                            />
                          </label>
                          <p className="pl-1">ou arraste e solte</p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          PNG, JPG, GIF até 5MB (máximo 5 imagens)
                        </p>
                      </div>
                    </div>
                    
                    {/* Preview das imagens */}
                    {resolucaoForm.imagens.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Imagens selecionadas:
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {resolucaoForm.imagens.map((imagem, index) => (
                            <div key={index} className="relative">
                              <img
                                src={URL.createObjectURL(imagem)}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg"
                              />
                              <button
                                onClick={() => removeImage(index)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                                {imagem.name}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={closeResolucaoModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleResolucao}
                  disabled={submittingResolucao || !resolucaoForm.observacoes_resolucao.trim() || !resolucaoForm.data_conclusao}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {submittingResolucao ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Resolvendo...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Resolver Desvio
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
