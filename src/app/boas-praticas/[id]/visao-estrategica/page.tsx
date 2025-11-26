'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import MainLayout from '@/components/Layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Edit,
  Flag,
  LayoutDashboard,
  Lightbulb,
  Paperclip,
  FileText,
  Download,
  Target,
  TrendingUp,
  Users
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

type StatusKey = 'sesmt' | 'gestao' | 'validacao' | 'trimestral' | 'anual' | 'concluida'

interface UsuarioResumo {
  matricula: number
  nome?: string | null
}

interface ComiteResumo {
  id: number
  nome: string
  tipo: 'local' | 'corporativo'
  codigo_contrato?: string | null
}

interface EtapaCiclo {
  chave: StatusKey
  label: string
  ativa: boolean
  concluida: boolean
}

interface ParticipanteVotacao extends UsuarioResumo {
  votou: boolean
}

interface CicloEstrategico {
  pratica: {
    id: string
    contrato?: string | null
    status: string
    relevancia: number | null
    eliminada?: boolean | null
  }
  etapas: EtapaCiclo[]
  sesmt: {
    responsavel: UsuarioResumo | null
    realizada: boolean
  }
  gestao: {
    responsavel: UsuarioResumo | null
    relevancia: number | null
    realizada: boolean
  }
  trimestral: {
    comite: ComiteResumo | null
    participantes: ParticipanteVotacao[]
  }
  anual: {
    comite: ComiteResumo | null
    participantes: ParticipanteVotacao[]
  }
}

function VisaoEstrategicaBoaPraticaPage() {
  useAuth()
  const router = useRouter()
  const params = useParams<{ id: string }>()

  const [detalhe, setDetalhe] = useState<BoaPraticaDetalhe | null>(null)
  const [ciclo, setCiclo] = useState<CicloEstrategico | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const carregar = async () => {
      if (!params?.id) return
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setLoading(false)
        return
      }
      const headers = { Authorization: `Bearer ${token}` }
      try {
        const [detRes, cicloRes] = await Promise.all([
          fetch(`/api/boas-praticas/${params.id}`, { headers }),
          fetch(`/api/boas-praticas/visao-estrategica/${params.id}`, { headers })
        ])

        if (!detRes.ok) {
          toast.error('Nao foi possivel carregar detalhes da boa pratica')
        } else {
          const json = await detRes.json()
          setDetalhe(json.data)
        }

        if (!cicloRes.ok) {
          toast.error('Nao foi possivel carregar a visao estrategica')
        } else {
          const json = await cicloRes.json()
          setCiclo(json.data)
        }
      } catch {
        toast.error('Erro ao carregar informacoes da boa pratica')
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [params?.id])

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Nao definida'
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getStatusBadge = (status: string) => {
    const normalized = (status || '').toLowerCase()
    if (normalized.includes('aguardando')) return 'bg-amber-100 text-amber-800'
    if (normalized.includes('votacao') || normalized.includes('votação')) return 'bg-indigo-100 text-indigo-800'
    if (normalized.includes('concl')) return 'bg-emerald-100 text-emerald-800'
    return 'bg-slate-100 text-slate-800'
  }

  const etapaLegenda = useMemo(() => {
    if (!ciclo) return []
    const eliminada =
      Boolean(ciclo.pratica.eliminada) ||
      (ciclo.pratica.status || '').toLowerCase().includes('concluido') ||
      (ciclo.pratica.status || '').toLowerCase().includes('conclu\u00ed')

    return ciclo.etapas.map((etapa) => {
      if (eliminada) {
        return {
          ...etapa,
          legenda: 'Eliminada/invalidada',
          cor: 'bg-rose-50 border-rose-200 text-rose-800'
        }
      }
      if (etapa.concluida) return { ...etapa, legenda: 'Concluida', cor: 'bg-emerald-50 border-emerald-200 text-emerald-800' }
      if (etapa.ativa) return { ...etapa, legenda: 'Em andamento', cor: 'bg-blue-50 border-blue-200 text-blue-800' }
      return { ...etapa, legenda: 'Pendente', cor: 'bg-slate-50 border-slate-200 text-slate-700' }
    })
  }, [ciclo])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!detalhe || !ciclo) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <div className="text-center py-10 space-y-4">
            <p className="text-gray-700 text-lg">Nao foi possivel carregar esta boa pratica.</p>
            <Button onClick={() => router.push('/boas-praticas/lista')}>Voltar para lista</Button>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <Button variant="ghost" onClick={() => router.push('/boas-praticas/lista')} className="p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Lightbulb className="w-5 h-5 text-yellow-600" />
                <h1 className="text-3xl font-bold text-gray-900">Visao Estrategica</h1>
                <Badge className={getStatusBadge(detalhe.status)}>{detalhe.status.replace('_', ' ')}</Badge>
              </div>
              <p className="text-gray-700">Boa pratica: {detalhe.titulo}</p>
              <p className="text-sm text-gray-500">
                Criada por {detalhe.autor_nome || 'Usuario desconhecido'} em {formatDate(detalhe.created_at)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/boas-praticas/${detalhe.id}`)}>
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Detalhes
            </Button>
            <Button variant="outline" onClick={() => router.push(`/boas-praticas/${detalhe.id}/editar`)}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Flag className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-lg font-semibold text-gray-900">Ciclo da boa pratica</CardTitle>
            </div>
            <Badge variant="outline" className="text-blue-700 border-blue-200">
              Status atual: {ciclo.pratica.status}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {etapaLegenda.map((etapa) => (
                <div
                  key={etapa.chave}
                  className={`rounded-lg border px-3 py-3 flex flex-col gap-1 ${etapa.cor}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{etapa.label}</span>
                    {etapa.concluida ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    ) : etapa.ativa ? (
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  <span className="text-xs text-gray-600">{etapa.legenda}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="w-5 h-5" />
                  Evidencias
                </CardTitle>
              </CardHeader>
              <CardContent>
                {detalhe.evidencias && detalhe.evidencias.length > 0 ? (
                  <div className="space-y-3">
                    {detalhe.evidencias.map((evidencia) => (
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(evidencia.url, '_blank', 'noopener,noreferrer')}
                        >
                          Abrir
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm">Nenhuma evidencia cadastrada.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  Detalhes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Problema</h3>
                  <p className="text-gray-800">{detalhe.descricao_problema || 'Nao informado'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Boa pratica</h3>
                  <p className="text-gray-800">{detalhe.descricao || 'Nao informado'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Objetivo</h3>
                  <p className="text-gray-800">{detalhe.objetivo || 'Nao informado'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Resultados</h3>
                  <p className="text-gray-800">{detalhe.resultados || 'Nao informado'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informacoes gerais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Target className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Categoria</p>
                    <p className="text-gray-800">{detalhe.categoria_nome || 'Nao definida'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Target className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Pilar</p>
                    <p className="text-gray-800">{detalhe.pilar_nome || 'Nao definido'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Target className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Elimina desperdicio</p>
                    <p className="text-gray-800">{detalhe.elimina_desperdicio_nome || 'Nao definido'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Target className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Area aplicada</p>
                    <p className="text-gray-800">{detalhe.area_aplicada_nome || 'Nao definida'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Fabricou dispositivo/pecas</p>
                    <p className="text-gray-800">{detalhe.fabricou_dispositivo ? 'Sim' : 'Nao'}</p>
                  </div>
                  {detalhe.fabricou_dispositivo && detalhe.projeto && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(detalhe.projeto, '_blank', 'noopener,noreferrer')}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Abrir projeto
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Data de implantacao</p>
                    <p className="text-gray-800">{formatDate(detalhe.data_implantacao)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {detalhe.tags_detalhes?.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      style={tag.cor ? { backgroundColor: tag.cor, color: '#fff', borderColor: tag.cor } : undefined}
                    >
                      {tag.nome}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Envolvidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {detalhe.envolvidos && detalhe.envolvidos.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {detalhe.envolvidos.map((env) => (
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
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Avaliacao SESMT
              </CardTitle>
              <Badge className={ciclo.sesmt.realizada ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                {ciclo.sesmt.realizada ? 'Concluida' : 'Pendente'}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-gray-600">
                Responsavel:{' '}
                <span className="font-semibold text-gray-900">
                  {ciclo.sesmt.responsavel?.nome || ciclo.sesmt.responsavel?.matricula || 'Nao definido'}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                Contrato: <span className="font-semibold text-gray-900">{ciclo.pratica.contrato || '-'}</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Avaliacao Gestao
              </CardTitle>
              <Badge className={ciclo.gestao.realizada ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                {ciclo.gestao.realizada ? 'Concluida' : 'Pendente'}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-gray-600">
                Responsavel:{' '}
                <span className="font-semibold text-gray-900">
                  {ciclo.gestao.responsavel?.nome || ciclo.gestao.responsavel?.matricula || 'Nao definido'}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                Relevancia atribuida:{' '}
                <span className="font-semibold text-gray-900">
                  {ciclo.gestao.relevancia !== null ? ciclo.gestao.relevancia : 'Nao avaliada'}
                </span>
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Votacao trimestral (comite local)
              </CardTitle>
              <Badge variant="outline" className="border-blue-200 text-blue-700">
                {ciclo.trimestral.comite?.nome || 'Comite nao configurado'}
              </Badge>
            </CardHeader>
            <CardContent>
              {ciclo.trimestral.participantes.length === 0 ? (
                <p className="text-sm text-gray-600">Nenhum membro cadastrado para o comite local.</p>
              ) : (
                <div className="space-y-2">
                  {ciclo.trimestral.participantes.map((membro) => (
                    <div
                      key={membro.matricula}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">{membro.nome || membro.matricula}</span>
                        <span className="text-xs text-gray-500">Matricula: {membro.matricula}</span>
                      </div>
                      <Badge className={membro.votou ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                        {membro.votou ? 'Voto registrado' : 'Aguardando voto'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Votacao anual (comite corporativo)
              </CardTitle>
              <Badge variant="outline" className="border-indigo-200 text-indigo-700">
                {ciclo.anual.comite?.nome || 'Comite nao configurado'}
              </Badge>
            </CardHeader>
            <CardContent>
              {ciclo.anual.participantes.length === 0 ? (
                <p className="text-sm text-gray-600">Nenhum membro cadastrado para o comite corporativo.</p>
              ) : (
                <div className="space-y-2">
                  {ciclo.anual.participantes.map((membro) => (
                    <div
                      key={membro.matricula}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">{membro.nome || membro.matricula}</span>
                        <span className="text-xs text-gray-500">Matricula: {membro.matricula}</span>
                      </div>
                      <Badge className={membro.votou ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                        {membro.votou ? 'Voto registrado' : 'Aguardando voto'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}

export default VisaoEstrategicaBoaPraticaPage
