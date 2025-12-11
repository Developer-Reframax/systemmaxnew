'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Package, TrendingUp, TrendingDown, RotateCcw, Calendar, User, Search, Filter, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import MainLayout from '@/components/Layout/MainLayout'

interface MovimentacaoEstoque {
  id: string
  item_id: string
  tipo: 'entrada' | 'saida' | 'ajuste'
  quantidade: number
  estoque_anterior: number
  estoque_atual: number
  motivo: string
  matricula_responsavel: number
  requisicao_id?: string
  created_at: string
  item: {
    id: string
    nome: string
    categoria: string
    imagem_url?: string
  }
  responsavel: {
    nome: string
    matricula: number
  }
  requisicao?: {
    id: string
    solicitante: {
      nome: string
      matricula: string
    }
  }
}

interface MovimentacoesResponse {
  movimentacoes: MovimentacaoEstoque[]
  total: number
  page: number
  totalPages: number
}

interface Item {
  id: string
  nome: string
  categoria: string
  estoque_atual: number
  ativo: boolean
}

function EstoquePage() {
  const { loading: authLoading } = useAuth()
  const router = useRouter()
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  
  // Estados para filtros
  const [filters, setFilters] = useState({
    tipo: '',
    dataInicio: '',
    dataFim: '',
    search: ''
  })
  const [showFilters, setShowFilters] = useState(false)

  // Estados para modal de entrada
  const [showEntradaModal, setShowEntradaModal] = useState(false)
  const [itensDisponiveis, setItensDisponiveis] = useState<Item[]>([])
  const [loadingItens, setLoadingItens] = useState(false)
  const [submittingEntrada, setSubmittingEntrada] = useState(false)
  const [entradaForm, setEntradaForm] = useState({
    item_id: '',
    quantidade: '',
    motivo: ''
  })

  // Estados para dropdown de pesquisa de itens
  const [itemSearch, setItemSearch] = useState('')
  const [showItemDropdown, setShowItemDropdown] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)

  const loadMovimentacoes = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      })

      // Adicionar filtros aos parâmetros
      if (filters.tipo) params.append('tipo', filters.tipo)
      if (filters.dataInicio) params.append('data_inicio', filters.dataInicio)
      if (filters.dataFim) params.append('data_fim', filters.dataFim)
      if (filters.search) params.append('search', filters.search)

      const response = await fetch(`/api/almoxarifado/movimentacoes?${params}`, {
        method: 'GET'
      })

      if (response.ok) {
        const data: MovimentacoesResponse = await response.json()
        setMovimentacoes(data.movimentacoes)
        setCurrentPage(data.page)
        setTotalPages(data.totalPages)
        setTotal(data.total)
      } else if (response.status === 403) {
        toast.error('Você não tem permissão para acessar esta página')
        router.push('/almoxarifado')
      } else {
        toast.error('Erro ao carregar movimentações')
        setMovimentacoes([])
      }
    } catch (error) {
      console.error('Erro ao carregar movimentações:', error)
      toast.error('Erro interno do servidor')
      setMovimentacoes([])
    } finally {
      setLoading(false)
    }
  }, [router, filters])

  useEffect(() => {
    loadMovimentacoes(1)
    setCurrentPage(1)
  }, [filters, loadMovimentacoes])

  useEffect(() => {
    if (currentPage > 1) {
      loadMovimentacoes(currentPage)
    }
  }, [currentPage, loadMovimentacoes])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'entrada':
        return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'saida':
        return <TrendingDown className="w-4 h-4 text-red-600" />
      case 'ajuste':
        return <RotateCcw className="w-4 h-4 text-blue-600" />
      default:
        return <Package className="w-4 h-4 text-gray-600" />
    }
  }

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'entrada':
        return 'Entrada'
      case 'saida':
        return 'Saída'
      case 'ajuste':
        return 'Ajuste'
      default:
        return tipo
    }
  }

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'entrada':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'saida':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'ajuste':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const clearFilters = () => {
    setFilters({
      tipo: '',
      dataInicio: '',
      dataFim: '',
      search: ''
    })
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  // Função para carregar itens disponíveis
  const loadItensDisponiveis = useCallback(async (search = '') => {
    try {
      setLoadingItens(true)
      const params = new URLSearchParams({
        ativo: 'true',
        limit: '50'
      })
      
      if (search) {
        params.append('search', search)
      }
      
      const response = await fetch(`/api/almoxarifado/itens?${params}`, {
        method: 'GET'
      })

      if (response.ok) {
        const data = await response.json()
        // Corrigir o acesso aos dados - usar data.data ao invés de data.itens
        setItensDisponiveis(data.data || [])
      } else {
        toast.error('Erro ao carregar itens disponíveis')
        setItensDisponiveis([])
      }
    } catch (error) {
      console.error('Erro ao carregar itens:', error)
      toast.error('Erro interno do servidor')
      setItensDisponiveis([])
    } finally {
      setLoadingItens(false)
    }
  }, [])

  // Função para filtrar itens baseado na pesquisa
  const filteredItens = itensDisponiveis.filter(item =>
    item.nome.toLowerCase().includes(itemSearch.toLowerCase()) ||
    item.categoria.toLowerCase().includes(itemSearch.toLowerCase())
  )

  // Função para selecionar um item
  const handleSelectItem = (item: Item) => {
    setSelectedItem(item)
    setEntradaForm(prev => ({ ...prev, item_id: item.id }))
    setItemSearch(item.nome)
    setShowItemDropdown(false)
  }

  // Função para limpar seleção de item
  const handleClearItemSelection = () => {
    setSelectedItem(null)
    setEntradaForm(prev => ({ ...prev, item_id: '' }))
    setItemSearch('')
    setShowItemDropdown(false)
  }

  // Função para abrir modal de entrada
  const handleOpenEntradaModal = () => {
    setShowEntradaModal(true)
    loadItensDisponiveis()
  }

  // Função para fechar modal de entrada
  const handleCloseEntradaModal = () => {
    setShowEntradaModal(false)
    setEntradaForm({
      item_id: '',
      quantidade: '',
      motivo: ''
    })
    // Limpar estados do dropdown
    handleClearItemSelection()
  }

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (showItemDropdown && !target.closest('.item-dropdown-container')) {
        setShowItemDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showItemDropdown])

  // Função para submeter entrada
  const handleSubmitEntrada = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validações
    if (!entradaForm.item_id) {
      toast.error('Selecione um item')
      return
    }
    
    const quantidade = parseInt(entradaForm.quantidade)
    if (!quantidade || quantidade <= 0) {
      toast.error('Quantidade deve ser maior que zero')
      return
    }
    
    if (!entradaForm.motivo.trim()) {
      toast.error('Informe o motivo da entrada')
      return
    }

    try {
      setSubmittingEntrada(true)
      
      const response = await fetch('/api/almoxarifado/movimentacoes', {
        method: 'POST',
        body: JSON.stringify({
          item_id: entradaForm.item_id,
          quantidade: quantidade,
          motivo: entradaForm.motivo.trim()
        })
      })

      if (response.ok) {
        toast.success('Entrada registrada com sucesso!')
        handleCloseEntradaModal()
        // Recarregar movimentações
        loadMovimentacoes(1)
        setCurrentPage(1)
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Erro ao registrar entrada')
      }
    } catch (error) {
      console.error('Erro ao registrar entrada:', error)
      toast.error('Erro interno do servidor')
    } finally {
      setSubmittingEntrada(false)
    }
  }

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Package className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Movimentações de Estoque</h1>
                <p className="text-gray-600">Acompanhe o histórico de entradas, saídas e ajustes</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleOpenEntradaModal}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Entrada</span>
              </button>
              <div className="text-right">
                <p className="text-sm text-gray-500">Total de movimentações</p>
                <p className="text-2xl font-bold text-blue-600">{total}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Entrada */}
        {showEntradaModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Registrar Entrada de Estoque</h3>
                <button
                  onClick={handleCloseEntradaModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmitEntrada} className="p-6 space-y-4">
                {/* Seleção de Item com Pesquisa */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item *
                  </label>
                  <div className="relative item-dropdown-container">
                    <div className="relative">
                      <input
                        type="text"
                        value={itemSearch}
                        onChange={(e) => {
                          setItemSearch(e.target.value)
                          setShowItemDropdown(true)
                          if (!e.target.value) {
                            handleClearItemSelection()
                          }
                        }}
                        onFocus={() => setShowItemDropdown(true)}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder={loadingItens ? 'Carregando itens...' : 'Digite para pesquisar um item...'}
                        disabled={loadingItens}
                        required
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        {selectedItem ? (
                          <button
                            type="button"
                            onClick={handleClearItemSelection}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        ) : (
                          <Search className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Dropdown de itens */}
                    {showItemDropdown && !loadingItens && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredItens.length > 0 ? (
                          <>
                            {filteredItens.slice(0, 10).map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleSelectItem(item)}
                                className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {item.nome}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {item.categoria}
                                    </div>
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    Estoque: {item.estoque_atual}
                                  </div>
                                </div>
                              </button>
                            ))}
                            {filteredItens.length > 10 && (
                              <div className="px-3 py-2 text-sm text-gray-500 bg-gray-50">
                                Mostrando 10 de {filteredItens.length} itens. Continue digitando para refinar a busca.
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500">
                            {itemSearch ? 'Nenhum item encontrado' : 'Digite para pesquisar itens'}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Loading indicator */}
                    {loadingItens && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                        <div className="px-3 py-2 text-sm text-gray-500 flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                          Carregando itens...
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Item selecionado */}
                  {selectedItem && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-green-800">
                            {selectedItem.nome}
                          </div>
                          <div className="text-sm text-green-600">
                            {selectedItem.categoria} • Estoque atual: {selectedItem.estoque_atual}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleClearItemSelection}
                          className="text-green-600 hover:text-green-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {/* Quantidade */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantidade *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={entradaForm.quantidade}
                    onChange={(e) => setEntradaForm(prev => ({ ...prev, quantidade: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Digite a quantidade"
                    required
                  />
                </div>

                {/* Motivo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo *
                  </label>
                  <textarea
                    value={entradaForm.motivo}
                    onChange={(e) => setEntradaForm(prev => ({ ...prev, motivo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    rows={3}
                    placeholder="Descreva o motivo da entrada..."
                    required
                  />
                </div>

                {/* Botões */}
                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseEntradaModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    disabled={submittingEntrada}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={submittingEntrada}
                  >
                    {submittingEntrada ? 'Registrando...' : 'Confirmar Entrada'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>{showFilters ? 'Ocultar' : 'Mostrar'} Filtros</span>
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Busca por texto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buscar
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Item ou responsável..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Tipo de movimentação */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Movimentação
                </label>
                <select
                  value={filters.tipo}
                  onChange={(e) => handleFilterChange('tipo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos os tipos</option>
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                  <option value="ajuste">Ajuste</option>
                </select>
              </div>

              {/* Data início */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Início
                </label>
                <input
                  type="date"
                  value={filters.dataInicio}
                  onChange={(e) => handleFilterChange('dataInicio', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Data fim */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Fim
                </label>
                <input
                  type="date"
                  value={filters.dataFim}
                  onChange={(e) => handleFilterChange('dataFim', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Botão limpar filtros */}
          {(filters.tipo || filters.dataInicio || filters.dataFim || filters.search) && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Limpar Filtros
              </button>
            </div>
          )}
        </div>

        {/* Lista de movimentações */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Histórico de Movimentações</h2>
          </div>

          {movimentacoes.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma movimentação encontrada</h3>
              <p className="text-gray-500">
                {Object.values(filters).some(f => f) 
                  ? 'Tente ajustar os filtros para encontrar movimentações.'
                  : 'Ainda não há movimentações de estoque registradas.'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {movimentacoes.map((movimentacao) => (
                <div key={movimentacao.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      {/* Imagem do item */}
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                        {movimentacao.item.imagem_url ? (
                          <img
                            src={movimentacao.item.imagem_url}
                            alt={movimentacao.item.nome}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-gray-400" />
                        )}
                      </div>

                      {/* Informações da movimentação */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          {getTipoIcon(movimentacao.tipo)}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTipoColor(movimentacao.tipo)}`}>
                            {getTipoLabel(movimentacao.tipo)}
                          </span>
                        </div>

                        <h3 className="text-lg font-medium text-gray-900 mb-1">
                          {movimentacao.item.nome}
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Quantidade:</span>
                            <span className={`ml-1 ${movimentacao.tipo === 'entrada' ? 'text-green-600' : movimentacao.tipo === 'saida' ? 'text-red-600' : 'text-blue-600'}`}>
                              {movimentacao.tipo === 'entrada' ? '+' : movimentacao.tipo === 'saida' ? '-' : '±'}{movimentacao.quantidade}
                            </span>
                          </div>
                          
                          <div>
                            <span className="font-medium">Estoque:</span>
                            <span className="ml-1">
                              {movimentacao.estoque_anterior} → {movimentacao.estoque_atual}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1">
                            <User className="w-4 h-4" />
                            <span className="font-medium">Responsável:</span>
                            <span className="ml-1">{movimentacao.responsavel.nome}</span>
                          </div>

                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span className="font-medium">Data:</span>
                            <span className="ml-1">{formatDate(movimentacao.created_at)}</span>
                          </div>
                        </div>

                        {/* Motivo */}
                        <div className="mt-3">
                          <span className="font-medium text-sm text-gray-700">Motivo:</span>
                          <p className="text-sm text-gray-600 mt-1">{movimentacao.motivo}</p>
                        </div>

                        {/* Informações da requisição, se houver */}
                        {movimentacao.requisicao && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-md">
                            <span className="font-medium text-sm text-blue-800">Relacionado à requisição:</span>
                            <p className="text-sm text-blue-700">
                              Solicitante: {movimentacao.requisicao.solicitante.nome} ({movimentacao.requisicao.solicitante.matricula})
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Mostrando {((currentPage - 1) * 20) + 1} a {Math.min(currentPage * 20, total)} de {total} movimentações
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex items-center space-x-1">
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
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1 text-sm rounded-md ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}

export default EstoquePage