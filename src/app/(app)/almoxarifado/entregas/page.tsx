'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Truck, Package, CheckCircle, User, Calendar, Clock, Eye, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

interface RequisitionItem {
  id: string
  quantidade_solicitada: number
  quantidade_entregue: number
  preco_unitario: number
  subtotal: number
  item: {
    id: string
    nome: string
    categoria: string
    imagem_url?: string
  }
}

interface Requisition {
  id: string
  status: 'pendente' | 'aprovada' | 'entregue' | 'parcialmente_entregue'
  observacoes?: string
  created_at: string
  data_aprovacao: string
  entregue_em?: string
  solicitante_matricula: string
  aprovador_matricula: string
  entregue_por_matricula?: string
  itens: RequisitionItem[]
  solicitante: {
    nome: string
    matricula: string
    letra?: string
    equipe?: string
  }
  aprovador: {
    nome: string
    matricula: string
  }
  entregue_por?: {
    nome: string
    matricula: string
  }
}

function Entregas() {
  const { loading: authLoading } = useAuth()
  const router = useRouter()
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [filter, setFilter] = useState<'pendente' | 'aprovada' | 'entregue' | 'todas'>('aprovada')
  const [searchName, setSearchName] = useState('')
  
  // Estados para controle da entrega
  const [deliveryQuantities, setDeliveryQuantities] = useState<Record<string, number>>({})
  const [deliveryObservations, setDeliveryObservations] = useState('')

  const loadRequisitions = useCallback(async () => {
    try {
      const response = await fetch('/api/almoxarifado/requisitions/for-delivery', {
       method: 'GET'
      })

      if (response.ok) {
        const data = await response.json()
        // Ensure data is always an array
        if (Array.isArray(data)) {
          setRequisitions(data)
        } else if (data && Array.isArray(data.data)) {
          setRequisitions(data.data)
        } else {
          console.warn('API response is not an array:', data)
          setRequisitions([])
        }
      } else if (response.status === 403) {
        toast.error('Você não tem permissão para acessar esta página')
        router.push('/almoxarifado')
      } else {
        toast.error('Erro ao carregar requisições')
        setRequisitions([])
      }
    } catch (error) {
      console.error('Erro ao carregar requisições:', error)
      toast.error('Erro interno do servidor')
      setRequisitions([])
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadRequisitions()
  }, [loadRequisitions])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTotalItems = (requisition: Requisition) => {
    return requisition.itens.reduce((sum, item) => sum + item.quantidade_solicitada, 0)
  }

  const openModal = (requisition: Requisition) => {
    setSelectedRequisition(requisition)
    
    // Inicializar quantidades de entrega com as quantidades solicitadas
    const initialQuantities: Record<string, number> = {}
    requisition.itens.forEach(item => {
      initialQuantities[item.id] = item.quantidade_solicitada
    })
    setDeliveryQuantities(initialQuantities)
    setDeliveryObservations('')
    
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedRequisition(null)
    setDeliveryQuantities({})
    setDeliveryObservations('')
  }

  const handleDelivery = async () => {
    if (!selectedRequisition) return
    
    // Validação: verificar se todas as quantidades são válidas
    const hasInvalidQuantity = selectedRequisition.itens.some(item => {
      const deliveryQty = deliveryQuantities[item.id] || 0
      return deliveryQty < 0 || deliveryQty > item.quantidade_solicitada
    })

    if (hasInvalidQuantity) {
      toast.error('Verifique as quantidades de entrega. Não é possível entregar mais que o solicitado ou quantidades negativas.')
      return
    }

    // Verificar se pelo menos um item tem quantidade > 0
    const hasItemsToDeliver = selectedRequisition.itens.some(item => {
      const deliveryQty = deliveryQuantities[item.id] || 0
      return deliveryQty > 0
    })

    if (!hasItemsToDeliver) {
      toast.error('Selecione pelo menos um item para entrega.')
      return
    }

    setProcessing(true)

    try {
      // Preparar os itens entregues no formato esperado pela API
      const itens_entregues = selectedRequisition.itens
        .filter(item => {
          const deliveryQty = deliveryQuantities[item.id] || 0
          return deliveryQty > 0
        })
        .map(item => ({
          requisicao_item_id: item.id,
          quantidade_entregue: deliveryQuantities[item.id] || 0
        }))

      const requestBody = {
        itens_entregues,
        observacoes_entrega: deliveryObservations.trim() || null
      }

      const response = await fetch(`/api/almoxarifado/requisicoes/${selectedRequisition.id}/entregar`, {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        toast.success('Entrega registrada com sucesso!')
        closeModal()
        loadRequisitions()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Erro ao registrar entrega')
      }
    } catch (error) {
      console.error('Erro ao registrar entrega:', error)
      toast.error('Erro ao registrar entrega')
    } finally {
      setProcessing(false)
    }
  }

  const filteredRequisitions = requisitions.filter(req => {
    if (filter === 'todas') return true
    if (filter === 'entregue') {
      return req.status === 'entregue' || req.status === 'parcialmente_entregue'
    }
    return req.status === filter
  }).filter(req => {
    const termo = searchName.trim().toLowerCase()
    if (!termo) return true
    return req.solicitante.nome.toLowerCase().includes(termo)
  })

  if (loading || authLoading) {
    return (
      
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando entregas...</p>
            </div>
          </div>
        </div>
      
    )
  }

  return (
    
      <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Truck className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Controle de Entregas</h1>
                <p className="text-gray-600">
                  {requisitions.filter(r => r.status === 'aprovada').length} requisiÇõÇæes aguardando entrega
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
              <span className="text-sm font-medium text-gray-700">Filtrar por status:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'pendente', label: 'Aguardando AprovaÇõÇœo' },
                  { key: 'aprovada', label: 'Aguardando Entrega' },
                  { key: 'entregue', label: 'Entregues' },
                  { key: 'todas', label: 'Todas' }
                ].map(option => (
                  <button
                    key={option.key}
                    onClick={() => setFilter(option.key as 'pendente' | 'aprovada' | 'entregue' | 'todas')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filter === option.key
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full md:max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por solicitante
              </label>
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Digite o nome do solicitante"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Lista de Requisições */}
        {filteredRequisitions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Truck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {filter === 'pendente' ? 'Nenhuma requisição aguardando aprovação' :
               filter === 'aprovada' ? 'Nenhuma entrega pendente' : 
               filter === 'entregue' ? 'Nenhuma entrega registrada' : 
               'Nenhuma requisição encontrada'}
            </h2>
            <p className="text-gray-600">
              {filter === 'pendente' ? 'Todas as requisições foram aprovadas' :
               filter === 'aprovada' ? 'Todas as requisições foram entregues' : 
               filter === 'entregue' ? 'Ainda não há entregas registradas' : 
               'Não há requisições para entrega'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequisitions.map((requisition) => (
              <div key={requisition.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-sm font-mono text-gray-500">
                        #{requisition.id.slice(-8)}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        requisition.status === 'pendente'
                          ? 'bg-orange-100 text-orange-800'
                          : requisition.status === 'aprovada' 
                          ? 'bg-green-100 text-green-800'
                          : requisition.status === 'parcialmente_entregue'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {requisition.status === 'pendente' ? (
                          <>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Aguardando Aprovação
                          </>
                        ) : requisition.status === 'aprovada' ? (
                          <>
                            <Clock className="h-3 w-3 mr-1" />
                            Aguardando Entrega
                          </>
                        ) : requisition.status === 'parcialmente_entregue' ? (
                          <>
                            <Package className="h-3 w-3 mr-1" />
                            Parcialmente Entregue
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Entregue
                          </>
                        )}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Solicitante</p>
                          <p className="text-sm font-medium">{requisition.solicitante.nome}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          {requisition.status !== 'pendente' ? (
                            <>
                              <p className="text-xs text-gray-500">Aprovada em</p>
                              <p className="text-sm font-medium">{formatDate(requisition.data_aprovacao)}</p>
                            </>
                          ) : (
                            <>
                              <p className="text-xs text-gray-500">Status</p>
                              <p className="text-sm font-medium text-orange-600">Aguardando aprovação</p>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Total de itens</p>
                          <p className="text-sm font-medium">{getTotalItems(requisition)}</p>
                        </div>
                      </div>

                      {requisition.entregue_em && (
                        <div className="flex items-center space-x-2">
                          <Truck className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Entregue em</p>
                            <p className="text-sm font-medium">{formatDate(requisition.entregue_em)}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Preview dos itens */}
                    <div className="flex items-center space-x-2 mb-4">
                      <span className="text-sm text-gray-600">Itens:</span>
                      <div className="flex space-x-2">
                        {requisition.itens.slice(0, 3).map((item, index) => (
                          <span key={index} className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {item.quantidade_solicitada}x {item.item.nome}
                          </span>
                        ))}
                        {requisition.itens.length > 3 && (
                          <span className="text-sm text-gray-500">
                            +{requisition.itens.length - 3} mais
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Observações */}
                    {requisition.observacoes && (
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-1">Observações:</p>
                        <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                          {requisition.observacoes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => openModal(requisition)}
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Ver Detalhes</span>
                    </button>
                    
                    {requisition.status === 'aprovada' && (
                      <button
                        onClick={() => openModal(requisition)}
                        className="flex items-center space-x-1 text-green-600 hover:text-green-700 px-3 py-2 rounded-lg hover:bg-green-50 transition-colors"
                      >
                        <Truck className="h-4 w-4" />
                        <span>Registrar Entrega</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && selectedRequisition && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-xl font-bold text-gray-900">
                      Requisição #{selectedRequisition.id.slice(-8)}
                    </h2>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedRequisition.status === 'pendente'
                        ? 'bg-orange-100 text-orange-800'
                        : selectedRequisition.status === 'aprovada' 
                        ? 'bg-green-100 text-green-800'
                        : selectedRequisition.status === 'parcialmente_entregue'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {selectedRequisition.status === 'pendente' ? 'Aguardando Aprovação' :
                       selectedRequisition.status === 'aprovada' ? 'Aguardando Entrega' :
                       selectedRequisition.status === 'parcialmente_entregue' ? 'Parcialmente Entregue' : 'Entregue'}
                    </span>
                  </div>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Informações da Requisição */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Solicitante</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-gray-500">Nome:</span>
                        <span className="ml-2 text-sm font-medium">{selectedRequisition.solicitante.nome}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Matrícula:</span>
                        <span className="ml-2 text-sm font-medium">{selectedRequisition.solicitante.matricula}</span>
                      </div>
                      {selectedRequisition.solicitante.letra && (
                        <div>
                          <span className="text-sm text-gray-500">Letra:</span>
                          <span className="ml-2 text-sm font-medium">{selectedRequisition.solicitante.letra}</span>
                        </div>
                      )}
                      {selectedRequisition.solicitante.equipe && (
                        <div>
                          <span className="text-sm text-gray-500">Equipe:</span>
                          <span className="ml-2 text-sm font-medium">{selectedRequisition.solicitante.equipe}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Histórico</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-gray-500">Criada em:</span>
                        <span className="ml-2 text-sm font-medium">{formatDate(selectedRequisition.created_at)}</span>
                      </div>
                      {selectedRequisition.status !== 'pendente' ? (
                        <>
                          <div>
                            <span className="text-sm text-gray-500">Aprovada por:</span>
                            <span className="ml-2 text-sm font-medium">{selectedRequisition.aprovador?.nome || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Aprovada em:</span>
                            <span className="ml-2 text-sm font-medium">{formatDate(selectedRequisition.data_aprovacao)}</span>
                          </div>
                        </>
                      ) : (
                        <div>
                          <span className="text-sm text-gray-500">Status:</span>
                          <span className="ml-2 text-sm font-medium text-orange-600">Aguardando aprovação</span>
                        </div>
                      )}
                      {selectedRequisition.entregue_em && selectedRequisition.entregue_por && (
                        <>
                          <div>
                            <span className="text-sm text-gray-500">Entregue por:</span>
                            <span className="ml-2 text-sm font-medium">{selectedRequisition.entregue_por.nome}</span>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Entregue em:</span>
                            <span className="ml-2 text-sm font-medium">{formatDate(selectedRequisition.entregue_em)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Observações */}
                {selectedRequisition.observacoes && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Observações</h3>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedRequisition.observacoes}</p>
                  </div>
                )}

                {/* Lista de Itens */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Itens para Entrega ({getTotalItems(selectedRequisition)} total)
                  </h3>
                  <div className="space-y-3">
                    {selectedRequisition.itens.map((item) => (
                      <div key={item.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg border">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                          {item.item.imagem_url ? (
                            <img
                              src={item.item.imagem_url}
                              alt={item.item.nome}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Package className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{item.item.nome}</h4>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-xs text-gray-500">Categoria: {item.item.categoria}</span>
                            <span className="text-xs text-gray-500">Preço unitário: R$ {item.preco_unitario.toFixed(2)}</span>
                            <span className="text-xs text-gray-500">Subtotal: R$ {item.subtotal.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-900">{item.quantidade_solicitada}</p>
                            <p className="text-xs text-gray-500">solicitado</p>
                          </div>
                          {selectedRequisition.status === 'aprovada' ? (
                            <div className="flex flex-col items-center space-y-1">
                              <label className="text-xs text-gray-500">Entregar:</label>
                              <input
                                type="number"
                                min="0"
                                max={item.quantidade_solicitada}
                                value={deliveryQuantities[item.id] || 0}
                                onChange={(e) => {
                                  const value = Math.min(
                                    Math.max(0, parseInt(e.target.value) || 0),
                                    item.quantidade_solicitada
                                  )
                                  setDeliveryQuantities(prev => ({
                                    ...prev,
                                    [item.id]: value
                                  }))
                                }}
                                className="w-20 px-2 py-1 text-center border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          ) : (
                            <div className="text-center">
                              {item.quantidade_entregue > 0 && (
                                <>
                                  <p className="text-sm font-medium text-green-600">{item.quantidade_entregue}</p>
                                  <p className="text-xs text-gray-500">entregue</p>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Campo de Observações da Entrega */}
                {selectedRequisition.status === 'aprovada' && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Observações da Entrega</h3>
                    <textarea
                      value={deliveryObservations}
                      onChange={(e) => setDeliveryObservations(e.target.value)}
                      placeholder="Digite observações sobre a entrega (opcional)..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                  </div>
                )}

                {/* Ações do Modal */}
                <div className="flex items-center justify-end space-x-4">
                  <button
                    onClick={closeModal}
                    className="px-6 py-2 text-gray-600 hover:text-gray-700"
                  >
                    Fechar
                  </button>
                  
                  {selectedRequisition.status === 'aprovada' && (
                    <button
                      onClick={handleDelivery}
                      disabled={processing}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {processing ? 'Registrando...' : 'Confirmar Entrega'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    
  )
}

export default Entregas

