'use client'

import React, { useEffect, useMemo, useState } from 'react'
import MainLayout from '@/components/Layout/MainLayout'
import { useAuth } from '@/hooks/useAuth'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Edit, Search, CheckCircle, Calendar, FileText } from 'lucide-react'
import PlanoAcaoModal from '@/components/inspecoes/PlanoAcaoModal'
import { PlanoAcaoWithRelations } from '@/types/plano-acao'

type PlanoAcaoStatus = 'pendente' | 'em_andamento' | 'concluido' | 'cancelado'
type PlanoAcaoPrioridade = 'baixa' | 'media' | 'alta' | 'urgente'

interface PlanoAcaoItem {
  id: string
  execucao_inspecao_id: string
  pergunta_id: string
  desvio: string
  o_que_fazer: string
  como_fazer: string
  responsavel_matricula: number
  prazo: string
  prioridade: PlanoAcaoPrioridade
  status: PlanoAcaoStatus
  cadastrado_por_matricula: number
  created_at: string
  updated_at: string
  pergunta?: { pergunta?: string }
  evidencias?: Array<{ id: string; nome_arquivo?: string; url_storage?: string }>
  execucao?: {
    id: string
    status: string
    data_inicio: string
    formulario?: { titulo?: string }
    local?: { local?: string }
  }
}

export default function MinhasAcoesPage() {
  useAuth()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<PlanoAcaoItem[]>([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<PlanoAcaoStatus | ''>('')
  const [prioridade, setPrioridade] = useState<PlanoAcaoPrioridade | ''>('')
  const [vencidos, setVencidos] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [planoSelecionado, setPlanoSelecionado] = useState<PlanoAcaoItem | undefined>(undefined)

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
      if (vencidos) params.append('vencidos', 'true')
      const res = await fetch(`/api/inspecoes/planos-acao/minhas?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.error || 'Erro ao carregar ações')
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
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 mr-3" />
              <div>
                <h1 className="text-xl font-bold">Minhas Ações</h1>
                <p className="text-green-100">Gerencie os planos de ação atribuídos a você</p>
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
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={vencidos} onChange={(e) => setVencidos(e.target.checked)} />Vencidos</label>
            <Button variant="outline" onClick={fetchData}>
              <Search className="w-4 h-4 mr-2" />
              Buscar
            </Button>
          </div>

          <div>
            {loading ? (
              <div className="text-center py-10">Carregando...</div>
            ) : (
              <div className="grid gap-4">
                {filtered.map((plano) => (
                  <Card key={plano.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        {plano.pergunta?.pergunta && (
                          <div className="text-lg font-semibold">{plano.pergunta.pergunta}</div>
                        )}
                        <div className="text-sm text-gray-600">Desvio: {plano.desvio}</div>
                        <div className="text-sm text-gray-600">O que fazer: {plano.o_que_fazer}</div>
                        <div className="text-xs text-gray-500 mt-1">Formulário: {plano.execucao?.formulario?.titulo || '-'}</div>
                        <div className="text-xs text-gray-500">Local: {plano.execucao?.local?.local || '-'}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={statusBadge(plano.status)}>{plano.status}</Badge>
                        <Badge className={prioridadeBadge(plano.prioridade)}>{plano.prioridade}</Badge>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-gray-600">Prazo</div>
                          <div className="font-medium">{new Date(plano.prazo).toLocaleDateString('pt-BR')}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-gray-600">Evidências</div>
                          <div className="font-medium">{(plano.evidencias || []).length}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <Button size="sm" onClick={() => { setPlanoSelecionado(plano); setModalOpen(true) }}>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => window.open(`/inspecoes/execucoes/${plano.execucao_inspecao_id}`, '_blank')}>
                        Ver Execução
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Card>

        <PlanoAcaoModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={fetchData}
          execucaoId={planoSelecionado?.execucao_inspecao_id || ''}
          plano={planoSelecionado as PlanoAcaoWithRelations | undefined}
          usuarios={[]}
        />
      </div>
    </MainLayout>
  )
}

