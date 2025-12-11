'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Plus, Minus, Trash2, Package, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import MainLayout from '@/components/Layout/MainLayout'

interface CartItem {
  id: string
  nome: string
  descricao: string
  categoria: string
  unidade_medida: string
  estoque_atual: number
  estoque_minimo: number
  imagem_url?: string
  quantidade: number
}

interface StockValidation {
  item_id: string
  available: boolean
  current_stock: number
  requested_quantity: number
}

function NovaRequisicao() {
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [stockValidation, setStockValidation] = useState<StockValidation[]>([])
  const [observacoes, setObservacoes] = useState('')
  const [isValidatingStock, setIsValidatingStock] = useState(false)

  // Validar estoque em tempo real
  const validateStock = useCallback(async (items: CartItem[]) => {
    if (items.length === 0) {
      setStockValidation([])
      return
    }

    // Evitar múltiplas validações simultâneas
    if (isValidatingStock) return
    
    setIsValidatingStock(true)

    try {
      const response = await fetch('/api/almoxarifado/itens/validate-stock', {
        method: 'POST',
        body: JSON.stringify({
          items: items.map(item => ({
            item_id: item.id,
            quantidade: item.quantidade
          }))
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.validations) {
          setStockValidation(result.validations)
        }
      }
    } catch (error) {
      console.error('Erro ao validar estoque:', error)
    } finally {
      setIsValidatingStock(false)
    }
  }, [isValidatingStock])

  // Carregar carrinho do localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('almoxarifado_cart')
    if (savedCart) {
      try {
        const items = JSON.parse(savedCart)
        setCartItems(items)
      } catch (error) {
        console.error('Erro ao carregar carrinho:', error)
        localStorage.removeItem('almoxarifado_cart')
      }
    }
  }, []) // Remover validateStock da dependência

  // Validar estoque quando cartItems mudar
  useEffect(() => {
    if (cartItems.length > 0) {
      localStorage.setItem('almoxarifado_cart', JSON.stringify(cartItems))
      
      // Debounce da validação de estoque
      const timeoutId = setTimeout(() => {
        validateStock(cartItems)
      }, 300)

      return () => clearTimeout(timeoutId)
    } else {
      setStockValidation([])
      localStorage.removeItem('almoxarifado_cart')
    }
  }, [cartItems, validateStock])

  // Atualizar quantidade
  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) return

    const updatedItems = cartItems.map(item =>
      item.id === itemId
        ? { ...item, quantidade: newQuantity }
        : item
    )
    setCartItems(updatedItems)
  }

  // Remover item
  const removeItem = (itemId: string) => {
    const updatedItems = cartItems.filter(item => item.id !== itemId)
    setCartItems(updatedItems)
    if (updatedItems.length === 0) {
      localStorage.removeItem('almoxarifado_cart')
      setStockValidation([])
    }
  }

  // Limpar carrinho
  const clearCart = () => {
    setCartItems([])
    localStorage.removeItem('almoxarifado_cart')
    setStockValidation([])
    toast.success('Carrinho limpo')
  }

  // Verificar se há problemas de estoque
  const hasStockIssues = stockValidation.some(validation => !validation.available)

  // Finalizar requisição
  const handleSubmit = async () => {
    if (cartItems.length === 0) {
      toast.error('Carrinho vazio')
      return
    }

    if (hasStockIssues) {
      toast.error('Há itens com estoque insuficiente')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/almoxarifado/requisicoes', {
        method: 'POST',
        body: JSON.stringify({
          itens: cartItems.map(item => ({
            item_id: item.id,
            quantidade: item.quantidade
          })),
          observacoes
        })
      })

      if (response.ok) {
        await response.json()
        toast.success('Requisição criada com sucesso!')
        
        // Limpar carrinho
        setCartItems([])
        localStorage.removeItem('almoxarifado_cart')
        
        // Redirecionar para minhas requisições
        router.push('/almoxarifado/minhas-requisicoes')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erro ao criar requisição')
      }
    } catch (error) {
      console.error('Erro ao criar requisição:', error)
      toast.error('Erro interno do servidor')
    } finally {
      setSubmitting(false)
    }
  }

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantidade, 0)

  if (cartItems.length === 0) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Carrinho Vazio</h1>
            <p className="text-gray-600 mb-6">
              Adicione itens ao seu carrinho no catálogo para criar uma requisição
            </p>
            <button
              onClick={() => router.push('/almoxarifado/catalogo')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ir para Catálogo
            </button>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Nova Requisição</h1>
            <p className="text-gray-600">
              Revise os itens e finalize sua requisição
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
            <span className="text-lg font-medium">{totalItems} itens</span>
          </div>
        </div>

        {/* Alertas de estoque */}
        {hasStockIssues && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800 font-medium">
                Alguns itens têm estoque insuficiente
              </span>
            </div>
          </div>
        )}

        {/* Lista de itens */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Itens da Requisição</h2>
            
            <div className="space-y-4">
              {cartItems.map((item) => {
                const validation = stockValidation.find(v => v.item_id === item.id)
                const hasStockIssue = validation && !validation.available

                return (
                  <div
                    key={item.id}
                    className={`flex items-center space-x-4 p-4 border rounded-lg ${
                      hasStockIssue ? 'border-red-200 bg-red-50' : 'border-gray-200'
                    }`}
                  >
                    {/* Imagem */}
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
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

                    {/* Informações do item */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.nome}</h3>
                      <p className="text-sm text-gray-600">{item.descricao}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-gray-500">
                          Categoria: {item.categoria}
                        </span>
                        <span className="text-sm text-gray-500">
                          Estoque: {item.estoque_atual} {item.unidade_medida}
                        </span>
                      </div>
                      
                      {hasStockIssue && validation && (
                        <div className="flex items-center mt-2">
                          <AlertCircle className="h-4 w-4 text-red-600 mr-1" />
                          <span className="text-sm text-red-600">
                            Estoque insuficiente (disponível: {validation.current_stock})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Controles de quantidade */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantidade - 1)}
                        className="p-1 rounded-lg border border-gray-300 hover:bg-gray-50"
                        disabled={item.quantidade <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      
                      <span className="w-12 text-center font-medium">
                        {item.quantidade}
                      </span>
                      
                      <button
                        onClick={() => updateQuantity(item.id, item.quantidade + 1)}
                        className="p-1 rounded-lg border border-gray-300 hover:bg-gray-50"
                        disabled={hasStockIssue || item.quantidade >= item.estoque_atual}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Remover item */}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Observações */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Observações</h2>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Adicione observações sobre sua requisição (opcional)"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
            />
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-4">
            <button
              onClick={() => router.push('/almoxarifado/catalogo')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Adicionar Mais Itens
            </button>
            
            <button
              onClick={clearCart}
              className="px-6 py-3 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
            >
              Limpar Carrinho
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || hasStockIssues || cartItems.length === 0}
            className="flex items-center space-x-2 bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                <span>Finalizar Requisição</span>
              </>
            )}
          </button>
        </div>
      </div>
      </div>
    </MainLayout>
  )
}

export default NovaRequisicao