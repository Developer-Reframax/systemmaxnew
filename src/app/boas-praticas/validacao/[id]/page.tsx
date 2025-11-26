'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import MainLayout from '@/components/Layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  FileText,
  Lightbulb,
  ThumbsDown,
  ThumbsUp
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
  evidencias?: Evidencia[]
  envolvidos?: Envolvido[]
  tags_detalhes?: TagDetalhe[]
  created_at?: string
  relevancia?: number | null
}

interface ItemAvaliacao {
  id: number
  item: string
}

interface RespostaAvaliacao {
  item_id: number
  resposta: boolean
}

interface ValidacaoPayload {
  status?: string | null
  relevancia?: number | null
  validacao?: boolean | null
  comentario_validacao?: string | null
}

export default function ValidacaoDetalhePage() {
  useAuth()
  const router = useRouter()
  const params = useParams<{ id: string }>()

  const [detalhe, setDetalhe] = useState<BoaPraticaDetalhe | null>(null)
  const [validacaoInfo, setValidacaoInfo] = useState<ValidacaoPayload | null>(null)
  const [itens, setItens] = useState<ItemAvaliacao[]>([])
  const [respostas, setRespostas] = useState<RespostaAvaliacao[]>([])
  const [valida, setValida] = useState<boolean>(true)
  const [comentario, setComentario] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!params?.id) return
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      if (!token) { setLoading(false); return }
      const headers = { Authorization: `Bearer ${token}` }
      try {
        const [detRes, validRes] = await Promise.all([
          fetch(`/api/boas-praticas/${params.id}`, { headers }),
          fetch(`/api/boas-praticas/validacao/${params.id}`, { headers })
        ])

        if (detRes.ok) {
          const json = await detRes.json()
          setDetalhe(json.data || null)
        } else {
          toast.error('Nao foi possivel carregar detalhes da boa pratica')
        }

        if (validRes.ok) {
          const json = await validRes.json()
          setValidacaoInfo(json.data || null)
          setItens(json.itens || [])
          setRespostas(json.respostas || [])
          if (typeof json.data?.validacao === 'boolean') {
            setValida(Boolean(json.data.validacao))
          }
          if (json.data?.comentario_validacao) {
            setComentario(json.data.comentario_validacao)
          }
        } else {
          toast.error('Nao foi possivel carregar dados de validacao')
        }
      } catch {
        toast.error('Erro ao carregar informacoes')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params?.id])

  const getStatusBadge = (status: string) => {
    const normalized = (status || '').toLowerCase()
    if (normalized.includes('aguardando')) return 'bg-amber-100 text-amber-800'
    if (normalized.includes('votacao')) return 'bg-indigo-100 text-indigo-800'
    if (normalized.includes('concl')) return 'bg-emerald-100 text-emerald-800'
    return 'bg-slate-100 text-slate-800'
  }

  const respostasMap = useMemo(() => {
    const map = new Map<number, boolean>()
    respostas.forEach((r) => map.set(r.item_id, r.resposta))
    return map
  }, [respostas])

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const handleSubmit = async () => {
    if (!params?.id) return
    if (!valida && !comentario.trim()) {
      toast.error('Comentario obrigatorio para invalidar')
      return
    }

    const token = localStorage.getItem('auth_token')
    if (!token) {
      toast.error('Sem token de autenticacao')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/boas-praticas/validacao/${params.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ valida, comentario })
      })

      if (!res.ok) {
        const error = await res.json().catch(() => null)
        toast.error(error?.error || 'Erro ao salvar validacao')
        return
      }

      toast.success('Validacao registrada com sucesso')
      router.push('/boas-praticas/validacao')
    } catch {
      toast.error('Erro ao salvar validacao')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !detalhe) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!detalhe || !validacaoInfo) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <div className="text-center py-10 space-y-4">
            <p className="text-gray-700 text-lg">Nao foi possivel carregar esta validacao.</p>
            <Button onClick={() => router.push('/boas-praticas/validacao')}>Voltar para validacoes</Button>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Button variant="ghost" onClick={() => router.push('/boas-praticas/validacao')} className="p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Lightbulb className="w-5 h-5 text-yellow-600" />
                <h1 className="text-3xl font-bold text-gray-900">Validacao</h1>
                <Badge className={getStatusBadge(detalhe.status)}>{detalhe.status}</Badge>
              </div>
              <p className="text-gray-700">{detalhe.titulo}</p>
              <p className="text-sm text-gray-500">
                Criada por {detalhe.autor_nome || 'Usuario desconhecido'} em {formatDate(detalhe.created_at)}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-blue-200 text-blue-700">
            Relevancia atribuida: {validacaoInfo.relevancia ?? '-'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Detalhes da pratica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Problema</p>
                  <p className="text-gray-800">{detalhe.descricao_problema || 'Nao informado'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Boa pratica</p>
                  <p className="text-gray-800">{detalhe.descricao || 'Nao informado'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Objetivo</p>
                  <p className="text-gray-800">{detalhe.objetivo || 'Nao informado'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Resultados</p>
                  <p className="text-gray-800">{detalhe.resultados || 'Nao informado'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Perguntas avaliadas (gestao)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {itens.map((item) => {
                  const resp = respostasMap.get(item.id)
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <p className="text-gray-800">{item.item}</p>
                      <Badge className={resp ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}>
                        {resp ? 'Sim' : 'Nao'}
                      </Badge>
                    </div>
                  )
                })}
                {itens.length === 0 && <p className="text-sm text-gray-600">Nenhum item de avaliacao encontrado.</p>}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informacoes gerais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Categoria</span>
                  <span className="text-sm font-medium text-gray-900">{detalhe.categoria_nome || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pilar</span>
                  <span className="text-sm font-medium text-gray-900">{detalhe.pilar_nome || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Area aplicada</span>
                  <span className="text-sm font-medium text-gray-900">{detalhe.area_aplicada_nome || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Elimina desperdicio</span>
                  <span className="text-sm font-medium text-gray-900">{detalhe.elimina_desperdicio_nome || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Data implantacao</span>
                  <span className="text-sm font-medium text-gray-900">{formatDate(detalhe.data_implantacao)}</span>
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
                <CardTitle className="text-lg">Validacao</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={valida ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setValida(true)}
                  >
                    <ThumbsUp className="w-4 h-4 mr-2" />
                    Valida
                  </Button>
                  <Button
                    variant={!valida ? 'destructive' : 'outline'}
                    className="flex-1"
                    onClick={() => setValida(false)}
                  >
                    <ThumbsDown className="w-4 h-4 mr-2" />
                    Nao valida
                  </Button>
                </div>

                {!valida && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Comentario (obrigatorio)</label>
                    <Textarea
                      value={comentario}
                      onChange={(e) => setComentario(e.target.value)}
                      placeholder="Explique o motivo da invalidacao"
                    />
                  </div>
                )}

                <Button onClick={handleSubmit} disabled={loading} className="w-full">
                  {loading ? 'Salvando...' : 'Registrar validacao'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Evidencias</CardTitle>
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

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Envolvidos</CardTitle>
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
      </div>
    </MainLayout>
  )
}
