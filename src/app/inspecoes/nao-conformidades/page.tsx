'use client'

import React, { useEffect, useMemo, useState } from 'react'
import MainLayout from '@/components/Layout/MainLayout'
import { useAuth } from '@/hooks/useAuth'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { AlertTriangle, Filter, Calendar, Eye } from 'lucide-react'

type PlanoAcaoStatus = 'pendente' | 'em_andamento' | 'concluido' | 'cancelado'
type PlanoAcaoPrioridade = 'baixa' | 'media' | 'alta' | 'urgente'

interface PlanoAcaoItem {
  id: string
  desvio: string
  o_que_fazer: string
  como_fazer: string
  responsavel_matricula: number
  prazo: string
  prioridade: PlanoAcaoPrioridade
  status: PlanoAcaoStatus
  created_at: string
  pergunta?: { pergunta?: string }
  evidencias?: Array<{ id: string }>
  execucao?: {
    id: string
    status: string
    data_inicio: string
    formulario?: { titulo?: string }
    local?: { local?: string }
    executor?: { matricula?: number; nome?: string; contrato_raiz?: string }
  }
}

export default function NaoConformidadesPage() {
  useAuth()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<PlanoAcaoItem[]>([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<PlanoAcaoStatus | ''>('')
  const [prioridade, setPrioridade] = useState<PlanoAcaoPrioridade | ''>('')
  const [responsavel, setResponsavel] = useState('')
  const [vencidos, setVencidos] = useState(false)
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        toast.error('Token de autenticação não encontrado')
        return
      }
      const params = new URLSearchParams()
      if (q) params.append('q', q)
      if (status) params.append('status', status)
      if (prioridade) params.append('prioridade', prioridade)
      if (responsavel) params.append('responsavel', responsavel)
      if (vencidos) params.append('vencidos', 'true')
      if (inicio) params.append('inicio', inicio)
      if (fim) params.append('fim', fim)

      const res = await fetch(`/api/inspecoes/nao-conformidades?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.error || 'Erro ao carregar não conformidades')
      }
      const data = await res.json()
      setItems(data.data || [])
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => items, [items])

  const statusBadge = (s: string) => {
    switch (s) {
      case 'concluido':
        return 'bg-green-100 text-green-800'
      case 'em_andamento':
        return 'bg-blue-100 text-blue-800'
      case 'cancelado':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const prioridadeBadge = (p: string) => {
    switch (p) {
      case 'alta':
        return 'bg-orange-100 text-orange-800'
      case 'urgente':
        return 'bg-red-100 text-red-800'
      case 'media':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 mr-3" />
              <div>
                <h1 className="text-xl font-bold">Não Conformidades do Contrato</h1>
                <p className="text-blue-100">Acompanhe e filtre todas as não conformidades registradas</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Input placeholder="Buscar por pergunta, desvio, ação" value={q} onChange={(e) => setQ(e.target.value)} className="w-64" />
            <select className="border rounded px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value as PlanoAcaoStatus | '')}>
              <option value="">Status</option>
              <option value="pendente">Pendente</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </select>
            <select className="border rounded px-3 py-2" value={prioridade} onChange={(e) => setPrioridade(e.target.value as PlanoAcaoPrioridade | '')}>
              <option value="">Prioridade</option>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
            <Input placeholder="Matrícula do responsável" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className="w-56" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={vencidos} onChange={(e) => setVencidos(e.target.checked)} />Vencidos</label>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
              <span className="text-gray-500">até</span>
              <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
            </div>
            <Button variant="outline" onClick={fetchData}>
              <Filter className="w-4 h-4 mr-2" />
              Filtrar
            </Button>
          </div>

          <div>
            {loading ? (
              <div className="text-center py-10">Carregando...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="p-3">Pergunta</th>
                      <th className="p-3">Desvio</th>
                      <th className="p-3">Ação</th>
                      <th className="p-3">Responsável</th>
                      <th className="p-3">Prazo</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Prioridade</th>
                      <th className="p-3">Execução</th>
                      <th className="p-3">Evidências</th>
                      <th className="p-3">Ver</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((plano) => (
                      <tr key={plano.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 max-w-[280px]"><div className="line-clamp-2">{plano.pergunta?.pergunta || '-'}</div></td>
                        <td className="p-3 max-w-[280px]"><div className="line-clamp-2">{plano.desvio}</div></td>
                        <td className="p-3 max-w-[280px]"><div className="line-clamp-2">{plano.o_que_fazer}</div></td>
                        <td className="p-3">{plano.execucao?.executor?.nome || plano.responsavel_matricula}</td>
                        <td className="p-3">{new Date(plano.prazo).toLocaleDateString('pt-BR')}</td>
                        <td className="p-3"><Badge className={statusBadge(plano.status)}>{plano.status}</Badge></td>
                        <td className="p-3"><Badge className={prioridadeBadge(plano.prioridade)}>{plano.prioridade}</Badge></td>
                        <td className="p-3">
                          <div className="text-gray-700">
                            <div className="font-medium">{plano.execucao?.formulario?.titulo || '-'}</div>
                            <div className="text-xs text-gray-500">{plano.execucao?.local?.local || '-'}</div>
                          </div>
                        </td>
                        <td className="p-3">{(plano.evidencias || []).length}</td>
                        <td className="p-3">
                          <Button variant="ghost" size="sm" onClick={() => window.open(`/inspecoes/execucoes/${plano.execucao?.id}`, '_blank')}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>
    </MainLayout>
  )
}

