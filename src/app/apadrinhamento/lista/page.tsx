'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Filter, Plus, Eye, Edit, CheckCircle, Clock, AlertTriangle, User, Users, Building2, Car, Calendar, FileText } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import MainLayout from '@/components/Layout/MainLayout'
import { 
  Apadrinhamento, 
  ApadrinhamentoFilters, 
  ApadrinhamentoListResponse,
  TIPOS_APADRINHAMENTO,
  STATUS_APADRINHAMENTO,
  STATUS_COLORS
} from '@/lib/types/apadrinhamento'

export default function ListaApadrinhamento() {
  const [apadrinhamentos, setApadrinhamentos] = useState<Apadrinhamento[]>([])
  const [loading, setLoading] = useState(true)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  
  const [filters, setFilters] = useState<ApadrinhamentoFilters>({
    search: '',
    status: undefined,
    tipo: undefined,
    page: 1,
    limit: 10
  })

  const loadApadrinhamentos = useCallback(async () => {
    try {
      setLoading(true)
      const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const queryParams = new URLSearchParams()
      
      if (filters.search) queryParams.append('search', filters.search)
      if (filters.status) queryParams.append('status', filters.status)
      if (filters.tipo) queryParams.append('tipo', filters.tipo)
      queryParams.append('page', currentPage.toString())
      queryParams.append('limit', (filters.limit || 10).toString())

      const response = await fetch(`/api/apadrinhamento?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${auth_token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Erro ao carregar apadrinhamentos')
      }

      const data: ApadrinhamentoListResponse = await response.json()
      setApadrinhamentos(data.data)
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error('Erro ao carregar apadrinhamentos:', error)
      toast.error('Erro ao carregar apadrinhamentos')
    } finally {
      setLoading(false)
    }
  }, [currentPage, filters.search, filters.status, filters.tipo, filters.limit])

  useEffect(() => {
    loadApadrinhamentos()
  }, [loadApadrinhamentos])

  const handleSearch = () => {
    setCurrentPage(1)
    loadApadrinhamentos()
  }

  const handleFilterChange = (key: keyof ApadrinhamentoFilters, value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      [key]: value === '' ? undefined : value 
    }))
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      status: undefined,
      tipo: undefined,
      page: 1,
      limit: 10
    })
    setCurrentPage(1)
  }

  const formatDate = (dateString: string) => {
    // Adicionar 'T00:00:00' para garantir que seja interpretado como horário local
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('pt-BR')
  }

  const calculateProgress = (dataInicio: string, dataFim: string) => {
    const inicio = new Date(dataInicio)
    const fim = new Date(dataFim)
    const hoje = new Date()
    
    const totalDias = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
    const diasDecorridos = Math.ceil((hoje.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
    
    return Math.min(Math.max((diasDecorridos / totalDias) * 100, 0), 100)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Ativo':
        return <Clock className="w-4 h-4" />
      case 'Concluído':
        return <CheckCircle className="w-4 h-4" />
      case 'Vencido':
        return <AlertTriangle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getTipoIcon = (tipo: string) => {
    const iconMap = {
      'Técnico': User,
      'Novo Colaborador': Users,
      'Novo Operador de Ponte': Building2,
      'Novo Operador de Empilhadeira': Car
    }
    const IconComponent = iconMap[tipo as keyof typeof iconMap] || User
    return <IconComponent className="w-4 h-4" />
  }

  return (
    <MainLayout>
      <div>
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Apadrinhamentos</h1>
              <p className="text-gray-600 mt-1">Gerencie todos os apadrinhamentos de colaboradores</p>
            </div>
            <Link
              href="/apadrinhamento/novo"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Apadrinhamento
            </Link>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Busca */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por matrícula, nome do novato, padrinho ou supervisor..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-2">
              <button
                onClick={handleSearch}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Buscar
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Filter className="w-4 h-4" />
                Filtros
              </button>
            </div>
          </div>

          {/* Filtros Expandidos */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filters.status || ''}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todos os status</option>
                    {STATUS_APADRINHAMENTO.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={filters.tipo || ''}
                    onChange={(e) => handleFilterChange('tipo', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todos os tipos</option>
                    {TIPOS_APADRINHAMENTO.map(tipo => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="w-full border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Limpar Filtros
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lista de Apadrinhamentos */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Carregando apadrinhamentos...</span>
            </div>
          </div>
        ) : apadrinhamentos.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum apadrinhamento encontrado</h3>
            <p className="text-gray-600 mb-4">
              {filters.search || filters.status || filters.tipo
                ? 'Tente ajustar os filtros para encontrar apadrinhamentos.'
                : 'Comece criando o primeiro apadrinhamento.'}
            </p>
            <Link
              href="/apadrinhamento/novo"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Apadrinhamento
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {apadrinhamentos.map((apadrinhamento) => (
              <div key={apadrinhamento.id} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Informações Principais */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[apadrinhamento.status as keyof typeof STATUS_COLORS]}`}>
                        {getStatusIcon(apadrinhamento.status)}
                        {apadrinhamento.status}
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
                        {getTipoIcon(apadrinhamento.tipo_apadrinhamento)}
                        {apadrinhamento.tipo_apadrinhamento}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Novato</p>
                        <p className="font-medium text-gray-900">
                          {apadrinhamento.novato?.nome || `Matrícula: ${apadrinhamento.matricula_novato}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Padrinho</p>
                        <p className="font-medium text-gray-900">
                          {apadrinhamento.padrinho?.nome || `Matrícula: ${apadrinhamento.matricula_padrinho}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Supervisor</p>
                        <p className="font-medium text-gray-900">
                          {apadrinhamento.supervisor_info?.nome || `Matrícula: ${apadrinhamento.matricula_supervisor}`}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Início: {formatDate(apadrinhamento.data_inicio)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Fim: {formatDate(apadrinhamento.data_fim)}</span>
                      </div>
                    </div>

                    {/* Barra de Progresso */}
                    {apadrinhamento.status === 'Ativo' && (
                      <div className="mt-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Progresso</span>
                          <span>{Math.round(calculateProgress(apadrinhamento.data_inicio, apadrinhamento.data_fim))}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${calculateProgress(apadrinhamento.data_inicio, apadrinhamento.data_fim)}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/apadrinhamento/${apadrinhamento.id}`}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">Ver</span>
                    </Link>
                    <Link
                      href={`/apadrinhamento/${apadrinhamento.id}?edit=true`}
                      className="flex items-center gap-2 text-gray-600 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      <span className="hidden sm:inline">Editar</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Página {currentPage} de {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              
              {/* Números das páginas */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 rounded-lg transition-colors ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
