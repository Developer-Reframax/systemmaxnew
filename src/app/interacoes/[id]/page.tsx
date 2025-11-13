'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  AlertTriangle, 
  User, 
  MapPin,
  Calendar, 
  FileText, 
  Shield,
  Eye
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import MainLayout from '@/components/Layout/MainLayout'

interface Interacao {
  id: string
  tipo: { id: string; tipo: string }
  unidade: { id: string; unidade: string }
  area: { id: string; area: string }
  local_interacao: { id: string; local_instalacao: string }
  classificacao: { id: string; classificacao: string }
  violacao?: { id: string; violacao: string }
  grande_risco?: { id: string; grandes_riscos: string }
  colaborador: { nome: string; matricula: number; email: string; funcao: string }
  coordenador?: { nome: string; matricula: number; email: string; funcao: string }
  supervisor?: { nome: string; matricula: number; email: string; funcao: string }
  local?: { id: number; local: string; contrato: string }
  data: string
  descricao: string
  acao?: string
  metodo_coach?: string
  empresa?: string
  houve_desvios?: string
  evento?: string
  instante?: string
  created_at: string
  updated_at: string
}

export default function DetalhesInteracao() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [interacao, setInteracao] = useState<Interacao | null>(null)
  const [loading, setLoading] = useState(true)

  // Carregar dados da interação
  useEffect(() => {
    const loadInteracao = async () => {
      try {
        setLoading(true)
        const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
        const response = await fetch(`/api/interacoes/${id}`, {
          headers: {
            'Authorization': `Bearer ${auth_token}`
          }
        })
        
        if (!response.ok) {
          throw new Error('Interação não encontrada')
        }

        const data = await response.json()
        
        // Corrigir o acesso aos dados da API
        if (data.success && data.interacao) {
          setInteracao(data.interacao)
        } else {
          throw new Error('Dados da interação não encontrados')
        }
      } catch (error: unknown) {
        console.error('Erro ao carregar interação:', error)
        const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar interação'
        toast.error(errorMessage)
        router.push('/interacoes/lista')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      loadInteracao()
    }
  }, [id, router])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR')
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('pt-BR')
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Carregando interação...</span>
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (!interacao) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Interação não encontrada</h3>
            <p className="text-gray-600 mb-4">A interação solicitada não existe ou foi removida.</p>
            <Link
              href="/interacoes/lista"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para Lista
            </Link>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/interacoes/lista"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Detalhes da Interação</h1>
              <p className="text-gray-600 mt-1">ID: {interacao.id}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-500">Modo Visualização</span>
            </div>
          </div>
        </div>

        {/* Informações Básicas */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Informações Básicas
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500">Tipo</p>
              <p className="font-medium">{interacao.tipo?.tipo || 'N/A'}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Classificação</p>
              <p className="font-medium">{interacao.classificacao?.classificacao || 'N/A'}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Data da Interação</p>
              <p className="font-medium">{interacao.data ? formatDate(interacao.data) : 'N/A'}</p>
            </div>

            {interacao.metodo_coach && (
              <div>
                <p className="text-sm text-gray-500">Método Coach</p>
                <p className="font-medium">{interacao.metodo_coach}</p>
              </div>
            )}

            {interacao.empresa && (
              <div>
                <p className="text-sm text-gray-500">Empresa</p>
                <p className="font-medium">{interacao.empresa}</p>
              </div>
            )}

            {interacao.evento && (
              <div>
                <p className="text-sm text-gray-500">Evento</p>
                <p className="font-medium">{interacao.evento}</p>
              </div>
            )}

            {interacao.instante && (
              <div>
                <p className="text-sm text-gray-500">Instante</p>
                <p className="font-medium">{interacao.instante}</p>
              </div>
            )}

            {interacao.houve_desvios && (
              <div>
                <p className="text-sm text-gray-500">Houve Desvios</p>
                <p className="font-medium">{interacao.houve_desvios}</p>
              </div>
            )}
          </div>
        </div>

        {/* Riscos e Violações */}
        {(interacao.violacao || interacao.grande_risco) && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Riscos e Violações
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {interacao.violacao && (
                <div>
                  <p className="text-sm text-gray-500">Violação</p>
                  <p className="font-medium">{interacao.violacao.violacao}</p>
                </div>
              )}

              {interacao.grande_risco && (
                <div>
                  <p className="text-sm text-gray-500">Grande Risco</p>
                  <p className="font-medium">{interacao.grande_risco.grandes_riscos}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Localização */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Localização
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500">Unidade</p>
              <p className="font-medium">{interacao.unidade?.unidade || 'N/A'}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Área</p>
              <p className="font-medium">{interacao.area?.area || 'N/A'}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Local de Instalação</p>
              <p className="font-medium">{interacao.local_interacao?.local_instalacao || 'N/A'}</p>
            </div>

            {interacao.local && (
              <div>
                <p className="text-sm text-gray-500">Local</p>
                <p className="font-medium">{interacao.local.local}</p>
                {interacao.local.contrato && (
                  <p className="text-xs text-gray-400">Contrato: {interacao.local.contrato}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Pessoas Envolvidas */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Pessoas Envolvidas
          </h2>
          
          <div className="space-y-6">
            {/* Colaborador */}
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="bg-blue-100 p-2 rounded-full">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">Colaborador</h3>
                <p className="font-medium text-gray-900">{interacao.colaborador?.nome || 'N/A'}</p>
                <p className="text-sm text-gray-500">Matrícula: {interacao.colaborador?.matricula || 'N/A'}</p>
                {interacao.colaborador?.email && (
                  <p className="text-sm text-gray-500">Email: {interacao.colaborador.email}</p>
                )}
                {interacao.colaborador?.funcao && (
                  <p className="text-sm text-gray-500">Função: {interacao.colaborador.funcao}</p>
                )}
              </div>
            </div>

            {/* Coordenador */}
            {interacao.coordenador && (
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="bg-green-100 p-2 rounded-full">
                  <User className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">Coordenador</h3>
                  <p className="font-medium text-gray-900">{interacao.coordenador.nome}</p>
                  <p className="text-sm text-gray-500">Matrícula: {interacao.coordenador.matricula}</p>
                  {interacao.coordenador.email && (
                    <p className="text-sm text-gray-500">Email: {interacao.coordenador.email}</p>
                  )}
                  {interacao.coordenador.funcao && (
                    <p className="text-sm text-gray-500">Função: {interacao.coordenador.funcao}</p>
                  )}
                </div>
              </div>
            )}

            {/* Supervisor */}
            {interacao.supervisor && (
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="bg-purple-100 p-2 rounded-full">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">Supervisor</h3>
                  <p className="font-medium text-gray-900">{interacao.supervisor.nome}</p>
                  <p className="text-sm text-gray-500">Matrícula: {interacao.supervisor.matricula}</p>
                  {interacao.supervisor.email && (
                    <p className="text-sm text-gray-500">Email: {interacao.supervisor.email}</p>
                  )}
                  {interacao.supervisor.funcao && (
                    <p className="text-sm text-gray-500">Função: {interacao.supervisor.funcao}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Descrição e Ações */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Descrição e Ações</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Descrição</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-900 whitespace-pre-wrap">{interacao.descricao || 'Nenhuma descrição fornecida'}</p>
              </div>
            </div>

            {interacao.acao && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Ações</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-900 whitespace-pre-wrap">{interacao.acao}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Informações do Sistema */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Informações do Sistema
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500">Criado em</p>
              <p className="font-medium">{formatDateTime(interacao.created_at)}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Última atualização</p>
              <p className="font-medium">{formatDateTime(interacao.updated_at)}</p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}