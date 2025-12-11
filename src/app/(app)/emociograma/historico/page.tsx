'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Smile, 
  Meh, 
  Frown, 
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowLeft
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Emociograma {
  id: string
  estado_emocional: 'bem' | 'regular' | 'pessimo'
  observacoes?: string
  data_registro: string
  usuario: {
    matricula: number
    nome: string
    email: string
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function EmociogramaHistorico() {
  const router = useRouter()
  const [emociogramas, setEmociogramas] = useState<Emociograma[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [filtros, setFiltros] = useState({
    periodo: '30',
    meus: true,
    equipe: false
  })

  const carregarEmociogramas = useCallback(async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        periodo: filtros.periodo,
        meus: filtros.meus.toString(),
        equipe: filtros.equipe.toString()
      })

      
      const response = await fetch(`/api/emociograma?${params}`, {
        method: 'GET'
      })

      if (response.ok) {
        const data = await response.json()
        setEmociogramas(data.data || [])
        setPagination(data.pagination)
      } else {
        toast.error('Erro ao carregar histórico')
      }
    } catch (error) {
      console.error('Erro ao carregar emociogramas:', error)
      toast.error('Erro ao carregar histórico')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, filtros])

  useEffect(() => {
    carregarEmociogramas()
  }, [carregarEmociogramas])

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

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'bem':
        return 'Bem'
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
        return 'bg-green-100 text-green-800 border-green-200'
      case 'regular':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'pessimo':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const handleFiltroChange = (key: string, value: string | boolean) => {
    setFiltros(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset para primeira página
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
              <h1 className="text-2xl font-bold text-gray-900">Histórico de Emociogramas</h1>
              <p className="text-gray-600">Visualize o histórico dos seus registros emocionais</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4" />
            <span className="font-medium">Filtros</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Período</label>
              <select 
                className="w-full p-2 border border-gray-300 rounded-md"
                value={filtros.periodo} 
                onChange={(e) => handleFiltroChange('periodo', e.target.value)}
              >
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="90d">Últimos 90 dias</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Escopo</label>
              <select 
                className="w-full p-2 border border-gray-300 rounded-md"
                value={filtros.meus ? 'meus' : 'equipe'} 
                onChange={(e) => {
                  handleFiltroChange('meus', e.target.value === 'meus')
                  handleFiltroChange('equipe', e.target.value === 'equipe')
                }}
              >
                <option value="meus">Meus registros</option>
                <option value="equipe">Minha equipe</option>
              </select>
            </div>

            <div className="flex items-end">
              <button 
                onClick={carregarEmociogramas}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={loading}
              >
                <Search className="w-4 h-4" />
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Lista de emociogramas */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">Registros ({pagination.total})</span>
            </div>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : emociogramas.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum registro encontrado</h3>
                <p className="text-gray-600">
                  Não há registros de emociograma para os filtros selecionados.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {emociogramas.map((emociograma) => (
                  <div
                    key={emociograma.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      {getEmoticonIcon(emociograma.estado_emocional, 32)}
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold">
                            {getEstadoLabel(emociograma.estado_emocional)}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs ${getEstadoColor(emociograma.estado_emocional)}`}>
                            {getEstadoLabel(emociograma.estado_emocional)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {new Date(emociograma.data_registro).toLocaleString('pt-BR')}
                        </p>
                        {!filtros.meus && (
                          <p className="text-sm text-gray-500">
                            Por: {emociograma.usuario.nome} ({emociograma.usuario.matricula})
                          </p>
                        )}
                        {emociograma.observacoes && (
                          <p className="text-sm text-gray-700 mt-2 italic">
                            "{emociograma.observacoes}"
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {new Date(emociograma.data_registro + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Paginação */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="text-sm text-gray-600">
                  Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                  {pagination.total} registros
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600">
                    Página {pagination.page} de {pagination.totalPages}
                  </span>
                  <button
                    className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Próxima
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
  )
}
