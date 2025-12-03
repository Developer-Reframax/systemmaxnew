'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  MapPin,
  Shield,
  ShieldAlert,
  Signal,
  RefreshCcw,
  ArrowRight,
  WifiOff,
  User,
  PauseCircle,
  PlayCircle,
  Wrench,
  Ban
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

interface DesvioMonitorado {
  id: string
  titulo?: string
  descricao?: string
  contrato?: string
  local?: string
  status: string
  potencial: string
  potencial_local?: string | null
  created_at: string
  natureza?: { natureza: string }
  tipo?: { tipo: string }
  risco_associado?: { risco_associado: string }
  gerou_recusa?: boolean
  criador?: { nome?: string }
}

interface Contrato {
  codigo: string
  nome: string
}

interface EquipamentoMonitorado {
  id: string
  tag: string
  nome: string
  descricao?: string
  contrato?: string | null
  impedido?: boolean | null
  imagem_url?: string | null
  created_at?: string
}

const MAX_ITENS = 80

const sortEquipamentos = (lista: EquipamentoMonitorado[]) => {
  return [...lista].sort((a, b) => {
    const impedA = !!a.impedido
    const impedB = !!b.impedido
    if (impedA !== impedB) return impedA ? -1 : 1
    return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
  })
}

const sortDesvios = (lista: DesvioMonitorado[]) => {
  return [...lista].sort((a, b) => {
    const aIntoleravel = a.potencial === 'Intolerável' && a.status !== 'Concluído'
    const bIntoleravel = b.potencial === 'Intolerável' && b.status !== 'Concluído'
    if (aIntoleravel !== bIntoleravel) return aIntoleravel ? -1 : 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

export default function CentralMonitoramento() {
  const { user } = useAuth()
  const [desvios, setDesvios] = useState<DesvioMonitorado[]>([])
  const [loading, setLoading] = useState(true)
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [contratoSelecionado, setContratoSelecionado] = useState<string>('todos')
  const [recentesAnimados, setRecentesAnimados] = useState<Set<string>>(new Set())
  const audioCtxRef = useRef<AudioContext | null>(null)
  const [equipamentos, setEquipamentos] = useState<EquipamentoMonitorado[]>([])
  const [loadingEquipamentos, setLoadingEquipamentos] = useState(true)
  const [abaAtiva, setAbaAtiva] = useState<'desvios' | 'equipamentos'>('desvios')
  const [autoPlay, setAutoPlay] = useState(true)

  const filteredDesvios = useMemo(() => {
    const base = contratoSelecionado === 'todos'
      ? desvios
      : desvios.filter((item) => item.contrato === contratoSelecionado)
    return sortDesvios(base)
  }, [contratoSelecionado, desvios])

  const contratoMap = useMemo(() => {
    const map = new Map<string, string>()
    contratos.forEach((c) => map.set(c.codigo, c.nome || c.codigo))
    return map
  }, [contratos])

  const resumo = useMemo(() => {
    const total = filteredDesvios.length
    const intoleraveis = filteredDesvios.filter((d) => d.potencial === 'Intolerável' && d.status !== 'Concluído').length
    const andamento = filteredDesvios.filter((d) => d.status === 'Em Andamento').length
    const aguardando = filteredDesvios.filter((d) => d.status === 'Aguardando Avaliação').length
    return { total, intoleraveis, andamento, aguardando }
  }, [filteredDesvios])

  const formatDateTime = (value: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const statusClass = (status: string) => {
    switch (status) {
      case 'Aguardando Avaliação':
        return 'bg-yellow-500/10 text-yellow-200 border border-yellow-500/40'
      case 'Em Andamento':
        return 'bg-blue-500/10 text-blue-200 border border-blue-500/40'
      case 'Concluído':
        return 'bg-green-500/10 text-green-200 border border-green-500/40'
      case 'Vencido':
        return 'bg-red-500/10 text-red-200 border border-red-500/40'
      default:
        return 'bg-gray-500/10 text-gray-200 border border-gray-500/40'
    }
  }

  const potencialClass = (potencial: string) => {
    switch (potencial) {
      case 'Intolerável':
        return 'bg-red-600/20 text-red-200 border border-red-500/50'
      case 'Substancial':
        return 'bg-orange-500/20 text-orange-100 border border-orange-500/40'
      case 'Moderado':
        return 'bg-amber-500/20 text-amber-100 border border-amber-500/40'
      case 'Trivial':
        return 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/40'
      default:
        return 'bg-slate-500/20 text-slate-100 border border-slate-500/40'
    }
  }

  const equipStatusClass = (impedido?: boolean | null) => {
    return impedido
      ? 'bg-red-600/20 text-red-100 border border-red-500/50'
      : 'bg-emerald-600/20 text-emerald-100 border border-emerald-500/50'
  }

  const formatNomeCurto = (nome?: string) => {
    if (!nome) return 'Não informado'
    const partes = nome.trim().split(/\s+/)
    if (partes.length === 1) return partes[0]
    return `${partes[0]} ${partes[partes.length - 1]}`
  }

  const marcarComoNovo = (id: string) => {
    setRecentesAnimados((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
    setTimeout(() => {
      setRecentesAnimados((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 3200)
  }

  const buscarDesvio = useCallback(async (id: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!token) return null

    const response = await fetch(`/api/desvios/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!response.ok) return null

    const result = await response.json()
    if (result.success) return result.data as DesvioMonitorado
    return null
  }, [])

  const buscarEquipamento = useCallback(async (id: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!token) return null

    const response = await fetch(`/api/inspecoes/equipamentos/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!response.ok) return null

    const result = await response.json()
    if (result.success) return result.data as EquipamentoMonitorado
    if (result.data) return result.data as EquipamentoMonitorado
    return null
  }, [])

  const carregarDesvios = useCallback(async () => {
    try {
      setLoading(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      const response = await fetch('/api/desvios?limit=60', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) throw new Error('Erro ao carregar desvios')

      const result = await response.json()
      if (result.success) {
        setDesvios(sortDesvios(result.data || []))
      } else {
        toast.error(result.message || 'Não foi possível carregar os desvios')
      }
    } catch (error) {
      console.error('Erro ao carregar desvios', error)
      toast.error('Falha ao carregar desvios')
    } finally {
      setLoading(false)
    }
  }, [])

  const carregarEquipamentos = useCallback(async () => {
    try {
      setLoadingEquipamentos(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) return

      const params = new URLSearchParams()
      params.append('limit', '120')
      params.append('page', '1')
      params.append('contrato', contratoSelecionado)

      const response = await fetch(`/api/inspecoes/equipamentos?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) throw new Error('Erro ao carregar equipamentos')

      const result = await response.json()
      const lista = (result.data || []) as EquipamentoMonitorado[]
      setEquipamentos(sortEquipamentos(lista))
    } catch (error) {
      console.error('Erro ao carregar equipamentos', error)
      toast.error('Falha ao carregar equipamentos')
    } finally {
      setLoadingEquipamentos(false)
    }
  }, [contratoSelecionado])

  const carregarContratos = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) return

      const response = await fetch('/api/contracts', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) return

      const result = await response.json()
      setContratos(result.contracts || result.data || [])
    } catch (error) {
      console.error('Erro ao carregar contratos', error)
    }
  }, [])

  const upsertDesvio = useCallback(async (id: string) => {
    const novoDesvio = await buscarDesvio(id)
    if (!novoDesvio) return

    setDesvios((prev) => {
      const filtrado = prev.filter((item) => item.id !== id)
      const atualizado = [novoDesvio, ...filtrado].slice(0, MAX_ITENS)
      return sortDesvios(atualizado)
    })
    marcarComoNovo(id)
  }, [buscarDesvio])

  const upsertEquipamento = useCallback(async (id: string) => {
    const novoEquipamento = await buscarEquipamento(id)
    if (!novoEquipamento) return

    if (contratoSelecionado !== 'todos' && novoEquipamento.contrato !== contratoSelecionado) {
      // Se o filtro atual não corresponde, removemos eventual item existente para manter a lista coerente
      setEquipamentos((prev) => prev.filter((item) => item.id !== id))
      return
    }

    setEquipamentos((prev) => {
      const filtrado = prev.filter((item) => item.id !== id)
      const atualizado = [novoEquipamento, ...filtrado]
      return sortEquipamentos(atualizado)
    })
    marcarComoNovo(id)
  }, [buscarEquipamento, contratoSelecionado])

  const playNotification = useCallback(() => {
    try {
      const AudioCtxClass = (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
      if (!AudioCtxClass) return
      const ctx = audioCtxRef.current || new AudioCtxClass()
      audioCtxRef.current = ctx
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 950
      gain.gain.value = 0.05
      osc.connect(gain)
      gain.connect(ctx.destination)
      const now = ctx.currentTime
      osc.start(now)
      osc.stop(now + 0.2)
    } catch (error) {
      console.error('Erro ao tocar notificação sonora', error)
    }
  }, [])

  useEffect(() => {
    if (user?.contrato_raiz) {
      setContratoSelecionado(user.contrato_raiz)
    }
  }, [user?.contrato_raiz])

  useEffect(() => {
    carregarContratos()
    carregarDesvios()
  }, [carregarContratos, carregarDesvios])

  useEffect(() => {
    carregarEquipamentos()
  }, [carregarEquipamentos])

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!token) return

    const source = new EventSource(`/api/inspecoes/equipamentos/realtime?token=${token}`)

    source.onmessage = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as {
          eventType?: string
          type?: string
          event?: string
          new?: { id?: string }
          old?: { id?: string }
        }
        const eventType = payload.eventType || payload.type || payload.event
        const id = payload?.new?.id || payload?.old?.id
        if (!id) return

        if (eventType === 'DELETE') {
          setEquipamentos((prev) => prev.filter((item) => item.id !== id))
        } else {
          upsertEquipamento(id)
          playNotification()
        }
      } catch (error) {
        console.error('Erro ao processar evento realtime de equipamentos', error)
      }
    }

    source.onerror = () => {
      source.close()
    }

    return () => {
      source.close()
    }
  }, [upsertEquipamento, playNotification])

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!token) return

    const source = new EventSource(`/api/desvios/realtime?token=${token}`)

    source.onmessage = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as {
          eventType?: string
          type?: string
          event?: string
          new?: { id?: string }
          old?: { id?: string }
        }
        const eventType = payload.eventType || payload.type || payload.event
        const id = payload?.new?.id || payload?.old?.id
        if (!id) return

        if (eventType === 'DELETE') {
          setDesvios((prev) => prev.filter((item) => item.id !== id))
        } else {
          upsertDesvio(id)
          playNotification()
        }
      } catch (error) {
        console.error('Erro ao processar evento realtime', error)
      }
    }

    source.onerror = () => {
      source.close()
    }

    return () => {
      source.close()
    }
  }, [upsertDesvio, playNotification])

  useEffect(() => {
    if (!autoPlay) return
    const timer = setInterval(() => {
      setAbaAtiva((prev) => (prev === 'desvios' ? 'equipamentos' : 'desvios'))
    }, 30000)
    return () => clearInterval(timer)
  }, [autoPlay])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.15),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(239,68,68,0.12),transparent_25%)] pointer-events-none" />

      <div className="relative z-10 px-6 py-6 lg:px-10 lg:py-8 max-w-7xl mx-auto">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-orange-200/70 mb-2">Central de Monitoramento</p>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-orange-500/20 text-orange-100 ring-1 ring-orange-500/40">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Monitoração contínua</h1>
                <p className="text-sm text-white/70">
                  Alternância automática entre desvios críticos e situação dos equipamentos em todos os contratos.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={contratoSelecionado}
              onChange={(e) => setContratoSelecionado(e.target.value)}
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white shadow-inner focus:border-orange-400 focus:outline-none"
            >
              <option value="todos">Todos os contratos</option>
              {contratos.map((contrato) => (
                <option key={contrato.codigo} value={contrato.codigo}>
                  {contrato.nome || contrato.codigo}
                </option>
              ))}
            </select>
            <button
              onClick={abaAtiva === 'desvios' ? carregarDesvios : carregarEquipamentos}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition-colors"
            >
              <RefreshCcw className="h-4 w-4" />
              Atualizar agora
            </button>
          </div>
        </header>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
            <button
              onClick={() => setAbaAtiva('desvios')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${abaAtiva === 'desvios' ? 'bg-orange-500/30 text-white border border-orange-400/40' : 'text-white/70 hover:text-white'}`}
            >
              Desvios
            </button>
            <button
              onClick={() => setAbaAtiva('equipamentos')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${abaAtiva === 'equipamentos' ? 'bg-orange-500/30 text-white border border-orange-400/40' : 'text-white/70 hover:text-white'}`}
            >
              Equipamentos
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/70">
            {autoPlay ? <PlayCircle className="h-4 w-4 text-green-300" /> : <PauseCircle className="h-4 w-4 text-orange-200" />}
            <span>Alternância automática a cada 30s</span>
            <button
              onClick={() => setAutoPlay((prev) => !prev)}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
            >
              {autoPlay ? 'Pausar' : 'Retomar'}
            </button>
          </div>
        </div>

        {abaAtiva === 'desvios' ? (
          <>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 shadow-lg">
                <p className="text-xs uppercase tracking-wide text-white/60">Total monitorado</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/20 text-orange-100">
                    <Activity className="h-5 w-5" />
                  </div>
                  <p className="text-3xl font-bold">{resumo.total}</p>
                </div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 shadow-lg">
                <p className="text-xs uppercase tracking-wide text-white/60">Intoleráveis ativos</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/20 text-red-100">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <p className="text-3xl font-bold">{resumo.intoleraveis}</p>
                </div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 shadow-lg">
                <p className="text-xs uppercase tracking-wide text-white/60">Em andamento</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20 text-blue-100">
                    <Shield className="h-5 w-5" />
                  </div>
                  <p className="text-3xl font-bold">{resumo.andamento}</p>
                </div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 shadow-lg">
                <p className="text-xs uppercase tracking-wide text-white/60">Aguardando avaliação</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/20 text-yellow-100">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <p className="text-3xl font-bold">{resumo.aguardando}</p>
                </div>
              </div>
            </div>

            <section className="mt-8">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-white/70">
                  <div className="h-12 w-12 border-2 border-orange-400 border-b-transparent rounded-full animate-spin mb-4" />
                  <p>Carregando últimos registros...</p>
                </div>
              ) : filteredDesvios.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 py-14 text-white/70">
                  <WifiOff className="h-10 w-10 text-orange-300" />
                  <p>Nenhum desvio encontrado para este filtro.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {filteredDesvios.map((desvio) => {
                    const intoleravelAtivo = desvio.potencial === 'Intolerável' && desvio.status !== 'Concluído'
                    const animacao = recentesAnimados.has(desvio.id) ? 'animate-pop-in' : ''

                    return (
                      <div
                        key={desvio.id}
                        className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:border-orange-400/40 ${animacao}`}
                      >
                        {intoleravelAtivo && (
                          <div className="absolute right-4 top-4">
                            <span className="relative flex h-4 w-4">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                              <span className="relative inline-flex h-4 w-4 rounded-full bg-red-600" />
                            </span>
                          </div>
                        )}

                        <div className="flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-orange-200/80">#{desvio.id.slice(0, 6)}</p>
                              <h3 className="text-lg font-semibold leading-tight">
                                {desvio.risco_associado?.risco_associado || desvio.titulo || 'Risco não informado'}
                              </h3>
                            </div>
                            <div className="flex flex-col items-end gap-2 text-xs font-semibold">
                              <span className={`rounded-full px-3 py-1 ${statusClass(desvio.status)}`}>
                                {desvio.status}
                              </span>
                              <span className={`rounded-full px-3 py-1 ${potencialClass(desvio.potencial)}`}>
                                {desvio.potencial}{desvio.potencial_local ? ` · ${desvio.potencial_local}` : ''}
                              </span>
                            </div>
                          </div>

                          <p className="text-sm text-white/80 max-h-20 overflow-hidden">
                            {desvio.descricao || 'Sem descrição fornecida.'}
                          </p>

                          <div className="grid grid-cols-1 gap-2 text-sm text-white/70 sm:grid-cols-2">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-orange-300" />
                              <span>{desvio.local || 'Local não informado'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <ShieldAlert className="h-4 w-4 text-orange-300" />
                              <span>
                                {desvio.contrato
                                  ? `${contratoMap.get(desvio.contrato) || desvio.contrato} · ${desvio.contrato}`
                                  : 'Contrato indefinido'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CalendarClock className="h-4 w-4 text-orange-300" />
                              <span>Registrado em {formatDateTime(desvio.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-orange-300" />
                              <span>{desvio.natureza?.natureza || desvio.tipo?.tipo || 'Categoria não definida'}</span>
                            </div>
                            <div className="inline-flex items-center gap-2">
                              <User className="h-4 w-4 text-orange-200" />
                              <span>Relatante: {formatNomeCurto(desvio.criador?.nome)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Shield className={`h-4 w-4 ${desvio.gerou_recusa ? 'text-red-300' : 'text-emerald-200'}`} />
                              <span className={desvio.gerou_recusa ? 'text-red-100' : 'text-emerald-100'}>
                                Gerou recusa: {desvio.gerou_recusa ? 'Sim' : 'Não'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between text-sm text-white/80">
                          <div className="flex items-center gap-1">
                            <Signal className="h-4 w-4 text-green-300" />
                            <span>Atualização em tempo real</span>
                          </div>
                          <a
                            href={`/desvios/${desvio.id}`}
                            className="group inline-flex items-center gap-1 text-orange-200 hover:text-orange-100"
                          >
                            Ver detalhes
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 shadow-lg">
                <p className="text-xs uppercase tracking-wide text-white/60">Equipamentos</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/20 text-orange-100">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <p className="text-3xl font-bold">{equipamentos.length}</p>
                </div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 shadow-lg">
                <p className="text-xs uppercase tracking-wide text-white/60">Impedidos</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/20 text-red-100">
                    <Ban className="h-5 w-5" />
                  </div>
                  <p className="text-3xl font-bold">{equipamentos.filter((e) => e.impedido).length}</p>
                </div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 shadow-lg">
                <p className="text-xs uppercase tracking-wide text-white/60">Atualização</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20 text-blue-100">
                    <RefreshCcw className="h-5 w-5" />
                  </div>
                  <button
                    onClick={carregarEquipamentos}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition-colors"
                  >
                    Atualizar lista
                  </button>
                </div>
              </div>
            </div>

            <section className="mt-8">
              {loadingEquipamentos ? (
                <div className="flex flex-col items-center justify-center py-16 text-white/70">
                  <div className="h-12 w-12 border-2 border-orange-400 border-b-transparent rounded-full animate-spin mb-4" />
                  <p>Carregando equipamentos...</p>
                </div>
              ) : equipamentos.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 py-14 text-white/70">
                  <WifiOff className="h-10 w-10 text-orange-300" />
                  <p>Nenhum equipamento encontrado para este filtro.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {equipamentos.map((eq) => {
                    const critico = !!eq.impedido
                    return (
                      <div
                        key={eq.id}
                        className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:border-orange-400/40"
                      >
                        {critico && (
                          <div className="absolute right-4 top-4">
                            <span className="relative flex h-4 w-4">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                              <span className="relative inline-flex h-4 w-4 rounded-full bg-red-600" />
                            </span>
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-orange-200/80">{eq.tag}</p>
                            <h3 className="text-lg font-semibold leading-tight">{eq.nome}</h3>
                            <p className="text-sm text-white/70 line-clamp-2">{eq.descricao || 'Sem descrição.'}</p>
                          </div>
                          <span className={`text-xs font-semibold rounded-full px-3 py-1 ${equipStatusClass(eq.impedido)}`}>
                            {eq.impedido ? 'Impedido' : 'Liberado'}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-white/70 sm:grid-cols-2">
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4 text-orange-300" />
                            <span>{eq.contrato ? `${contratoMap.get(eq.contrato) || eq.contrato} · ${eq.contrato}` : 'Contrato não informado'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CalendarClock className="h-4 w-4 text-orange-300" />
                            <span>Registrado em {formatDateTime(eq.created_at || '')}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <style>{`
        .animate-pop-in {
          animation: pop-in 0.45s ease-out;
        }
        @keyframes pop-in {
          0% {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  )
}
