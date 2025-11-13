'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Filter, Plus, Eye, AlertTriangle, Calendar, FileText, Shield, User } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import MainLayout from '@/components/Layout/MainLayout'

interface Interacao {
  id: string
  tipo: { tipo: string }
  unidade: { unidade: string }
  area: { area: string }
  local_interacao: { local_instalacao: string }
  classificacao: { classificacao: string }
  violacao?: { violacao: string }
  grande_risco?: { grandes_riscos: string }
  colaborador: { nome: string; matricula: number }
  coordenador?: { nome: string; matricula: number }
  supervisor?: { nome: string; matricula: number }
  local?: { local: string }
  data: string
  descricao: string
  acao?: string
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada'
  created_at: string
}

interface InteracaoFilters {
  search: string
  status?: string
  tipo_id?: string
  unidade_id?: string
  area_id?: string
  classificacao_id?: string
  data_inicio?: string
  data_fim?: string
  page: number
  limit: number
}

export default function ListaInteracoes() {
  const [interacoes, setInteracoes] = useState<Interacao[]>([])
  const [loading, setLoading] = useState(true)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  
  // Estados para as opções dos filtros
  const [tipos, setTipos] = useState<Array<{ id: number; nome: string }>>([])
  const [unidades, setUnidades] = useState<Array<{ id: number; nome: string }>>([])
  const [areas, setAreas] = useState<Array<{ id: number; nome: string }>>([])
  const [classificacoes, setClassificacoes] = useState<Array<{ id: number; nome: string }>>([])
  
  const [filters, setFilters] = useState<InteracaoFilters>({
    search: '',
    status: undefined,
    tipo_id: undefined,
    unidade_id: undefined,
    area_id: undefined,
    classificacao_id: undefined,
    data_inicio: undefined,
    data_fim: undefined,
    page: 1,
    limit: 10
  })

  // Carregar opções dos filtros
  useEffect(() => {
    loadFilterOptions()
  }, [])

  const loadFilterOptions = async () => {
    try {
      const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const headers = { 'Authorization': `Bearer ${auth_token}` }

      const [tiposRes, unidadesRes, areasRes, classificacoesRes] = await Promise.all([
        fetch('/api/interacoes/tipos', { headers }),
        fetch('/api/interacoes/unidades', { headers }),
        fetch('/api/interacoes/areas', { headers }),
        fetch('/api/interacoes/classificacoes', { headers })
      ])

      if (tiposRes.ok) {
        const tiposData = await tiposRes.json()
        setTipos(tiposData.data || [])
      }

      if (unidadesRes.ok) {
        const unidadesData = await unidadesRes.json()
        setUnidades(unidadesData.data || [])
      }

      if (areasRes.ok) {
        const areasData = await areasRes.json()
        setAreas(areasData.data || [])
      }

      if (classificacoesRes.ok) {
        const classificacoesData = await classificacoesRes.json()
        setClassificacoes(classificacoesData.data || [])
      }
    } catch (error) {
      console.error('Erro ao carregar opções dos filtros:', error)
    }
  }

  const loadInteracoes = useCallback(async () => {
    try {
      setLoading(true)
      const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const queryParams = new URLSearchParams()
      
      if (filters.search) queryParams.append('search', filters.search)
      if (filters.status) queryParams.append('status', filters.status)
      if (filters.tipo_id) queryParams.append('tipo_id', filters.tipo_id)
      if (filters.unidade_id) queryParams.append('unidade_id', filters.unidade_id)
      if (filters.area_id) queryParams.append('area_id', filters.area_id)
      if (filters.classificacao_id) queryParams.append('classificacao_id', filters.classificacao_id)
      if (filters.data_inicio) queryParams.append('data_inicio', filters.data_inicio)
      if (filters.data_fim) queryParams.append('data_fim', filters.data_fim)
      queryParams.append('page', currentPage.toString())
      queryParams.append('limit', (filters.limit || 10).toString())

      const response = await fetch(`/api/interacoes?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${auth_token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Erro ao carregar interações')
      }

      const data = await response.json()
      setInteracoes(data.interacoes || [])
      setTotalPages(data.pagination?.totalPages || 0)
    } catch (error) {
      console.error('Erro ao carregar interações:', error)
      toast.error('Erro ao carregar interações')
    } finally {
      setLoading(false)
    }
  }, [currentPage, filters])

  useEffect(() => {
    loadInteracoes()
  }, [loadInteracoes])

  const handleSearch = () => {
    setCurrentPage(1)
    loadInteracoes()
  }

  const handleFilterChange = (key: keyof InteracaoFilters, value: string) => {
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
      tipo_id: undefined,
      unidade_id: undefined,
      area_id: undefined,
      classificacao_id: undefined,
      data_inicio: undefined,
      data_fim: undefined,
      page: 1,
      limit: 10
    })
    setCurrentPage(1)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR')
  }

  return (
    <MainLayout>
      <div>
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Interações</h1>
              <p className="text-gray-600 mt-1">Gerencie todas as interações de segurança</p>
            </div>
            <Link
              href="/interacoes/nova"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova Interação
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
                  placeholder="Buscar por descrição, usuário, tipo, unidade..."
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
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filters.status || ''}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todos os status</option>
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluida">Concluída</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={filters.tipo_id || ''}
                    onChange={(e) => handleFilterChange('tipo_id', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todos os tipos</option>
                    {tipos.map(tipo => (
                      <option key={tipo.id} value={tipo.id.toString()}>{tipo.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                  <select
                    value={filters.unidade_id || ''}
                    onChange={(e) => handleFilterChange('unidade_id', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todas as unidades</option>
                    {unidades.map(unidade => (
                      <option key={unidade.id} value={unidade.id.toString()}>{unidade.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Área</label>
                  <select
                    value={filters.area_id || ''}
                    onChange={(e) => handleFilterChange('area_id', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todas as áreas</option>
                    {areas.map(area => (
                      <option key={area.id} value={area.id.toString()}>{area.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Classificação</label>
                  <select
                    value={filters.classificacao_id || ''}
                    onChange={(e) => handleFilterChange('classificacao_id', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todas as classificações</option>
                    {classificacoes.map(classificacao => (
                      <option key={classificacao.id} value={classificacao.id.toString()}>{classificacao.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
                  <input
                    type="date"
                    value={filters.data_inicio || ''}
                    onChange={(e) => handleFilterChange('data_inicio', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
                  <input
                    type="date"
                    value={filters.data_fim || ''}
                    onChange={(e) => handleFilterChange('data_fim', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    Limpar Filtros
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lista de Interações */}
        <div className="bg-white rounded-lg shadow-sm border">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Carregando interações...</p>
            </div>
          ) : !interacoes || interacoes.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma interação encontrada</h3>
              <p className="text-gray-500 mb-4">Não há interações que correspondam aos filtros aplicados.</p>
              <Link
                href="/interacoes/nova"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nova Interação
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Interação
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Localização
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {interacoes.map((interacao) => (
                      <tr key={interacao.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-start">
                            <div className="flex-shrink-0 mr-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <FileText className="w-4 h-4 text-blue-600" />
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-gray-900">
                                  {interacao.tipo.tipo}
                                </span>
                                {interacao.violacao && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Violação
                                  </span>
                                )}
                                {interacao.grande_risco && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                    <Shield className="w-3 h-3 mr-1" />
                                    Grande Risco
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {interacao.descricao}
                              </p>
                              <div className="text-xs text-gray-500 mt-1">
                                {interacao.classificacao.classificacao}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{interacao.unidade.unidade}</div>
                            <div className="text-gray-600">{interacao.area.area}</div>
                            <div className="text-gray-500 text-xs">{interacao.local_interacao.local_instalacao}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                              <User className="w-4 h-4 text-gray-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {interacao.colaborador.nome}
                              </div>
                              <div className="text-sm text-gray-500">
                                Mat: {interacao.colaborador.matricula}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                            {formatDate(interacao.data)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/interacoes/${interacao.id}`}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                              title="Ver detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Página {currentPage} de {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Próxima
                      </button>
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
