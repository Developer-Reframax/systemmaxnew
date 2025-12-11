'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { ArrowLeft, Edit, Eye, Clock, MapPin, Calendar, User, AlertTriangle, FileText, Camera } from 'lucide-react'

interface Desvio {
  id: string
  titulo: string
  descricao: string
  local: string
  data_ocorrencia: string
  status: string
  potencial: string
  potencial_local: string
  ver_agir: string
  data_limite: string
  created_at: string
  matricula_user: string
  responsavel: string
  observacoes_avaliacao: string
  natureza: { id: string; natureza: string }
  tipo: { id: string; tipo: string }
  risco_associado: { id: string; risco_associado: string }
  equipe: { id: string; equipe: string }
  criador: { matricula: string; nome: string; email: string }
  responsavel_info: { matricula: string; nome: string; email: string } | null
  imagens: Array<{
    id: string
    categoria: string
    nome_arquivo: string
    url_storage: string
    tamanho: number
    tipo_mime: string
    created_at: string
  }>
}

export default function DetalheDesvio() {
  const params = useParams()
  const router = useRouter()
  const [desvio, setDesvio] = useState<Desvio | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDesvio = async () => {
      if (!params?.id) return
      
      setLoading(true)
      try {
        const response = await fetch(`/api/desvios/${params.id}`, {
          method: 'GET'
        })
        
        if (!response.ok) {
          throw new Error('Desvio não encontrado')
        }
        
        const result = await response.json()
        if (result.success) {
          setDesvio(result.data)
        } else {
          console.error(result.message || 'Erro ao carregar desvio')
        }
      } catch (err) {
        console.error(err instanceof Error ? err.message : 'Erro ao carregar desvio')
      } finally {
        setLoading(false)
      }
    }

    fetchDesvio()
  }, [params?.id])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aguardando Avaliação': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
      case 'Em Andamento': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
      case 'Concluído': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case 'Vencido': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
    }
  }

  const getPotencialColor = (potencial: string) => {
    switch (potencial) {
      case 'Trivial': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case 'Moderado': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
      case 'Substancial': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
      case 'Intolerável': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    } catch {
      return '-'
    }
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return '-'
    }
  }

  const isVencido = (dataLimite: string | null, status: string) => {
    if (!dataLimite || status === 'Concluído') return false
    return new Date(dataLimite) < new Date()
  }

  const canEdit = () => {
    if (!desvio || !params?.id) return false
    const userMatricula = typeof window !== 'undefined' ? localStorage.getItem('user_matricula') : null
    return desvio.status === 'Aguardando Avaliação' && desvio.matricula_user === userMatricula
  }

  if (loading) {
    return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    )
  }

  if (!desvio) {
    return (
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Desvio não encontrado
          </h3>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center mx-auto"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </button>
        </div>
    )
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => router.back()}
              className="mr-4 p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Detalhes do Desvio
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Visualização completa do relato de desvio
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {canEdit() && (
              <button
                onClick={() => router.push(`/desvios/${desvio.id}/editar`)}
                className="bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-700 transition-colors flex items-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </button>
            )}
          </div>
        </div>

        {/* Status e Alertas */}
        <div className="flex flex-wrap gap-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(desvio.status)}`}>
            {desvio.status}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPotencialColor(desvio.potencial)}`}>
            {desvio.potencial}
            {desvio.potencial_local && ` - ${desvio.potencial_local}`}
          </span>
          {desvio.ver_agir && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              Ver &amp; Agir
            </span>
          )}
          {desvio.data_limite && isVencido(desvio.data_limite, desvio.status) && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
              Vencido
            </span>
          )}
        </div>

        {/* Informações Principais */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {desvio.titulo}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start">
                <MapPin className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Local</p>
                  <p className="text-gray-600 dark:text-gray-400">{desvio.local}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Calendar className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Data da Ocorrência</p>
                  <p className="text-gray-600 dark:text-gray-400">{formatDate(desvio.created_at)}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <User className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Criado por</p>
                  <p className="text-gray-600 dark:text-gray-400">{desvio.criador.nome}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <FileText className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Natureza</p>
                  <p className="text-gray-600 dark:text-gray-400">{desvio.natureza.natureza}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <FileText className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Tipo</p>
                  <p className="text-gray-600 dark:text-gray-400">{desvio.tipo.tipo}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <FileText className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Risco Associado</p>
                  <p className="text-gray-600 dark:text-gray-400">{desvio.risco_associado.risco_associado}</p>
                </div>
              </div>
              
              {desvio.responsavel_info && (
                <div className="flex items-start">
                  <User className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Responsável</p>
                    <p className="text-gray-600 dark:text-gray-400">{desvio.responsavel_info.nome}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-start">
                <User className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Equipe</p>
                  <p className="text-gray-600 dark:text-gray-400">{desvio.equipe.equipe}</p>
                </div>
              </div>
              
              {desvio.data_limite && (
                <div className="flex items-start">
                  <Clock className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Data Limite</p>
                    <p className={`${isVencido(desvio.data_limite, desvio.status) ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                      {formatDate(desvio.data_limite)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Descrição */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Descrição do Desvio
          </h3>
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {desvio.descricao}
            </p>
          </div>
        </div>

        {/* Observações da Avaliação */}
        {desvio.observacoes_avaliacao && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Observações da Avaliação
            </h3>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {desvio.observacoes_avaliacao}
              </p>
            </div>
          </div>
        )}

        {/* Imagens */}
        {desvio.imagens && desvio.imagens.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Camera className="h-5 w-5 mr-2" />
              Imagens Anexadas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {desvio.imagens.map((imagem) => (
                <div key={imagem.id} className="relative group">
                  <img
                    src={imagem.url_storage}
                    alt={`Imagem ${imagem.categoria} do desvio`}
                    className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                    <button
                      onClick={() => window.open(imagem.url_storage, '_blank')}
                      className="opacity-0 group-hover:opacity-100 bg-white text-gray-900 px-3 py-1 rounded-lg text-sm font-medium transition-opacity"
                    >
                      <Eye className="h-4 w-4 inline mr-1" />
                      Ver
                    </button>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                    {imagem.categoria}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Informações de Sistema */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Criado em: {formatDateTime(desvio.created_at)}
          </p>
        </div>
      </div>
  )
}