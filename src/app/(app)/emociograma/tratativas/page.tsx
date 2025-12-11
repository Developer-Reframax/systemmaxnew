'use client'

import { useState, useEffect } from 'react'
import { 
  MessageSquare, 
  AlertTriangle,
  Clock,
  CheckCircle,
  Plus,
  Smile,
  Meh,
  Frown,
  ArrowLeft
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Alerta {
  id: string
  usuario_matricula: number
  estado_emocional: 'regular' | 'pessimo'
  observacoes?: string
  status: 'ativo' | 'em_tratamento' | 'resolvido'
  data_registro: string
  usuario: {
    matricula: number
    nome: string
    email: string
  }
}

interface Tratativa {
  id: string
  alerta_id: string
  responsavel_matricula: number
  tipo_tratativa: 'conversa' | 'encaminhamento' | 'acompanhamento' | 'orientacao'
  descricao: string
  acao_tomada?: string
  data_tratativa: string
  alerta: Alerta
  responsavel: {
    matricula: number
    nome: string
    email: string
    role: string
  }
}

export default function EmociogramaTratativas() {
  const router = useRouter()
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [tratativas, setTratativas] = useState<Tratativa[]>([])
  const [loading, setLoading] = useState(true)
  const [showNovatTrativa, setShowNovaTratativa] = useState(false)
  const [alertaSelecionado, setAlertaSelecionado] = useState<Alerta | null>(null)
  const [novaTratativa, setNovaTratativa] = useState({
    tipo_tratativa: '',
    descricao: '',
    acao_tomada: ''
  })

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      setLoading(true)
      
      // Carregar alertas ativos
      const alertasResponse = await fetch('/api/emociograma/alertas?status=ativo,em_tratamento', {
        method: 'GET'
      })
      
      if (alertasResponse.ok) {
        const alertasData = await alertasResponse.json()
        setAlertas(alertasData.data || [])
      }

      // Carregar tratativas
      const tratativasResponse = await fetch('/api/emociograma/tratativas', {
       method: 'GET'
      })
      
      if (tratativasResponse.ok) {
        const tratativasData = await tratativasResponse.json()
        setTratativas(tratativasData.data || [])
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados das tratativas')
    } finally {
      setLoading(false)
    }
  }

  const criarTratativa = async () => {
    if (!alertaSelecionado || !novaTratativa.tipo_tratativa || !novaTratativa.descricao || !novaTratativa.acao_tomada) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    try {
      const response = await fetch('/api/emociograma/tratativas', {
        method: 'POST',
        body: JSON.stringify({
          alerta_id: alertaSelecionado.id,
          ...novaTratativa
        })
      })

      if (response.ok) {
        toast.success('Tratativa criada com sucesso')
        setShowNovaTratativa(false)
        setAlertaSelecionado(null)
        setNovaTratativa({
          tipo_tratativa: '',
          descricao: '',
          acao_tomada: ''
        })
        carregarDados()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erro ao criar tratativa')
      }
    } catch (error) {
      console.error('Erro ao criar tratativa:', error)
      toast.error('Erro ao criar tratativa')
    }
  }

  const getEmoticonIcon = (estado: string, size = 20) => {
    switch (estado) {
      case 'bem':
        return <Smile size={size} className="text-green-500" />
      case 'regular':
        return <Meh size={size} className="text-yellow-500" />
      case 'pessimo':
        return <Frown size={size} className="text-red-500" />
      default:
        return <Meh size={size} className="text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'em_tratamento':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'resolvido':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'Ativo'
      case 'em_tratamento':
        return 'Em Tratamento'
      case 'resolvido':
        return 'Resolvido'
      default:
        return 'Desconhecido'
    }
  }

  const getTipoTrativaLabel = (tipo: string) => {
    switch (tipo) {
      case 'conversa':
        return 'Conversa'
      case 'encaminhamento':
        return 'Encaminhamento'
      case 'acompanhamento':
        return 'Acompanhamento'
      case 'orientacao':
        return 'Orientação'
      default:
        return tipo
    }
  }

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    )
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/emociograma')}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tratativas de Emociograma</h1>
              <p className="text-gray-600">Gerencie e acompanhe as tratativas dos alertas emocionais</p>
            </div>
          </div>
        </div>

        {/* Alertas pendentes */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" />
            <h3 className="text-lg font-semibold">Alertas Pendentes ({alertas.filter(a => a.status === 'ativo').length})</h3>
          </div>
          <div>
            {alertas.filter(a => a.status === 'ativo').length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum alerta pendente</h3>
                <p className="text-gray-600">
                  Todos os alertas estão sendo tratados ou foram resolvidos.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {alertas.filter(a => a.status === 'ativo').map((alerta) => (
                  <div
                    key={alerta.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-4">
                      {getEmoticonIcon(alerta.estado_emocional, 24)}
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold">{alerta.usuario?.nome || 'Usuário não identificado'}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(alerta.status)}`}>
                            {getStatusLabel(alerta.status)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Matrícula: {alerta.usuario?.matricula || alerta.usuario_matricula} • {' '}
                          {alerta.data_registro ? new Date(alerta.data_registro).toLocaleString('pt-BR') : 'Data não disponível'}
                        </p>
                        {alerta.observacoes && (
                          <p className="text-sm text-gray-700 mt-1 italic">
                            "{alerta.observacoes}"
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setAlertaSelecionado(alerta)
                        setShowNovaTratativa(true)
                      }}
                      className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Iniciar Tratativa
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Alertas em tratamento */}
        {alertas.filter(a => a.status === 'em_tratamento').length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Clock className="w-5 h-5 mr-2 text-blue-500" />
              <h3 className="text-lg font-semibold">Em Tratamento ({alertas.filter(a => a.status === 'em_tratamento').length})</h3>
            </div>
            <div>
              <div className="space-y-4">
                {alertas.filter(a => a.status === 'em_tratamento').map((alerta) => (
                  <div
                    key={alerta.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-blue-50"
                  >
                    <div className="flex items-center space-x-4">
                      {getEmoticonIcon(alerta.estado_emocional, 24)}
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold">{alerta.usuario?.nome || 'Usuário não identificado'}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(alerta.status)}`}>
                            {getStatusLabel(alerta.status)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Matrícula: {alerta.usuario?.matricula || alerta.usuario_matricula} • {' '}
                          {alerta.data_registro ? new Date(alerta.data_registro).toLocaleString('pt-BR') : 'Data não disponível'}
                        </p>
                        {alerta.observacoes && (
                          <p className="text-sm text-gray-700 mt-1 italic">
                            "{alerta.observacoes}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Histórico de tratativas */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <MessageSquare className="w-5 h-5 mr-2" />
            <h3 className="text-lg font-semibold">Histórico de Tratativas ({tratativas.length})</h3>
          </div>
          <div>
            {tratativas.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma tratativa registrada</h3>
                <p className="text-gray-600">
                  As tratativas realizadas aparecerão aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {tratativas.map((tratativa) => (
                  <div
                    key={tratativa.id}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getEmoticonIcon(tratativa.alerta?.estado_emocional || 'regular', 20)}
                        <div>
                          <h3 className="font-semibold">{tratativa.alerta?.usuario?.nome || 'Usuário não identificado'}</h3>
                          <p className="text-sm text-gray-600">
                            Tratativa por: {tratativa.responsavel?.nome || 'Responsável não identificado'} ({tratativa.responsavel?.role || 'N/A'})
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-1 border border-gray-300 rounded text-xs">
                          {getTipoTrativaLabel(tratativa.tipo_tratativa)}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(tratativa.data_tratativa).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-md">
                      <h4 className="font-medium text-sm mb-2">Descrição:</h4>
                      <p className="text-sm text-gray-700">{tratativa.descricao}</p>
                      
                      {tratativa.acao_tomada && (
                        <>
                          <h4 className="font-medium text-sm mt-3 mb-2">Ação Tomada:</h4>
                          <p className="text-sm text-gray-700">{tratativa.acao_tomada}</p>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal para nova tratativa */}
        {showNovatTrativa && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Nova Tratativa</h2>
              </div>
              
              {alertaSelecionado && (
                <div className="space-y-4">
                  {/* Informações do alerta */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3 mb-2">
                      {getEmoticonIcon(alertaSelecionado.estado_emocional, 24)}
                      <div>
                        <h3 className="font-semibold">{alertaSelecionado.usuario.nome}</h3>
                        <p className="text-sm text-gray-600">
                          Matrícula: {alertaSelecionado.usuario.matricula}
                        </p>
                      </div>
                    </div>
                    {alertaSelecionado.observacoes && (
                      <p className="text-sm text-gray-700 italic">
                        "{alertaSelecionado.observacoes}"
                      </p>
                    )}
                  </div>

                  {/* Formulário da tratativa */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Tipo de Tratativa *</label>
                    <select 
                      value={novaTratativa.tipo_tratativa} 
                      onChange={(e) => setNovaTratativa(prev => ({ ...prev, tipo_tratativa: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Selecione o tipo de tratativa</option>
                      <option value="conversa">Conversa</option>
                      <option value="encaminhamento">Encaminhamento</option>
                      <option value="acompanhamento">Acompanhamento</option>
                      <option value="orientacao">Orientação</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Descrição do Problema *</label>
                    <textarea
                      value={novaTratativa.descricao}
                      onChange={(e) => setNovaTratativa(prev => ({ ...prev, descricao: e.target.value }))}
                      placeholder="Descreva o problema identificado..."
                      rows={4}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Ação Tomada *</label>
                    <textarea
                      value={novaTratativa.acao_tomada}
                      onChange={(e) => setNovaTratativa(prev => ({ ...prev, acao_tomada: e.target.value }))}
                      placeholder="Descreva as ações específicas tomadas..."
                      rows={3}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                      onClick={() => {
                        setShowNovaTratativa(false)
                        setAlertaSelecionado(null)
                        setNovaTratativa({
                          tipo_tratativa: '',
                          descricao: '',
                          acao_tomada: ''
                        })
                      }}
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={criarTratativa}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Criar Tratativa
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
  )
}
