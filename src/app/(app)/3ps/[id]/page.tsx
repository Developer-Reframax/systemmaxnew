'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  FileText,
  MapPin,
  Play,
  Target,
  User,
  Users
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

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
    local?: string
    local_instalacao?: string
  }
  criador: {
    matricula: number
    nome: string
  }
  participantes: Array<{
    matricula?: number
    nome?: string
    matricula_participante?: number
    participante?: {
      matricula?: number
      nome?: string
    }
  }>
}

export default function Detalhes3P() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [registro, setRegistro] = useState<Registro3P | null>(null)
  const [loading, setLoading] = useState(true)

  const registroId = useMemo(() => {
    const rawId = params?.id
    return Array.isArray(rawId) ? rawId[0] : rawId
  }, [params])

  useEffect(() => {
    const fetchRegistro = async () => {
      if (!registroId) return

      setLoading(true)

      try {
        const response = await fetch(`/api/3ps/${registroId}`, {
          credentials: 'include'
        })

        const result = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(result?.error || 'Registro 3P nao encontrado')
        }

        if (result?.success) {
          setRegistro(result.data)
          return
        }

        toast.error(result?.error || 'Erro ao carregar registro 3P')
        router.push('/3ps')
      } catch (error) {
        console.error(error instanceof Error ? error.message : 'Erro ao carregar registro 3P')
        toast.error(error instanceof Error ? error.message : 'Erro ao carregar registro 3P')
        router.push('/3ps')
      } finally {
        setLoading(false)
      }
    }

    void fetchRegistro()
  }, [registroId, router])

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
    if (!registro || !user) return false
    return registro.criador.matricula === user.matricula
  }

  const getStageIcon = (completed: boolean) =>
    completed ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <AlertCircle className="h-5 w-5 text-red-500" />
    )

  const getStageColor = (completed: boolean) =>
    completed
      ? 'bg-green-50 border-green-200 text-green-800'
      : 'bg-red-50 border-red-200 text-red-800'

  const areaLabel = registro?.area?.local || registro?.area?.local_instalacao || '-'
  const participantes = (registro?.participantes || []).map((participante) => ({
    matricula:
      participante.participante?.matricula ??
      participante.matricula_participante ??
      participante.matricula ??
      0,
    nome: participante.participante?.nome ?? participante.nome ?? 'Participante'
  }))

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        <p className="ml-3 text-gray-600">Carregando registro 3P...</p>
      </div>
    )
  }

  if (!registro) {
    return (
      <div className="py-12 text-center">
        <Target className="mx-auto mb-4 h-12 w-12 text-gray-400" />
        <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
          Registro 3P nao encontrado
        </h3>
        <Link
          href="/3ps"
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link
            href="/3ps"
            className="mr-4 rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Detalhes do Registro 3P
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Pausar, Processar e Prosseguir
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {canEdit() && (
            <Link
              href={`/3ps/${registro.id}/editar`}
              className="flex items-center rounded-lg bg-yellow-600 px-4 py-2 font-medium text-white transition-colors hover:bg-yellow-700"
            >
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Link>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 flex items-center text-lg font-semibold text-gray-900 dark:text-white">
          <FileText className="mr-2 h-5 w-5" />
          Informacoes Basicas
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Area/Local
            </label>
            <div className="flex items-center text-gray-900 dark:text-white">
              <MapPin className="mr-2 h-4 w-4 text-gray-400" />
              {areaLabel}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Criado por
            </label>
            <div className="flex items-center text-gray-900 dark:text-white">
              <User className="mr-2 h-4 w-4 text-gray-400" />
              {registro.criador.nome} ({registro.criador.matricula})
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Data de Criacao
            </label>
            <div className="flex items-center text-gray-900 dark:text-white">
              <Calendar className="mr-2 h-4 w-4 text-gray-400" />
              {formatDate(registro.created_at)}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Ultima Atualizacao
            </label>
            <div className="flex items-center text-gray-900 dark:text-white">
              <Clock className="mr-2 h-4 w-4 text-gray-400" />
              {formatDate(registro.updated_at)}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Descricao da Atividade
          </label>
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
            <p className="whitespace-pre-wrap text-gray-900 dark:text-white">{registro.atividade}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-6 flex items-center text-lg font-semibold text-gray-900 dark:text-white">
          <Target className="mr-2 h-5 w-5" />
          Etapas do Processo 3P
        </h2>

        <div className="space-y-6">
          <div className={`rounded-lg border p-4 ${getStageColor(registro.paralisacao_realizada)}`}>
            <div className="mb-3 flex items-center">
              <AlertCircle className="mr-3 h-6 w-6 text-orange-500" />
              <h3 className="text-lg font-medium">Etapa 1: Pausar</h3>
              {getStageIcon(registro.paralisacao_realizada)}
            </div>
            <div className="ml-9">
              <p className="mb-2 text-sm">
                <strong>Parou antes de iniciar a atividade para avaliar os riscos?</strong>
              </p>
              <p className="text-sm">{registro.paralisacao_realizada ? 'Sim' : 'Nao'}</p>
            </div>
          </div>

          <div
            className={`rounded-lg border p-4 ${getStageColor(
              registro.riscos_avaliados &&
                registro.ambiente_avaliado &&
                registro.passo_descrito &&
                registro.hipoteses_levantadas
            )}`}
          >
            <div className="mb-3 flex items-center">
              <Target className="mr-3 h-6 w-6 text-blue-500" />
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
                <span className="mr-2 w-4">{registro.riscos_avaliados ? 'OK' : 'X'}</span>
                <span>Os riscos foram avaliados?</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="mr-2 w-4">{registro.ambiente_avaliado ? 'OK' : 'X'}</span>
                <span>O ambiente ao redor foi avaliado?</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="mr-2 w-4">{registro.passo_descrito ? 'OK' : 'X'}</span>
                <span>O passo a passo foi descrito?</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="mr-2 w-4">{registro.hipoteses_levantadas ? 'OK' : 'X'}</span>
                <span>As hipoteses foram levantadas?</span>
              </div>
            </div>
          </div>

          <div className={`rounded-lg border p-4 ${getStageColor(registro.atividade_segura)}`}>
            <div className="mb-3 flex items-center">
              <Play className="mr-3 h-6 w-6 text-green-500" />
              <h3 className="text-lg font-medium">Etapa 3: Prosseguir</h3>
              {getStageIcon(registro.atividade_segura)}
            </div>
            <div className="ml-9">
              <p className="mb-2 text-sm">
                <strong>A atividade e considerada segura para prosseguir?</strong>
              </p>
              <p className="text-sm">{registro.atividade_segura ? 'Sim' : 'Nao'}</p>
            </div>
          </div>
        </div>
      </div>

      {registro.oportunidades && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 flex items-center text-lg font-semibold text-gray-900 dark:text-white">
            <CheckCircle className="mr-2 h-5 w-5" />
            Oportunidades de Melhoria / Aprendizado
          </h2>
          <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
            <p className="whitespace-pre-wrap text-gray-900 dark:text-white">{registro.oportunidades}</p>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 flex items-center text-lg font-semibold text-gray-900 dark:text-white">
          <Users className="mr-2 h-5 w-5" />
          Participantes ({participantes.length})
        </h2>

        {participantes.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {participantes.map((participante) => (
              <div
                key={`${participante.matricula}-${participante.nome}`}
                className="flex items-center rounded-lg bg-gray-50 p-3 dark:bg-gray-700"
              >
                <User className="mr-3 h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {participante.nome}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Matricula: {participante.matricula}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="text-gray-500 dark:text-gray-400">
              Nenhum participante adicional foi registrado nesta avaliacao.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Resumo do Status
        </h2>

        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
          <div className="flex items-center">
            <div
              className={`mr-3 h-3 w-3 rounded-full ${
                registro.atividade_segura ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Status Final da Atividade
            </span>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              registro.atividade_segura
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
            }`}
          >
            {registro.atividade_segura ? 'Segura para Prosseguir' : 'Nao Segura'}
          </span>
        </div>
      </div>
    </div>
  )
}
