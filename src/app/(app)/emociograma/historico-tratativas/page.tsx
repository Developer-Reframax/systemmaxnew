'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, AlertTriangle, User, Clock, FileText, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Usuario {
  matricula: number
  nome: string
  email: string
}

interface Alerta {
  id: string
  usuario_matricula: number
  usuario_nome: string
  estado_emocional: string
  observacoes: string
  created_at: string
  status: string
  usuario: Usuario
}

interface Responsavel {
  matricula: number
  nome: string
  email: string
  role: string
}

interface Tratativa {
  id: string
  alerta_id: string
  matricula_tratador: number
  tipo_tratativa: string
  observacoes_iniciais: string
  descricao_tratativa: string
  created_at: string
  alerta: Alerta
  responsavel: Responsavel
}

interface Filtros {
  nome: string
  dataInicio: string
  dataFim: string
}

export default function HistoricoTrativas() {
  const router = useRouter()
  const [tratativas, setTratativas] = useState<Tratativa[]>([])
  const [alertasPendentes, setAlertasPendentes] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState<Filtros>({
    nome: '',
    dataInicio: '',
    dataFim: ''
  })

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true)
      
      // Carregar tratativas com filtros
      const tratativasParams = new URLSearchParams({
        all: 'true',
        ...(filtros.nome && { nome: filtros.nome }),
        ...(filtros.dataInicio && { dataInicio: filtros.dataInicio }),
        ...(filtros.dataFim && { dataFim: filtros.dataFim })
      })

      const [tratativasRes, alertasRes] = await Promise.all([
        fetch(`/api/emociograma/tratativas?${tratativasParams}`, {
          method: 'GET'
        }),
        fetch('/api/emociograma/alertas?all=true&status=ativo', {
          method: 'GET'
        })
      ])

      if (tratativasRes.ok) {
        const tratativasData = await tratativasRes.json()
        setTratativas(tratativasData.data || [])
      }

      if (alertasRes.ok) {
        const alertasData = await alertasRes.json()
        setAlertasPendentes(alertasData.data || [])
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados do histórico')
    } finally {
      setLoading(false)
    }
  }, [filtros])

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Aplicar filtros quando mudarem
  useEffect(() => {
    const timer = setTimeout(() => {
      carregarDados()
    }, 500) // Debounce de 500ms

    return () => clearTimeout(timer)
  }, [carregarDados])

  const handleFiltroChange = (campo: keyof Filtros, valor: string) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }))
  }

  const limparFiltros = () => {
    setFiltros({
      nome: '',
      dataInicio: '',
      dataFim: ''
    })
  }



  const formatarDataHora = (data: string) => {
    return new Date(data).toLocaleString('pt-BR')
  }

  const getEstadoEmocionalColor = (estado: string) => {
    const colors = {
      'muito_ruim': 'bg-red-500 text-white',
      'ruim': 'bg-orange-500 text-white',
      'neutro': 'bg-yellow-500 text-white',
      'bom': 'bg-blue-500 text-white',
      'muito_bom': 'bg-green-500 text-white'
    }
    return colors[estado as keyof typeof colors] || 'bg-gray-500 text-white'
  }

  const getTipoTratativaLabel = (tipo: string) => {
    const labels = {
      'conversa': 'Conversa',
      'encaminhamento': 'Encaminhamento',
      'acompanhamento': 'Acompanhamento',
      'orientacao': 'Orientação'
    }
    return labels[tipo as keyof typeof labels] || tipo
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/emociograma')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Histórico de Tratativas</h1>
              <p className="text-gray-600">Visualização completa de tratativas e alertas pendentes</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Filtros de Busca</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Usuário
              </label>
              <input
                type="text"
                placeholder="Buscar por nome..."
                value={filtros.nome}
                onChange={(e) => handleFiltroChange('nome', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Início
              </label>
              <input
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => handleFiltroChange('dataInicio', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Fim
              </label>
              <input
                type="date"
                value={filtros.dataFim}
                onChange={(e) => handleFiltroChange('dataFim', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={limparFiltros}
                className="w-full px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Alertas Pendentes */}
        {alertasPendentes.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <h2 className="text-lg font-semibold text-orange-800">
                Alertas Pendentes ({alertasPendentes.length})
              </h2>
            </div>
            <div className="grid gap-4">
              {alertasPendentes.map((alerta) => (
                <div
                  key={alerta.id}
                  className="bg-white p-4 rounded-lg border border-orange-200 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{alerta.usuario_nome}</span>
                        </div>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoEmocionalColor(alerta.estado_emocional)}`}
                        >
                          {alerta.estado_emocional.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-2">{alerta.observacoes}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {formatarDataHora(alerta.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de Tratativas */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <h2 className="text-lg font-semibold">
                Histórico de Tratativas ({tratativas.length})
              </h2>
            </div>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : tratativas.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhuma tratativa encontrada com os filtros aplicados.
              </div>
            ) : (
              <div className="space-y-4">
                {tratativas.map((tratativa) => (
                  <div
                    key={tratativa.id}
                    className="bg-gray-50 p-4 rounded-lg border"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Informações do Alerta */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Alerta Original</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{tratativa.alerta?.usuario?.nome}</span>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoEmocionalColor(tratativa.alerta?.estado_emocional)}`}
                            >
                              {tratativa.alerta?.estado_emocional?.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{tratativa.alerta?.observacoes}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            Alerta: {formatarDataHora(tratativa.alerta?.created_at)}
                          </div>
                        </div>
                      </div>

                      {/* Informações da Tratativa */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Tratativa</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{tratativa.responsavel?.nome}</span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                              {getTipoTratativaLabel(tratativa.tipo_tratativa)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Observações Iniciais:</p>
                            <p className="text-sm text-gray-600">{tratativa.observacoes_iniciais}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Ação Tomada:</p>
                            <p className="text-sm text-gray-600">{tratativa.descricao_tratativa}</p>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            Tratativa: {formatarDataHora(tratativa.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
  )
}
