'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Edit, Target, Clock, MapPin, Calendar, User, CheckCircle, AlertCircle, Play, Users, FileText } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface Registro3P {
  id: string
  atividade: string
  paralisacao_realizada: boolean
  riscos_avaliados: boolean
  ambiente_avaliado: boolean
  passo_descrito: boolean
  hipoteses_levantadas: boolean
  atividade_segura: boolean
  oportunidades: string
  created_at: string
  updated_at: string
  area: {
    id: string
    local_instalacao: string
  }
  criador: {
    matricula: number
    nome: string
  }
  participantes: Array<{
    matricula: number
    nome: string
  }>
}

export default function Detalhes3P() {
  const params = useParams()
  const router = useRouter()
  const [registro, setRegistro] = useState<Registro3P | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRegistro = async () => {
      if (!params?.id) return
      
      setLoading(true)
      try {
        const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
        const response = await fetch(`/api/3ps/${params.id}`, {
          headers: {
            'Authorization': `Bearer ${auth_token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (!response.ok) {
          throw new Error('Registro 3P não encontrado')
        }
        
        const result = await response.json()
        if (result.success) {
          setRegistro(result.data)
        } else {
          toast.error(result.error || 'Erro ao carregar registro 3P')
          router.push('/3ps')
        }
      } catch (err) {
        console.error(err instanceof Error ? err.message : 'Erro ao carregar registro 3P')
        toast.error('Erro ao carregar registro 3P')
        router.push('/3ps')
      } finally {
        setLoading(false)
      }
    }

    fetchRegistro()
  }, [params?.id, router])

  const formatDate = (dateString: string) => {
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

  const canEdit = () => {
    if (!registro) return false
    const userMatricula = typeof window !== 'undefined' ? localStorage.getItem('user_matricula') : null
    return registro.criador.matricula.toString() === userMatricula
  }

  const getStageIcon = (completed: boolean) => {
    return completed ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <AlertCircle className="w-5 h-5 text-red-500" />
    )
  }

  const getStageColor = (completed: boolean) => {
    return completed 
      ? 'bg-green-50 border-green-200 text-green-800'
      : 'bg-red-50 border-red-200 text-red-800'
  }

  if (loading) {
    return (
      
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-3 text-gray-600">Carregando registro 3P...</p>
        </div>
      
    )
  }

  if (!registro) {
    return (
      
        <div className="text-center py-12">
          <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Registro 3P não encontrado
          </h3>
          <Link
            href="/3ps"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors inline-flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Dashboard
          </Link>
        </div>
      
    )
  }

  return (
    
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link
              href="/3ps"
              className="mr-4 p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Detalhes do Registro 3P
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Pausar, Processar e Prosseguir
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {canEdit() && (
              <Link
                href={`/3ps/${registro.id}/editar`}
                className="bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-700 transition-colors flex items-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Link>
            )}
          </div>
        </div>

        {/* Informações Básicas */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Informações Básicas
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Área/Local
              </label>
              <div className="flex items-center text-gray-900 dark:text-white">
                <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                {registro.area.local_instalacao}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Criado por
              </label>
              <div className="flex items-center text-gray-900 dark:text-white">
                <User className="w-4 h-4 text-gray-400 mr-2" />
                {registro.criador.nome} ({registro.criador.matricula})
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data de Criação
              </label>
              <div className="flex items-center text-gray-900 dark:text-white">
                <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                {formatDate(registro.created_at)}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Última Atualização
              </label>
              <div className="flex items-center text-gray-900 dark:text-white">
                <Clock className="w-4 h-4 text-gray-400 mr-2" />
                {formatDate(registro.updated_at)}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Descrição da Atividade
            </label>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                {registro.atividade}
              </p>
            </div>
          </div>
        </div>

        {/* Etapas do Processo 3P */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Etapas do Processo 3P
          </h2>

          <div className="space-y-6">
            {/* Etapa 1: Pausar */}
            <div className={`border rounded-lg p-4 ${getStageColor(registro.paralisacao_realizada)}`}>
              <div className="flex items-center mb-3">
                <AlertCircle className="w-6 h-6 text-orange-500 mr-3" />
                <h3 className="text-lg font-medium">Etapa 1: Pausar</h3>
                {getStageIcon(registro.paralisacao_realizada)}
              </div>
              <div className="ml-9">
                <p className="text-sm mb-2">
                  <strong>Parou antes de iniciar a atividade para avaliar os riscos?</strong>
                </p>
                <p className="text-sm">
                  {registro.paralisacao_realizada ? '✅ Sim' : '❌ Não'}
                </p>
              </div>
            </div>

            {/* Etapa 2: Processar */}
            <div className={`border rounded-lg p-4 ${getStageColor(
              registro.riscos_avaliados && 
              registro.ambiente_avaliado && 
              registro.passo_descrito && 
              registro.hipoteses_levantadas
            )}`}>
              <div className="flex items-center mb-3">
                <Target className="w-6 h-6 text-blue-500 mr-3" />
                <h3 className="text-lg font-medium">Etapa 2: Processar</h3>
                {getStageIcon(
                  registro.riscos_avaliados && 
                  registro.ambiente_avaliado && 
                  registro.passo_descrito && 
                  registro.hipoteses_levantadas
                )}
              </div>
              <div className="ml-9 space-y-2">
                <div className="flex items-center text-sm">
                  <span className="w-4 h-4 mr-2">
                    {registro.riscos_avaliados ? '✅' : '❌'}
                  </span>
                  <span>Os riscos foram avaliados?</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="w-4 h-4 mr-2">
                    {registro.ambiente_avaliado ? '✅' : '❌'}
                  </span>
                  <span>O ambiente ao redor foi avaliado?</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="w-4 h-4 mr-2">
                    {registro.passo_descrito ? '✅' : '❌'}
                  </span>
                  <span>O passo a passo foi descrito?</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="w-4 h-4 mr-2">
                    {registro.hipoteses_levantadas ? '✅' : '❌'}
                  </span>
                  <span>As hipóteses foram levantadas?</span>
                </div>
              </div>
            </div>

            {/* Etapa 3: Prosseguir */}
            <div className={`border rounded-lg p-4 ${getStageColor(registro.atividade_segura)}`}>
              <div className="flex items-center mb-3">
                <Play className="w-6 h-6 text-green-500 mr-3" />
                <h3 className="text-lg font-medium">Etapa 3: Prosseguir</h3>
                {getStageIcon(registro.atividade_segura)}
              </div>
              <div className="ml-9">
                <p className="text-sm mb-2">
                  <strong>A atividade é considerada segura para prosseguir?</strong>
                </p>
                <p className="text-sm">
                  {registro.atividade_segura ? '✅ Sim' : '❌ Não'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Oportunidades de Melhoria */}
        {registro.oportunidades && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              Oportunidades de Melhoria / Aprendizado
            </h2>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                {registro.oportunidades}
              </p>
            </div>
          </div>
        )}

        {/* Participantes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Participantes ({registro.participantes.length})
          </h2>
          
          {registro.participantes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {registro.participantes.map((participante) => (
                <div
                  key={participante.matricula}
                  className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <User className="w-4 h-4 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {participante.nome}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Matrícula: {participante.matricula}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Nenhum participante adicional foi registrado nesta avaliação.
              </p>
            </div>
          )}
        </div>

        {/* Resumo do Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Resumo do Status
          </h2>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${
                registro.atividade_segura ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Status Final da Atividade
              </span>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              registro.atividade_segura 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
            }`}>
              {registro.atividade_segura ? 'Segura para Prosseguir' : 'Não Segura'}
            </span>
          </div>
        </div>
      </div>
    
  )
}
