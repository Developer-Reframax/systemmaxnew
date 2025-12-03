'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/Layout/MainLayout'
import ModalRegistro from '@/components/emociograma/ModalRegistro'
import { useAuth } from '@/hooks/useAuth'
import { 
  Smile, 
  Meh, 
  Frown, 
  Plus, 
  TrendingUp, 
  AlertTriangle,
  Clock,
  Users,
  BarChart3,
  MessageCircle,
  FileText,
  Play
} from 'lucide-react'
import { toast } from 'sonner'

interface EmociogramaStats {
  resumo: {
    total_registros: number
    bem: number
    regular: number
    pessimo: number
  }
  tendencia: Array<{
    data: string
    bem: number
    regular: number
    pessimo: number
    total: number
  }>
  alertas: {
    ativos: number
    resolvidos: number
    em_tratamento: number
  }
}

interface UltimoRegistro {
  id: string
  estado_emocional: 'bem' | 'regular' | 'pessimo'
  observacoes?: string
  data_registro: string
}

export default function EmociogramaDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<EmociogramaStats | null>(null)
  const [ultimoRegistro, setUltimoRegistro] = useState<UltimoRegistro | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [canCreateToday, setCanCreateToday] = useState(false)

  useEffect(() => {
    if (user) {
      carregarDados()
    }
  }, [user])

  const carregarDados = async () => {
    try {
      setLoading(true)
      const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      
      // Carregar estatísticas
      const statsResponse = await fetch('/api/emociograma/stats?periodo=7d&escopo=individual', {
        headers: {
          'Authorization': `Bearer ${auth_token}`
        }
      })
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()

        setStats(statsData.data)
      } else {
        console.error('Erro na API de stats:', statsResponse.status, statsResponse.statusText)
      }

      // Carregar último registro
      const registroResponse = await fetch('/api/emociograma?limit=1', {
        headers: {
          'Authorization': `Bearer ${auth_token}`
        }
      })
      
      if (registroResponse.ok) {
        const registroData = await registroResponse.json()
        if (registroData.emociogramas && registroData.emociogramas.length > 0) {
          setUltimoRegistro(registroData.emociogramas[0])
          
          // Verificar se pode criar novo registro hoje
          const ultimaData = new Date(registroData.emociogramas[0].data_registro)
          const hoje = new Date()
          const podeRegistrar = ultimaData.toDateString() !== hoje.toDateString()
          setCanCreateToday(podeRegistrar)
        } else {
          setCanCreateToday(true)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados do emociograma')
    } finally {
      setLoading(false)
    }
  }

  const getEmoticonIcon = (estado: string, size = 24) => {
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

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    try {
      // Criar data local sem conversão de timezone
      const date = new Date(dateString + 'T00:00:00')
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    } catch {
      return '-'
    }
  }

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'bem':
        return 'Muito bem'
      case 'regular':
        return 'Regular'
      case 'pessimo':
        return 'Péssimo'
      default:
        return 'Não informado'
    }
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'bem':
        return 'bg-green-100 text-green-800'
      case 'regular':
        return 'bg-yellow-100 text-yellow-800'
      case 'pessimo':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleNovoRegistro = () => {
    if (!canCreateToday) {
      toast.error('Você já registrou seu emociograma hoje!')
      return
    }
    setShowModal(true)
  }

  const handleRegistroSuccess = () => {
    carregarDados()
    setShowModal(false)
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Emociograma</h1>
            <p className="text-gray-600">Acompanhe seu bem-estar emocional</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/emociograma/dds')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all"
            >
              <Play className="h-4 w-4" />
              Iniciar DDS
            </button>
            <button
              onClick={handleNovoRegistro}
              disabled={!canCreateToday}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                canCreateToday
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Plus className="w-4 h-4 mr-2" />
              {canCreateToday ? 'Novo Registro' : 'Já registrado hoje'}
            </button>
          </div>
        </div>

        {/* Último registro */}
        {ultimoRegistro && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Último Registro</h2>
              <span className="text-sm text-gray-500">
                {formatDate(ultimoRegistro.data_registro)}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              {getEmoticonIcon(ultimoRegistro.estado_emocional, 32)}
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-semibold text-lg">
                    {getEstadoLabel(ultimoRegistro.estado_emocional)}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs ${getEstadoColor(ultimoRegistro.estado_emocional)}`}>
                    {getEstadoLabel(ultimoRegistro.estado_emocional)}
                  </span>
                </div>
                {ultimoRegistro.observacoes && (
                  <div className="flex items-start space-x-2 mt-2">
                    <MessageCircle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 italic">
                      "{ultimoRegistro.observacoes}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cards de estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total de Registros</span>
              <BarChart3 className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold">{stats?.resumo?.total_registros || 0}</div>
            <p className="text-xs text-gray-500">Últimos 7 dias</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Estados Positivos</span>
              <Smile className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-green-600">{stats?.resumo?.bem || 0}</div>
            <p className="text-xs text-gray-500">
              {stats?.resumo?.total_registros ? 
                `${Math.round((stats.resumo.bem / stats.resumo.total_registros) * 100)}%` : 
                '0%'
              } do total
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Estados de Atenção</span>
              <Meh className="h-4 w-4 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold text-yellow-600">{stats?.resumo?.regular || 0}</div>
            <p className="text-xs text-gray-500">
              {stats?.resumo?.total_registros ? 
                `${Math.round((stats.resumo.regular / stats.resumo.total_registros) * 100)}%` : 
                '0%'
              } do total
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Estados Críticos</span>
              <Frown className="h-4 w-4 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-red-600">{stats?.resumo?.pessimo || 0}</div>
            <p className="text-xs text-gray-500">
              {stats?.resumo?.total_registros ? 
                `${Math.round((stats.resumo.pessimo / stats.resumo.total_registros) * 100)}%` : 
                '0%'
              } do total
            </p>
          </div>
        </div>

        {/* Alertas ativos */}
        {stats && (stats.alertas?.ativos > 0 || stats.alertas?.em_tratamento > 0) && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <span className="font-medium text-orange-800">Alertas Ativos</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.alertas?.ativos || 0}</div>
                <p className="text-sm text-orange-700">Novos</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.alertas?.em_tratamento || 0}</div>
                <p className="text-sm text-blue-700">Em Tratamento</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.alertas?.resolvidos || 0}</div>
                <p className="text-sm text-green-700">Resolvidos</p>
              </div>
            </div>
          </div>
        )}

        {/* Tendência semanal */}
        {stats?.tendencia && stats.tendencia.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5" />
              <span className="font-medium">Tendência dos Últimos 7 Dias</span>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                {stats.tendencia?.map((dia, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="text-sm font-medium">
                      {new Date(dia.data + 'T00:00:00').toLocaleDateString('pt-BR', { 
                        weekday: 'short', 
                        day: '2-digit', 
                        month: '2-digit' 
                      })}
                    </div>
                    <div className="flex items-center space-x-2">
                      {dia.bem > 0 && (
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 flex items-center gap-1">
                          <Smile className="w-3 h-3" />
                          {dia.bem}
                        </span>
                      )}
                      {dia.regular > 0 && (
                        <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 flex items-center gap-1">
                          <Meh className="w-3 h-3" />
                          {dia.regular}
                        </span>
                      )}
                      {dia.pessimo > 0 && (
                        <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 flex items-center gap-1">
                          <Frown className="w-3 h-3" />
                          {dia.pessimo}
                        </span>
                      )}
                      {dia.total === 0 && (
                        <span className="text-sm text-gray-400">Sem registros</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Links rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div 
            className="bg-white rounded-lg shadow-sm border p-6 text-center cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/emociograma/historico')}
          >
            <Clock className="w-8 h-8 mx-auto mb-3 text-blue-600" />
            <h3 className="font-semibold mb-2">Histórico</h3>
            <p className="text-sm text-gray-600">Ver todos os seus registros</p>
          </div>

          <div 
            className="bg-white rounded-lg shadow-sm border p-6 text-center cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/emociograma/tratativas')}
          >
            <Users className="w-8 h-8 mx-auto mb-3 text-green-600" />
            <h3 className="font-semibold mb-2">Tratativas</h3>
            <p className="text-sm text-gray-600">Acompanhar tratativas ativas</p>
          </div>

          <div 
            className="bg-white rounded-lg shadow-sm border p-6 text-center cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/emociograma/historico-tratativas')}
          >
            <FileText className="w-8 h-8 mx-auto mb-3 text-indigo-600" />
            <h3 className="font-semibold mb-2">Histórico de Tratativas</h3>
            <p className="text-sm text-gray-600">Ver todas as tratativas e alertas</p>
          </div>

          <div 
            className="bg-white rounded-lg shadow-sm border p-6 text-center cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/emociograma/relatorios')}
          >
            <BarChart3 className="w-8 h-8 mx-auto mb-3 text-purple-600" />
            <h3 className="font-semibold mb-2">Relatórios</h3>
            <p className="text-sm text-gray-600">Análises detalhadas</p>
          </div>
        </div>
      </div>

      {/* Modal de Registro */}
      <ModalRegistro
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleRegistroSuccess}
      />
    </MainLayout>
  )
}

