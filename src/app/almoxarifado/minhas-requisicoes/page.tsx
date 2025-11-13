'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Clock, CheckCircle, XCircle, Truck, Eye, Calendar, User } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import MainLayout from '@/components/Layout/MainLayout'

interface RequisitionItem {
  id: string
  item_id: string
  quantidade: number
  item: {
    nome: string
    descricao: string
    categoria: string
    unidade_medida: string
    imagem_url?: string
  }
}

interface Requisition {
  id: string
  status: 'pendente' | 'aprovada' | 'rejeitada' | 'entregue'
  observacoes?: string
  created_at: string
  updated_at: string
  aprovador_matricula?: string
  data_aprovacao?: string
  entregue_por_matricula?: string
  entregue_em?: string
  motivo_rejeicao?: string
  itens: RequisitionItem[]
  aprovador?: {
    nome: string
    matricula: string
  }
  entregue_por?: {
    nome: string
    matricula: string
  }
}

const statusConfig = {
  pendente: {
    label: 'Pendente',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock
  },
  aprovada: {
    label: 'Aprovada',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle
  },
  rejeitada: {
    label: 'Rejeitada',
    color: 'bg-red-100 text-red-800',
    icon: XCircle
  },
  entregue: {
    label: 'Entregue',
    color: 'bg-blue-100 text-blue-800',
    icon: Truck
  }
}

function MinhasRequisicoes() {
  const router = useRouter()
  const { loading: authLoading } = useAuth()
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState<string>('todas')

  const loadRequisitions = useCallback(async () => {
    try {
      const response = await fetch('/api/almoxarifado/requisicoes/my', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        // Verificar se a resposta tem a estrutura esperada
        if (result.success && Array.isArray(result.data)) {
          setRequisitions(result.data)
        } else if (Array.isArray(result)) {
          // Fallback para resposta direta como array
          setRequisitions(result)
        } else {
          console.error('Formato de dados inválido:', result)
          setRequisitions([])
          toast.error('Erro no formato dos dados recebidos')
        }
      } else {
        console.error('Erro na resposta:', response.status)
        setRequisitions([])
        toast.error('Erro ao carregar requisições')
      }
    } catch (error) {
      console.error('Erro ao carregar requisições:', error)
      setRequisitions([])
      toast.error('Erro interno do servidor')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRequisitions()
  }, [loadRequisitions])

  const filteredRequisitions = requisitions.filter(req => {
    if (filter === 'todas') return true
    return req.status === filter
  })

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
    if (!requisition || !requisition.itens || !Array.isArray(requisition.itens)) {
      return 0
    }
    return requisition.itens.reduce((sum, item) => {
      const quantidade = item?.quantidade || 0
      return sum + (isNaN(quantidade) ? 0 : quantidade)
    }, 0)
  }

  const openModal = (requisition: Requisition) => {
    setSelectedRequisition(requisition)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedRequisition(null)
  }

  if (loading || authLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando requisições...</p>
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
                <h1 className="text-2xl font-bold text-gray-900">Minhas Requisições</h1>
                <p className="text-gray-600">
                  {requisitions.length} {requisitions.length === 1 ? 'requisição' : 'requisições'} encontradas
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/almoxarifado/catalogo')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Nova Requisição
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Filtrar por status:</span>
            <div className="flex space-x-2">
              {[
                { key: 'todas', label: 'Todas' },
                { key: 'pendente', label: 'Pendentes' },
                { key: 'aprovada', label: 'Aprovadas' },
                { key: 'rejeitada', label: 'Rejeitadas' },
                { key: 'entregue', label: 'Entregues' }
              ].map(option => (
                <button
                  key={option.key}
                  onClick={() => setFilter(option.key)}
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
        </div>

        {/* Lista de Requisições */}
        {filteredRequisitions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {filter === 'todas' ? 'Nenhuma requisição encontrada' : `Nenhuma requisição ${filter}`}
            </h2>
            <p className="text-gray-600 mb-6">
              {filter === 'todas' 
                ? 'Crie sua primeira requisição no catálogo de itens'
                : 'Não há requisições com este status'
              }
            </p>
            {filter === 'todas' && (
              <button
                onClick={() => router.push('/almoxarifado/catalogo')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ir para Catálogo
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequisitions.map((requisition) => {
              const StatusIcon = statusConfig[requisition.status].icon
              
              return (
                <div key={requisition.id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="text-sm font-mono text-gray-500">
                          #{requisition.id.slice(-8)}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[requisition.status].color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig[requisition.status].label}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Criada em</p>
                            <p className="text-sm font-medium">{formatDate(requisition.created_at)}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Package className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Total de itens</p>
                            <p className="text-sm font-medium">{getTotalItems(requisition)}</p>
                          </div>
                        </div>

                        {requisition.aprovador && (
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-xs text-gray-500">
                                {requisition.status === 'rejeitada' ? 'Rejeitada por' : 'Aprovada por'}
                              </p>
                              <p className="text-sm font-medium">{requisition.aprovador.nome}</p>
                            </div>
                          </div>
                        )}

                        {requisition.entregue_por && (
                          <div className="flex items-center space-x-2">
                            <Truck className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-xs text-gray-500">Entregue por</p>
                              <p className="text-sm font-medium">{requisition.entregue_por.nome}</p>
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
                              {item.quantidade}x {item.item.nome}
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
                          <p className="text-sm text-gray-700">{requisition.observacoes}</p>
                        </div>
                      )}

                      {/* Motivo da rejeição */}
                      {requisition.status === 'rejeitada' && requisition.motivo_rejeicao && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-xs text-red-600 font-medium mb-1">Motivo da rejeição:</p>
                          <p className="text-sm text-red-700">{requisition.motivo_rejeicao}</p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => openModal(requisition)}
                      className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Ver Detalhes</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Modal de Detalhes */}
        {showModal && selectedRequisition && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-xl font-bold text-gray-900">
                      Requisição #{selectedRequisition.id.slice(-8)}
                    </h2>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[selectedRequisition.status].color}`}>
                      {statusConfig[selectedRequisition.status].label}
                    </span>
                  </div>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Informações da Requisição */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Informações</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-gray-500">Criada em:</span>
                        <span className="ml-2 text-sm font-medium">{formatDate(selectedRequisition.created_at)}</span>
                      </div>
                      {selectedRequisition.data_aprovacao && (
                        <div>
                          <span className="text-sm text-gray-500">
                            {selectedRequisition.status === 'rejeitada' ? 'Rejeitada em:' : 'Aprovada em:'}
                          </span>
                          <span className="ml-2 text-sm font-medium">{formatDate(selectedRequisition.data_aprovacao)}</span>
                        </div>
                      )}
                      {selectedRequisition.entregue_em && (
                        <div>
                          <span className="text-sm text-gray-500">Entregue em:</span>
                          <span className="ml-2 text-sm font-medium">{formatDate(selectedRequisition.entregue_em)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Responsáveis</h3>
                    <div className="space-y-2">
                      {selectedRequisition.aprovador && (
                        <div>
                          <span className="text-sm text-gray-500">
                            {selectedRequisition.status === 'rejeitada' ? 'Rejeitada por:' : 'Aprovada por:'}
                          </span>
                          <span className="ml-2 text-sm font-medium">{selectedRequisition.aprovador.nome}</span>
                        </div>
                      )}
                      {selectedRequisition.entregue_por && (
                        <div>
                          <span className="text-sm text-gray-500">Entregue por:</span>
                          <span className="ml-2 text-sm font-medium">{selectedRequisition.entregue_por.nome}</span>
                        </div>
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

                {/* Motivo da rejeição */}
                {selectedRequisition.status === 'rejeitada' && selectedRequisition.motivo_rejeicao && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-red-900 mb-3">Motivo da Rejeição</h3>
                    <p className="text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">
                      {selectedRequisition.motivo_rejeicao}
                    </p>
                  </div>
                )}

                {/* Lista de Itens */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Itens ({getTotalItems(selectedRequisition)} total)
                  </h3>
                  <div className="space-y-3">
                    {selectedRequisition.itens.map((item) => (
                      <div key={item.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
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
                          <p className="text-sm text-gray-600">{item.item.descricao}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-xs text-gray-500">Categoria: {item.item.categoria}</span>
                            <span className="text-xs text-gray-500">Unidade: {item.item.unidade_medida}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">{item.quantidade}</p>
                          <p className="text-xs text-gray-500">{item.item.unidade_medida}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </MainLayout>
  )
}

export default MinhasRequisicoes