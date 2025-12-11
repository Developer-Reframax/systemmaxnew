'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Clock, Package, User, Calendar, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import MainLayout from '@/components/Layout/MainLayout'

interface RequisitionItem {
  id: string
  item_id: string
  quantidade_solicitada: number
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
  solicitante_matricula: string
  itens: RequisitionItem[]
  solicitante: {
    nome: string
    matricula: string
    letra?: string
    equipe?: string
  }
}

function Aprovacoes() {
  const router = useRouter()
  const { loading: authLoading } = useAuth()
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState(false)

  const loadPendingRequisitions = useCallback(async () => {
    try {
      const response = await fetch('/api/almoxarifado/requisitions/pending-approval', {
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
    loadPendingRequisitions()
  }, [loadPendingRequisitions])

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
      const quantidade = item?.quantidade_solicitada || 0
      return sum + (isNaN(quantidade) ? 0 : quantidade)
    }, 0)
  }

  const openModal = (requisition: Requisition, action: 'approve' | 'reject') => {
    setSelectedRequisition(requisition)
    setActionType(action)
    setRejectReason('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedRequisition(null)
    setActionType(null)
    setRejectReason('')
  }

  const handleAction = async () => {
    if (!selectedRequisition || !actionType) return

    if (actionType === 'reject' && !rejectReason.trim()) {
      toast.error('Motivo da rejeição é obrigatório')
      return
    }

    setProcessing(true)

    try {
      const endpoint = actionType === 'approve' ? 'aprovar' : 'rejeitar'
      const response = await fetch(`/api/almoxarifado/requisicoes/${selectedRequisition.id}/${endpoint}`, {
        method: 'PUT',
        body: JSON.stringify({
          acao: actionType === 'approve' ? 'aprovar' : 'rejeitar',
          observacoes_aprovacao: actionType === 'reject' ? rejectReason : undefined
        })
      })

      if (response.ok) {
        toast.success(
          actionType === 'approve'
            ? 'Requisição aprovada com sucesso!'
            : 'Requisição rejeitada com sucesso!'
        )

        // Remover da lista
        setRequisitions(prev => prev.filter(req => req.id !== selectedRequisition.id))
        closeModal()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erro ao processar requisição')
      }
    } catch (error) {
      console.error('Erro ao processar requisição:', error)
      toast.error('Erro interno do servidor')
    } finally {
      setProcessing(false)
    }
  }

  const openDetailsModal = (requisition: Requisition) => {
    setSelectedRequisition(requisition)
    setActionType(null)
    setShowModal(true)
  }

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando requisições...</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Clock className="h-8 w-8 text-orange-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Aprovações Pendentes</h1>
                <p className="text-gray-600">
                  {requisitions.length} {requisitions.length === 1 ? 'requisição' : 'requisições'} aguardando aprovação
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Requisições */}
        {requisitions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhuma requisição pendente
            </h2>
            <p className="text-gray-600">
              Todas as requisições foram processadas
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requisitions.map((requisition) => (
              <div key={requisition.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-sm font-mono text-gray-500">
                        #{requisition.id.slice(-8)}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Clock className="h-3 w-3 mr-1" />
                        Pendente
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Solicitante</p>
                          <p className="text-sm font-medium">{requisition.solicitante.nome}</p>
                          <p className="text-xs text-gray-500">
                            {requisition.solicitante.letra && requisition.solicitante.equipe &&
                              `${requisition.solicitante.letra} - ${requisition.solicitante.equipe}`
                            }
                          </p>
                        </div>
                      </div>

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
                    </div>

                    {/* Lista completa dos itens */}
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Itens Solicitados:</p>
                      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                        {requisition.itens && requisition.itens.length > 0 ? (
                          requisition.itens.map((item, index) => (
                            <div key={index} className="flex justify-between items-center bg-white p-2 rounded border">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{item.item?.nome || 'Item não identificado'}</p>
                                {item.item?.categoria && (
                                  <p className="text-xs text-gray-500">{item.item.categoria}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-blue-600">
                                  {item.quantidade_solicitada || 0} unidades
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 italic">Nenhum item encontrado</p>
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
                      onClick={() => openDetailsModal(requisition)}
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Detalhes</span>
                    </button>

                    <button
                      onClick={() => openModal(requisition, 'approve')}
                      className="flex items-center space-x-1 text-green-600 hover:text-green-700 px-3 py-2 rounded-lg hover:bg-green-50 transition-colors"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Aprovar</span>
                    </button>

                    <button
                      onClick={() => openModal(requisition, 'reject')}
                      className="flex items-center space-x-1 text-red-600 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Rejeitar</span>
                    </button>
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
                  <h2 className="text-xl font-bold text-gray-900">
                    {actionType === 'approve' && 'Aprovar Requisição'}
                    {actionType === 'reject' && 'Rejeitar Requisição'}
                    {!actionType && `Requisição #${selectedRequisition.id.slice(-8)}`}
                  </h2>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Informações do Solicitante */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Solicitante</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    Itens Solicitados ({getTotalItems(selectedRequisition)} total)
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
                          <p className="text-lg font-semibold text-gray-900">{item.quantidade_solicitada}</p>
                          <p className="text-xs text-gray-500">{item.item.unidade_medida}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Campo de motivo da rejeição */}
                {actionType === 'reject' && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Motivo da Rejeição *
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Descreva o motivo da rejeição..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      rows={4}
                      required
                    />
                  </div>
                )}

                {/* Ações do Modal */}
                <div className="flex items-center justify-end space-x-4">
                  <button
                    onClick={closeModal}
                    className="px-6 py-2 text-gray-600 hover:text-gray-700"
                  >
                    Cancelar
                  </button>

                  {actionType && (
                    <button
                      onClick={handleAction}
                      disabled={processing || (actionType === 'reject' && !rejectReason.trim())}
                      className={`px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${actionType === 'approve'
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-red-600 text-white hover:bg-red-700'
                        }`}
                    >
                      {processing ? 'Processando...' : (
                        actionType === 'approve' ? 'Confirmar Aprovação' : 'Confirmar Rejeição'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}

export default Aprovacoes