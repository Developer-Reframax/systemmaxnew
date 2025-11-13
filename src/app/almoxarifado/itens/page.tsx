'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Plus, Edit, Trash2, Search, Upload, X, Save, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import MainLayout from '@/components/Layout/MainLayout'

interface Item {
  id: string
  nome: string
  descricao: string
  categoria: string
  unidade_medida: string
  estoque_atual: number
  estoque_minimo: number
  preco_unitario?: number
  imagem_url?: string
  ativo: boolean
  created_at: string
  updated_at: string
}

interface ItemForm {
  nome: string
  descricao: string
  categoria: string
  unidade_medida: string
  estoque_atual: number
  estoque_minimo: number
  preco_unitario?: number
  ativo: boolean
}

const CATEGORIAS = [
  'Ferramentas',
  'EPI - Equipamentos de Proteção Individual',
  'Materiais de Escritório',
  'Materiais de Limpeza',
  'Materiais Elétricos',
  'Materiais Hidráulicos',
  'Outros'
]

const UNIDADES_MEDIDA = [
  'UN - Unidade',
  'PC - Peça',
  'KG - Quilograma',
  'L - Litro',
  'M - Metro',
  'M² - Metro Quadrado',
  'CX - Caixa',
  'PCT - Pacote'
]

function GerenciamentoItens() {
  const router = useRouter()
  const { loading: authLoading } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [processing, setProcessing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativo' | 'inativo'>('todos')
  const [stockFilter, setStockFilter] = useState<'todos' | 'baixo' | 'zerado'>('todos')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const [formData, setFormData] = useState<ItemForm>({
    nome: '',
    descricao: '',
    categoria: '',
    unidade_medida: '',
    estoque_atual: 0,
    estoque_minimo: 0,
    preco_unitario: 0,
    ativo: true
  })

  const loadItems = useCallback(async () => {
    try {
      const response = await fetch('/api/almoxarifado/itens', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        
        // A API retorna um objeto com { success: true, data: [...], pagination: {...} }
        if (result.success && Array.isArray(result.data)) {
          setItems(result.data)
        } else {
          console.error('API retornou dados em formato inválido:', result)
          setItems([]) // Definir como array vazio para evitar erros
        }
      } else if (response.status === 403) {
        toast.error('Você não tem permissão para acessar esta página')
        router.push('/almoxarifado')
      } else {
        toast.error('Erro ao carregar itens')
        setItems([]) // Garantir que items seja um array mesmo em caso de erro
      }
    } catch (error) {
      console.error('Erro ao carregar itens:', error)
      toast.error('Erro interno do servidor')
      setItems([]) // Garantir que items seja um array mesmo em caso de erro
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadItems()
  }, [loadItems])



  const openModal = (item?: Item) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        nome: item.nome,
        descricao: item.descricao,
        categoria: item.categoria,
        unidade_medida: item.unidade_medida,
        estoque_atual: item.estoque_atual,
        estoque_minimo: item.estoque_minimo,
        preco_unitario: item.preco_unitario || 0,
        ativo: item.ativo
      })
      if (item.imagem_url) {
        setImagePreview(item.imagem_url)
      }
    } else {
      setEditingItem(null)
      setFormData({
        nome: '',
        descricao: '',
        categoria: '',
        unidade_medida: '',
        estoque_atual: 0,
        estoque_minimo: 0,
        preco_unitario: 0,
        ativo: true
      })
      setImagePreview(null)
    }
    setImageFile(null)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingItem(null)
    setImageFile(null)
    setImagePreview(null)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Imagem deve ter no máximo 5MB')
        return
      }

      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)

    try {
      const formDataToSend = new FormData()
      
      // Adicionar dados do formulário
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value.toString())
      })

      // Adicionar imagem se houver
      if (imageFile) {
        formDataToSend.append('image', imageFile)
      }

      const url = editingItem 
        ? `/api/almoxarifado/itens/${editingItem.id}`
        : '/api/almoxarifado/itens'
      
      const method = editingItem ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formDataToSend
      })

      if (response.ok) {
        const savedItem = await response.json()
        
        if (editingItem) {
          setItems(prev => prev.map(item => 
            item.id === editingItem.id ? savedItem.data : item
          ))
          toast.success('Item atualizado com sucesso!')
        } else {
          setItems(prev => [savedItem.data, ...prev])
          toast.success('Item criado com sucesso!')
        }
        
        closeModal()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erro ao salvar item')
      }
    } catch (error) {
      console.error('Erro ao salvar item:', error)
      toast.error('Erro interno do servidor')
    } finally {
      setProcessing(false)
    }
  }

  const handleDelete = async (item: Item) => {
    if (!confirm(`Tem certeza que deseja excluir o item "${item.nome}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/almoxarifado/itens/${item.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (response.ok) {
        setItems(prev => prev.filter(i => i.id !== item.id))
        toast.success('Item excluído com sucesso!')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erro ao excluir item')
      }
    } catch (error) {
      console.error('Erro ao excluir item:', error)
      toast.error('Erro interno do servidor')
    }
  }

  const getStockStatus = (item: Item) => {
    // Validações defensivas para evitar erros
    if (!item || typeof item !== 'object') return 'normal'
    
    const estoqueAtual = typeof item.estoque_atual === 'number' ? item.estoque_atual : 0
    const estoqueMinimo = typeof item.estoque_minimo === 'number' ? item.estoque_minimo : 0
    
    if (estoqueAtual === 0) return 'zerado'
    if (estoqueAtual <= estoqueMinimo) return 'baixo'
    return 'normal'
  }

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'zerado': return 'text-red-600 bg-red-100'
      case 'baixo': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-green-600 bg-green-100'
    }
  }

  const getStockStatusText = (status: string) => {
    switch (status) {
      case 'zerado': return 'Zerado'
      case 'baixo': return 'Estoque Baixo'
      default: return 'Normal'
    }
  }

  const filteredItems = items.filter(item => {
    // Validações defensivas para evitar erros com propriedades undefined
    if (!item || typeof item !== 'object') return false
    
    const itemNome = item.nome || ''
    const itemDescricao = item.descricao || ''
    const itemCategoria = item.categoria || ''
    
    const matchesSearch = itemNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         itemDescricao.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = !categoryFilter || itemCategoria === categoryFilter
    
    const matchesStatus = statusFilter === 'todos' || 
                         (statusFilter === 'ativo' && item.ativo) ||
                         (statusFilter === 'inativo' && !item.ativo)
    
    const stockStatus = getStockStatus(item)
    const matchesStock = stockFilter === 'todos' ||
                        (stockFilter === 'baixo' && stockStatus === 'baixo') ||
                        (stockFilter === 'zerado' && stockStatus === 'zerado')

    return matchesSearch && matchesCategory && matchesStatus && matchesStock
  })

  if (loading || authLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando itens...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Package className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Itens</h1>
                <p className="text-gray-600">
                  {items.length} itens cadastrados • {items.filter(i => getStockStatus(i) === 'baixo').length} com estoque baixo
                </p>
              </div>
            </div>
            <button
              onClick={() => openModal()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Item</span>
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar itens..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas as categorias</option>
              {CATEGORIAS.map(categoria => (
                <option key={categoria} value={categoria}>{categoria}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'todos' | 'ativo' | 'inativo')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="todos">Todos os status</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </select>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as 'todos' | 'baixo' | 'zerado')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="todos">Todos os estoques</option>
              <option value="baixo">Estoque baixo</option>
              <option value="zerado">Estoque zerado</option>
            </select>
          </div>
        </div>

        {/* Lista de Itens */}
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Nenhum item encontrado</h2>
            <p className="text-gray-600">
              {items.length === 0 
                ? 'Comece criando seu primeiro item'
                : 'Tente ajustar os filtros de busca'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => {
              const stockStatus = getStockStatus(item)
              return (
                <div key={item.id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      {item.imagem_url ? (
                        <img
                          src={item.imagem_url}
                          alt={item.nome}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Package className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => openModal(item)}
                        className="text-blue-600 hover:text-blue-700 p-1"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="text-red-600 hover:text-red-700 p-1"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h3 className="font-semibold text-gray-900 mb-1">{item.nome}</h3>
                    <p className="text-sm text-gray-600 mb-2">{item.descricao}</p>
                    <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                      {item.categoria}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Estoque atual:</span>
                      <span className="font-medium">{item.estoque_atual} {item.unidade_medida}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Estoque mínimo:</span>
                      <span className="font-medium">{item.estoque_minimo} {item.unidade_medida}</span>
                    </div>
                    {item.preco_unitario && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Preço unitário:</span>
                        <span className="font-medium">R$ {item.preco_unitario.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStockStatusColor(stockStatus)}`}>
                      {stockStatus === 'baixo' && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {getStockStatusText(stockStatus)}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingItem ? 'Editar Item' : 'Novo Item'}
                  </h2>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Imagem */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Imagem do Item
                    </label>
                    <div className="flex items-center space-x-4">
                      <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                        {imagePreview ? (
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Package className="h-8 w-8 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                          id="image-upload"
                        />
                        <label
                          htmlFor="image-upload"
                          className="cursor-pointer bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
                        >
                          <Upload className="h-4 w-4" />
                          <span>Escolher Imagem</span>
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Máximo 5MB • JPG, PNG, GIF
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Nome */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Categoria */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoria *
                    </label>
                    <select
                      required
                      value={formData.categoria}
                      onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecione uma categoria</option>
                      {CATEGORIAS.map(categoria => (
                        <option key={categoria} value={categoria}>{categoria}</option>
                      ))}
                    </select>
                  </div>

                  {/* Descrição */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descrição *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={formData.descricao}
                      onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Unidade de Medida */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unidade de Medida *
                    </label>
                    <select
                      required
                      value={formData.unidade_medida}
                      onChange={(e) => setFormData(prev => ({ ...prev, unidade_medida: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecione uma unidade</option>
                      {UNIDADES_MEDIDA.map(unidade => (
                        <option key={unidade} value={unidade}>{unidade}</option>
                      ))}
                    </select>
                  </div>

                  {/* Preço Unitário */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preço Unitário (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.preco_unitario}
                      onChange={(e) => setFormData(prev => ({ ...prev, preco_unitario: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Estoque Atual */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estoque Atual *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formData.estoque_atual}
                      onChange={(e) => setFormData(prev => ({ ...prev, estoque_atual: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Estoque Mínimo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estoque Mínimo *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formData.estoque_minimo}
                      onChange={(e) => setFormData(prev => ({ ...prev, estoque_minimo: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Status */}
                  <div className="md:col-span-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.ativo}
                        onChange={(e) => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Item ativo</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-6 py-2 text-gray-600 hover:text-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={processing}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>{processing ? 'Salvando...' : 'Salvar'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      </div>
    </MainLayout>
  )
}

export default GerenciamentoItens