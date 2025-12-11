'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

type PerguntaId = 1 | 2 | 3 | 4 | 5

type Pergunta = {
  id: PerguntaId
  titulo: string
  peso: number
}

type Opcao = {
  label: string
  value: 'insatisfatorio' | 'satisfatorio' | 'bom' | 'muito bom' | 'otimo'
  nota: number
}

const perguntas: Pergunta[] = [
  { id: 1, titulo: 'IDENTIFICACAO - Foi feita uma descricao clara e correta do problema? E de facil entendimento?', peso: 1 },
  { id: 2, titulo: 'VERIFICACAO - ALINHAMENTO COM OS OBJETIVOS - Houve avaliacao dos resultados? Houve ganhos tangiveis e intangiveis?', peso: 3 },
  { id: 3, titulo: 'CRIATIVIDADE E ORIGINALIDADE - O autor foi criativo e original ao elaborar e executar a boa pratica?', peso: 2 },
  { id: 4, titulo: 'FUNCIONALIDADE / APLICABILIDADE - A boa pratica cumpre sua utilidade com eficiencia? Pode ser padronizada?', peso: 5 },
  { id: 5, titulo: 'ABRANGENCIA - A boa pratica pode ser adotada em toda a empresa?', peso: 4 }
]

const opcoes: Opcao[] = [
  { label: 'Insatisfatorio', value: 'insatisfatorio', nota: 1 },
  { label: 'Satisfatorio', value: 'satisfatorio', nota: 2 },
  { label: 'Bom', value: 'bom', nota: 3 },
  { label: 'Muito bom', value: 'muito bom', nota: 4 },
  { label: 'Otimo', value: 'otimo', nota: 5 }
]

type Evidencia = {
  id: string
  url: string
  descricao?: string
  nome_arquivo?: string
  is_video: boolean
}

type Envolvido = { matricula_envolvido: number; nome_envolvido?: string }

type PraticaDetalhe = {
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
  envolvidos?: Envolvido[]
}

type RespostasState = Record<PerguntaId, Opcao['value'] | null>

export default function VotacaoTrimestralDetalhe() {
  useAuth()
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [pratica, setPratica] = useState<PraticaDetalhe | null>(null)
  const [respostas, setRespostas] = useState<RespostasState>({
    1: null,
    2: null,
    3: null,
    4: null,
    5: null
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      if (!params?.id) {
        setLoading(false)
        return
      }
      try {
        const res = await fetch(`/api/boas-praticas/votacao-trimestral/${params.id}`, {
          method:'GET'
        })
        if (!res.ok) {
          const err = await res.json().catch(() => null)
          throw new Error(err?.error || 'Erro ao carregar pratica')
        }
        const json = await res.json()
        setPratica(json.data)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao carregar pratica')
        router.push('/boas-praticas/votacao-trimestral')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params?.id, router])

  const notaTotal = useMemo(() => {
    return perguntas.reduce((acc, p) => {
      const resp = respostas[p.id]
      if (!resp) return acc
      const valor = opcoes.find((o) => o.value === resp)?.nota || 0
      return acc + valor * p.peso
    }, 0)
  }, [respostas])

  const handleSubmit = async () => {
    if (!pratica?.id) return
    const pendentes = perguntas.some((p) => !respostas[p.id])
    if (pendentes) {
      toast.error('Responda todas as perguntas')
      return
    }

    setSaving(true)
    try {
      const payload = {
        respostas
      }
      const res = await fetch(`/api/boas-praticas/votacao-trimestral/${pratica.id}`, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || 'Erro ao salvar voto')
      }
      toast.success('Voto registrado com sucesso')
      router.push('/boas-praticas/votacao-trimestral')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar voto')
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
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{pratica.titulo}</h1>
            <p className="text-gray-600">Contrato: {pratica.contrato || '-'}</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/boas-praticas/votacao-trimestral')}>
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
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Formulario de votacao</CardTitle>
            <Badge variant="secondary">Nota total: {notaTotal}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {perguntas.map((pergunta) => (
              <div key={pergunta.id} className="rounded-md border p-3 space-y-2">
                <div className="flex items-start gap-3">
                  <p className="text-sm text-gray-800">{pergunta.titulo}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {opcoes.map((op) => (
                    <Button
                      key={op.value}
                      type="button"
                      variant={respostas[pergunta.id] === op.value ? 'default' : 'outline'}
                      onClick={() =>
                        setRespostas((prev) => ({
                          ...prev,
                          [pergunta.id]: op.value
                        }))
                      }
                    >
                      {op.label} ({op.nota})
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Salvando...' : 'Registrar voto'}
          </Button>
        </div>
      </div>
  )
}
