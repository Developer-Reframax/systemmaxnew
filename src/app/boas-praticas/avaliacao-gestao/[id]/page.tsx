'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import MainLayout from '@/components/Layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface Evidencia {
  id: string
  url: string
  descricao?: string
  nome_arquivo?: string
  is_video: boolean
}

interface ItemAvaliacao {
  id: number
  item: string
  eliminatoria?: boolean
}

interface RespostaAvaliacao {
  item_id: number
  resposta: boolean
}

interface BoaPraticaDetalhe {
  id: string
  titulo: string
  descricao?: string
  descricao_problema?: string
  objetivo?: string
  resultados?: string
  area_aplicada?: string
  area_aplicada_nome?: string
  pilar_nome?: string
  categoria_nome?: string
  elimina_desperdicio_nome?: string
  data_implantacao?: string
  autor_nome?: string
  contrato?: string
  evidencias?: Evidencia[]
  projeto?: string
  fabricou_dispositivo?: boolean
  envolvidos?: { matricula_envolvido: number; nome_envolvido?: string }[]
}

export default function AvaliacaoGestaoDetalhePage() {
  useAuth()
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [pratica, setPratica] = useState<BoaPraticaDetalhe | null>(null)
  const [itens, setItens] = useState<ItemAvaliacao[]>([])
  const [respostas, setRespostas] = useState<Record<number, boolean | null>>({})
  const [relevancia, setRelevancia] = useState<number | ''>('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [eliminadaMsg, setEliminadaMsg] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      if (!token || !params?.id) {
        setLoading(false)
        return
      }
      try {
        const [checkRes, detalheRes] = await Promise.all([
          fetch(`/api/boas-praticas/avaliacoes-gestao/${params.id}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/api/boas-praticas/${params.id}`, { headers: { Authorization: `Bearer ${token}` } })
        ])
        if (!checkRes.ok) throw new Error()
        const checkJson = await checkRes.json()
        setItens(checkJson.itens || [])
        const initial: Record<number, boolean | null> = {}
        const itensLista: ItemAvaliacao[] = Array.isArray(checkJson.itens) ? checkJson.itens : []
        const respostasLista: RespostaAvaliacao[] = Array.isArray(checkJson.respostas) ? checkJson.respostas : []
        itensLista.forEach((i) => { initial[i.id] = null })
        respostasLista.forEach((r) => { initial[r.item_id] = r.resposta })
        setRespostas(initial)

        if (detalheRes.ok) {
          const detalheJson = await detalheRes.json()
          setPratica(detalheJson.data)
        } else {
          setPratica(checkJson.data)
        }
      } catch {
        toast.error('Erro ao carregar avaliacao')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params?.id])

  const handleSubmit = async () => {
    if (!pratica?.id) return
    const token = localStorage.getItem('auth_token')
    if (!token) return toast.error('Sem token')

    const pendentes = Object.values(respostas).some((v) => v === null)
    if (pendentes) {
      toast.error('Responda todas as perguntas')
      return
    }
    if (!relevancia || relevancia < 1 || relevancia > 5) {
      toast.error('Informe a relevancia de 1 a 5')
      return
    }

    setSaving(true)
    try {
      const payload = {
        respostas: Object.entries(respostas).map(([item_id, resposta]) => ({
          item_id: Number(item_id),
          resposta
        })),
        relevancia: Number(relevancia)
      }
      const res = await fetch(`/api/boas-praticas/avaliacoes-gestao/${pratica.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || 'Erro ao salvar avaliacao')
      }
      const json = await res.json().catch(() => ({}))
      if (json?.eliminada) {
        setEliminadaMsg(
          json.message ||
            'De acordo com as respostas, o sistema identificou que o item nao segue como boa pratica. Ela permanecera cadastrada, mas nao seguira o fluxo de avaliacao/premiacao.'
        )
        return
      }
      toast.success('Avaliacao da gestao concluida')
      router.push('/boas-praticas/avaliacao-gestao')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar avaliacao')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !pratica) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{pratica.titulo}</h1>
            <p className="text-gray-600">Contrato: {pratica.contrato || '-'}</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/boas-praticas/avaliacao-gestao')}>
            Voltar
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Detalhes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Problema</p>
              <p className="text-gray-800">{pratica.descricao_problema || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Boa pratica</p>
              <p className="text-gray-800">{pratica.descricao || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Objetivo</p>
              <p className="text-gray-800">{pratica.objetivo || '-'}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-gray-700">
              <div className="p-3 rounded-md border bg-gray-50">
                <p className="font-semibold text-gray-800">Area aplicada</p>
                <p className="text-gray-700">{pratica.area_aplicada_nome || pratica.area_aplicada || '-'}</p>
              </div>
              <div className="p-3 rounded-md border bg-gray-50">
                <p className="font-semibold text-gray-800">Pilar</p>
                <p className="text-gray-700">{pratica.pilar_nome || '-'}</p>
              </div>
              <div className="p-3 rounded-md border bg-gray-50">
                <p className="font-semibold text-gray-800">Categoria</p>
                <p className="text-gray-700">{pratica.categoria_nome || '-'}</p>
              </div>
              <div className="p-3 rounded-md border bg-gray-50">
                <p className="font-semibold text-gray-800">Elimina desperdicio</p>
                <p className="text-gray-700">{pratica.elimina_desperdicio_nome || '-'}</p>
              </div>
              <div className="p-3 rounded-md border bg-gray-50">
                <p className="font-semibold text-gray-800">Fabricou dispositivo</p>
                <p className="text-gray-700">{pratica.fabricou_dispositivo ? 'Sim' : 'Nao'}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Resultados</p>
              <p className="text-gray-800">{pratica.resultados || '-'}</p>
            </div>
            {pratica.envolvidos && pratica.envolvidos.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Envolvidos</p>
                <div className="flex flex-wrap gap-2">
                  {pratica.envolvidos.map((env) => (
                    <Badge key={env.matricula_envolvido} variant="secondary">
                      {env.nome_envolvido || env.matricula_envolvido}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evidencias / Projeto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pratica.projeto && (
              <Button variant="outline" onClick={() => window.open(pratica.projeto || '#', '_blank', 'noopener,noreferrer')}>
                Abrir projeto
              </Button>
            )}
            {pratica.evidencias && pratica.evidencias.length > 0 ? (
              <div className="space-y-2">
                {pratica.evidencias.map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="flex flex-col">
                      <span className="font-medium">{ev.nome_arquivo || 'Evidencia'}</span>
                      {ev.descricao && <span className="text-sm text-gray-600">{ev.descricao}</span>}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => window.open(ev.url, '_blank', 'noopener,noreferrer')}>
                      Abrir
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">Nenhuma evidencia</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Questionario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {itens.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div className="flex-1 pr-4">
                  <div className="text-sm text-gray-800">{item.item}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={respostas[item.id] === true ? 'default' : 'outline'}
                    onClick={() => setRespostas((prev) => ({ ...prev, [item.id]: true }))}
                  >
                    Sim
                  </Button>
                  <Button
                    type="button"
                    variant={respostas[item.id] === false ? 'default' : 'outline'}
                    onClick={() => setRespostas((prev) => ({ ...prev, [item.id]: false }))}
                  >
                    Nao
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Relevancia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-gray-700">Atribua uma nota de 1 a 5</p>
            <Input
              type="number"
              min={1}
              max={5}
              value={relevancia}
              onChange={(e) => setRelevancia(e.target.value ? Number(e.target.value) : '')}
              className="max-w-xs"
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Finalizar avaliacao'}
          </Button>
        </div>
      </div>

      {eliminadaMsg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-lg w-full mx-4">
            <CardHeader>
              <CardTitle>Pratica eliminada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">{eliminadaMsg}</p>
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    setEliminadaMsg(null)
                    router.push('/boas-praticas/avaliacao-gestao')
                  }}
                >
                  Entendi
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </MainLayout>
  )
}
