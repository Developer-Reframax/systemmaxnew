'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Edit,
  Lightbulb,
  Target,
  Users,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  TrendingUp,
  Paperclip,
  Download
} from 'lucide-react'
import { toast } from 'sonner'

interface Evidencia {
  id: string
  url: string
  categoria: string
  descricao?: string
  is_video: boolean
  nome_arquivo: string
}

interface Envolvido {
  matricula_envolvido: number
  nome_envolvido?: string
}

interface TagDetalhe {
  id: number
  nome: string
  cor?: string
}

interface BoaPraticaDetalhe {
  id: string
  titulo: string
  descricao?: string
  descricao_problema?: string
  objetivo?: string
  status: string
  resultados?: string
  data_implantacao?: string
  area_aplicada_nome?: string
  pilar_nome?: string
  elimina_desperdicio_nome?: string
  categoria_nome?: string
  autor_nome?: string
  fabricou_dispositivo?: boolean
  projeto?: string
  evidencias?: Evidencia[]
  envolvidos?: Envolvido[]
  tags_detalhes?: TagDetalhe[]
  created_at?: string
  updated_at?: string
}

function BoaPraticaDetalhePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  useAuth()

  const [data, setData] = useState<BoaPraticaDetalhe | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      if (!params?.id) {
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`/api/boas-praticas/${params.id}`, {
          method:'GET'
        })
        if (!res.ok) throw new Error('Erro ao carregar dados')
        const json = await res.json()
        setData(json.data)
      } catch {
        toast.error('Erro ao carregar boa pratica')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [params?.id])

  const getStatusColor = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'aprovada':
        return 'bg-green-100 text-green-800'
      case 'implementada':
        return 'bg-blue-100 text-blue-800'
      case 'em_analise':
      case 'pendente':
      case 'aguardando validacao':
        return 'bg-yellow-100 text-yellow-800'
      case 'rejeitada':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'aprovada':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'implementada':
        return <TrendingUp className="w-5 h-5 text-blue-600" />
      case 'em_analise':
      case 'pendente':
      case 'aguardando validacao':
        return <Clock className="w-5 h-5 text-yellow-600" />
      default:
        return <Lightbulb className="w-5 h-5 text-gray-600" />
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Nao definida'
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const handleOpenEvidencia = (evidencia: Evidencia) => {
    if (!evidencia.url) {
      toast.error('URL da evidencia nao encontrada')
      return
    }
    window.open(evidencia.url, '_blank', 'noopener,noreferrer')
  }

  const handleOpenProjeto = () => {
    if (!data?.projeto) {
      toast.error('URL do projeto nao encontrada')
      return
    }
    window.open(data.projeto, '_blank', 'noopener,noreferrer')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!data) {
    return (
        <div className="container mx-auto p-6">
          <div className="text-center py-8">
            <p className="text-gray-600">Boa pratica nao encontrada</p>
          </div>
        </div>
    )
  }

  return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => router.push('/boas-praticas')} className="p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                {getStatusIcon(data.status)}
                <h1 className="text-3xl font-bold text-gray-900">{data.titulo}</h1>
                <Badge className={getStatusColor(data.status)}>{data.status?.replace('_', ' ')}</Badge>
              </div>
              <p className="text-gray-600">
                Criado por {data.autor_nome || 'Usuario desconhecido'} em {formatDate(data.created_at)}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => router.push(`/boas-praticas/${data.id}/editar`)}>
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
        </div>

        {/* Conteudo */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Informacoes principais */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Descrição
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Problema</h3>
                  <p className="text-gray-800">{data.descricao_problema || 'Nao informado'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Boa pratica</h3>
                  <p className="text-gray-800">{data.descricao || 'Nao informado'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Objetivo</h3>
                  <p className="text-gray-800">{data.objetivo || 'Nao informado'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Evidencias */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="w-5 h-5" />
                  Evidências
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.evidencias && data.evidencias.length > 0 ? (
                  <div className="space-y-3">
                    {data.evidencias.map((evidencia) => (
                      <div
                        key={evidencia.id}
                        className="flex items-center justify-between rounded-md border px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="capitalize">
                            {evidencia.categoria}
                          </Badge>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {evidencia.nome_arquivo || 'Evidencia'}
                              {evidencia.is_video ? ' (video)' : ''}
                            </span>
                            {evidencia.descricao && (
                              <span className="text-sm text-gray-600">{evidencia.descricao}</span>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleOpenEvidencia(evidencia)}>
                          <Download className="w-4 h-4 mr-1" />
                          Abrir evidencia
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm">Nenhuma evidencia cadastrada.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Coluna lateral */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações Gerais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Target className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Categoria</p>
                    <p className="text-gray-800">{data.categoria_nome || 'Nao definida'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Target className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Pilar</p>
                    <p className="text-gray-800">{data.pilar_nome || 'Nao definido'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Target className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Elimina desperdicio</p>
                    <p className="text-gray-800">{data.elimina_desperdicio_nome || 'Nao definido'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Target className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Area aplicada</p>
                    <p className="text-gray-800">{data.area_aplicada_nome || 'Nao definida'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Fabricou dispositivo/peças</p>
                    <p className="text-gray-800">
                      {data.fabricou_dispositivo ? 'Sim' : 'Nao'}
                    </p>
                  </div>
                  {data.fabricou_dispositivo && data.projeto && (
                    <Button variant="outline" size="sm" onClick={handleOpenProjeto}>
                      <Download className="w-4 h-4 mr-1" />
                      Abrir projeto
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Data de implantação</p>
                    <p className="text-gray-800">{formatDate(data.data_implantacao)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Resultados</p>
                  <p className="text-gray-800">{data.resultados || 'Nao informado'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Envolvidos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Envolvidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.envolvidos && data.envolvidos.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {data.envolvidos.map((env) => (
                      <Badge key={env.matricula_envolvido} variant="secondary">
                        {env.nome_envolvido || env.matricula_envolvido}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">Nenhum envolvido informado.</p>
                )}
              </CardContent>
            </Card>

            {/* Tags */}
            {data.tags_detalhes && data.tags_detalhes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {data.tags_detalhes.map((tag) => (
                      <Badge
                        key={tag.id ?? tag.nome}
                        variant="outline"
                        style={tag.cor ? { backgroundColor: tag.cor, color: '#fff', borderColor: tag.cor } : undefined}
                      >
                        {tag.nome}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
  )
}

export default BoaPraticaDetalhePage
