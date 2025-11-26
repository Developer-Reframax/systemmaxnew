'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import MainLayout from '@/components/Layout/MainLayout'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ArrowLeft, Heart, Eye, Tag, Download, Users, Calendar, Share2 } from 'lucide-react'

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
  evidencias?: Evidencia[]
  envolvidos?: Envolvido[]
  tags_detalhes?: TagDetalhe[]
  created_at?: string
  relevancia?: number | null
  visualizacoes?: number | null
  likes?: number | null
  liked?: boolean
  contrato_codigo?: string | null
  contrato_nome?: string | null
  likes_usuarios?: { matricula: number; nome?: string | null }[]
}

export default function BookBoaPraticaDetalhePage() {
  useAuth()
  const router = useRouter()
  const params = useParams<{ id: string }>()

  const [detalhe, setDetalhe] = useState<BoaPraticaDetalhe | null>(null)
  const [loading, setLoading] = useState(false)
  const [liking, setLiking] = useState(false)
  const [liked, setLiked] = useState(false)
  const [fetched, setFetched] = useState(false)

  const loadDetalhe = async (options?: { force?: boolean; silent?: boolean }) => {
    const force = options?.force ?? false
    const silent = options?.silent ?? false
    if (!params?.id || (fetched && !force)) return
    if (!silent) setLoading(true)
    const token = localStorage.getItem('auth_token')
    if (!token) {
      if (!silent) setLoading(false)
      return
    }
    const headers = { Authorization: `Bearer ${token}` }
    try {
      const res = await fetch(`/api/boas-praticas/book/${params.id}`, { headers })
      if (!res.ok) throw new Error()
      const json = await res.json()
      setDetalhe(json.data)
      setLiked(Boolean(json.data?.liked))
    } catch {
      toast.error('Nao foi possivel carregar a boa pratica')
    } finally {
      if (!silent) setLoading(false)
      setFetched(true)
    }
  }

  useEffect(() => {
    loadDetalhe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id])

  const handleLike = async () => {
    if (!detalhe) return
    const token = localStorage.getItem('auth_token')
    if (!token) return toast.error('Sem token')
    setLiking(true)
    try {
      const res = await fetch(`/api/boas-praticas/book/${detalhe.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'like' })
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Erro ao curtir')
      if (json.alreadyLiked) {
        setLiked(true)
        return
      }
      setLiked(true)
      setDetalhe((prev) =>
        prev
          ? {
              ...prev,
              likes: (prev.likes || 0) + 1,
              likes_usuarios: prev.likes_usuarios
                ? [...prev.likes_usuarios]
                : []
            }
          : prev
      )
      loadDetalhe({ force: true, silent: true })
      toast.success('Curtida registrada')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao curtir')
    } finally {
      setLiking(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const formatShortName = (nome?: string | null) => {
    if (!nome) return ''
    const parts = nome.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return ''
    if (parts.length === 1) return parts[0]
    return `${parts[0]} ${parts[parts.length - 1]}`
  }

  const handleShare = async () => {
    if (!detalhe?.id) return
    const url = `${window.location.origin}/boas-praticas/book/${detalhe.id}`
    try {
      if (navigator.share) {
        await navigator.share({
          title: detalhe.titulo,
          text: detalhe.descricao || detalhe.descricao_problema || 'Boa prática',
          url
        })
        toast.success('Compartilhado')
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        toast.success('Link copiado para a area de transferencia')
      } else {
        toast.error('Compartilhamento indisponivel')
      }
    } catch {
      // usuario pode ter cancelado o share; silencioso
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!detalhe) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <div className="text-center py-10 space-y-4">
            <p className="text-gray-700 text-lg">Boa pratica nao encontrada.</p>
            <Button onClick={() => router.push('/boas-praticas/book')}>Voltar ao book</Button>
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
            <Button variant="ghost" onClick={() => router.push('/boas-praticas/book')} className="p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{detalhe.titulo}</h1>
              <p className="text-gray-600">Criada em {formatDate(detalhe.created_at)}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">Relevancia: {detalhe.relevancia ?? '-'}</Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {detalhe.visualizacoes ?? 0}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  {detalhe.likes ?? 0}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleShare}
              className="flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Compartilhar
            </Button>
            <Button
              variant="destructive"
              onClick={handleLike}
              disabled={liking || liked}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:text-white"
            >
              <Heart className="w-4 h-4" />
              {liked ? 'Curtido' : 'Curtir'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Problema</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p>{detalhe.descricao_problema || 'Nao informado'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Boa pratica</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p>{detalhe.descricao || 'Nao informado'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Objetivo</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p>{detalhe.objetivo || 'Nao informado'}</p>
              </CardContent>
            </Card>
            {detalhe.resultados && (
              <Card>
                <CardHeader>
                  <CardTitle>Resultados</CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm max-w-none">
                  <p>{detalhe.resultados}</p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Informacoes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-700">
                <div className="flex items-center justify-between">
                  <span>Contrato</span>
                  <span className="font-semibold text-gray-900">
                    {detalhe.contrato_codigo
                      ? `${detalhe.contrato_codigo}${detalhe.contrato_nome ? ` - ${detalhe.contrato_nome}` : ''}`
                      : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Categoria</span>
                  <span className="font-semibold text-gray-900">{detalhe.categoria_nome || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Pilar</span>
                  <span className="font-semibold text-gray-900">{detalhe.pilar_nome || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Elimina desperdicio</span>
                  <span className="font-semibold text-gray-900">{detalhe.elimina_desperdicio_nome || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Area aplicada</span>
                  <span className="font-semibold text-gray-900">{detalhe.area_aplicada_nome || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Implantada em</span>
                  <span className="font-semibold text-gray-900">{formatDate(detalhe.data_implantacao)}</span>
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
                  <Heart className="w-4 h-4" />
                  Curtidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {detalhe.likes_usuarios && detalhe.likes_usuarios.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {detalhe.likes_usuarios.map((like) => {
                      const nome = formatShortName(like.nome)
                      return (
                        <Badge key={like.matricula} variant="secondary">
                          {nome || like.matricula}
                        </Badge>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">Nenhuma curtida registrada.</p>
                )}
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Evidencias
                </CardTitle>
              </CardHeader>
              <CardContent>
                {detalhe.evidencias && detalhe.evidencias.length > 0 ? (
                  <div className="space-y-2">
                    {detalhe.evidencias.map((ev) => (
                      <div key={ev.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <div>
                          <p className="font-medium text-gray-900">
                            {ev.nome_arquivo} {ev.is_video ? '(video)' : ''}
                          </p>
                          <p className="text-xs text-gray-600">{ev.descricao || ev.categoria}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(ev.url, '_blank', 'noopener,noreferrer')}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Abrir
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">Nenhuma evidencia cadastrada.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
