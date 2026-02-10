'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

const STATUS_OPTIONS = ['Aguardando Avaliacao', 'Em Andamento', 'Concluido', 'Vencido']
type Desvio = {
  id: string
  descricao: string | null
  local: string | null
  status: string | null
  contrato?: string | null
  natureza_id?: string | number | null
  tipo_id?: string | number | null
  riscoassociado_id?: string | number | null
  potencial?: string | null
  potencial_local?: string | null
  ver_agir?: boolean | null
  acao_cliente?: boolean | null
  gerou_recusa?: boolean | null
  data_limite?: string | null
  data_conclusao?: string | null
  data_ocorrencia?: string | null
  acao?: string | null
  observacao?: string | null
  equipe_id?: string | number | null
}

type Option = {
  id: string
  label: string
}

type EquipeOption = {
  id: string
  label: string
}

export default function EditarDesvio() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [desvio, setDesvio] = useState<Desvio | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [naturezas, setNaturezas] = useState<Option[]>([])
  const [tipos, setTipos] = useState<Option[]>([])
  const [riscos, setRiscos] = useState<Option[]>([])
  const [potenciaisLocal, setPotenciaisLocal] = useState<Option[]>([])
  const [potencialMap, setPotencialMap] = useState<Record<string, string>>({})
  const [locais, setLocais] = useState<string[]>([])
  const [equipes, setEquipes] = useState<EquipeOption[]>([])

  const [formData, setFormData] = useState({
    descricao: '',
    local: '',
    status: '',
    contrato: '',
    natureza_id: '',
    tipo_id: '',
    riscoassociado_id: '',
    potencial: '',
    potencial_local: '',
    ver_agir: false,
    acao_cliente: false,
    gerou_recusa: false,
    acao: '',
    observacao: '',
    equipe_id: ''
  })

  const loadDesvio = useCallback(async () => {
    if (!params?.id) return
    setLoading(true)
    try {
      const response = await fetch(`/api/desvios/${params.id}`, { method: 'GET' })
      if (!response.ok) throw new Error('Desvio nao encontrado')
      const result = await response.json()
      if (!result.success) throw new Error(result.message || 'Erro ao carregar desvio')

      const data = result.data as Desvio
      setDesvio(data)
      setFormData({
        descricao: data.descricao || '',
        local: data.local || '',
        status: data.status || '',
        contrato: data.contrato || '',
        natureza_id: data.natureza_id ? String(data.natureza_id) : '',
        tipo_id: data.tipo_id ? String(data.tipo_id) : '',
        riscoassociado_id: data.riscoassociado_id ? String(data.riscoassociado_id) : '',
        potencial: data.potencial || '',
        potencial_local: data.potencial_local || '',
        ver_agir: Boolean(data.ver_agir),
        acao_cliente: Boolean(data.acao_cliente),
        gerou_recusa: Boolean(data.gerou_recusa),
        acao: data.acao || '',
        observacao: data.observacao || '',
        equipe_id: data.equipe_id ? String(data.equipe_id) : ''
      })
    } catch (error) {
      console.error(error)
      toast.error('Erro ao carregar desvio')
    } finally {
      setLoading(false)
    }
  }, [params?.id])

  const loadNaturezas = async (contrato?: string) => {
    try {
      if (!contrato) return
      const params = `?contrato=${encodeURIComponent(contrato)}`
      const response = await fetch(`/api/security-params/natures${params}`, { method: 'GET' })
      if (!response.ok) throw new Error('Erro ao carregar naturezas')
      const data = await response.json()
      if (data.success) {
        setNaturezas((data.data || []).map((item: { id: string; natureza: string }) => ({
          id: String(item.id),
          label: item.natureza
        })))
      }
    } catch (error) {
      console.error(error)
    }
  }

  const loadTipos = async (naturezaId?: string, contrato?: string) => {
    if (!naturezaId) {
      setTipos([])
      return
    }
    try {
      if (!contrato) return
      const contratoParam = `&contrato=${encodeURIComponent(contrato)}`
      const response = await fetch(`/api/security-params/types?nature_id=${naturezaId}${contratoParam}`, { method: 'GET' })
      if (!response.ok) throw new Error('Erro ao carregar tipos')
      const data = await response.json()
      if (data.success) {
        setTipos((data.data || []).map((item: { id: string; tipo: string }) => ({
          id: String(item.id),
          label: item.tipo
        })))
      }
    } catch (error) {
      console.error(error)
    }
  }

  const loadRiscos = async () => {
    try {
      const response = await fetch('/api/security-params/associated-risks', { method: 'GET' })
      if (!response.ok) throw new Error('Erro ao carregar riscos')
      const data = await response.json()
      if (data.success) {
        setRiscos((data.data || []).map((item: { id: string; risco_associado: string }) => ({
          id: String(item.id),
          label: item.risco_associado
        })))
      }
    } catch (error) {
      console.error(error)
    }
  }

  const loadPotenciaisLocal = async (contrato?: string) => {
    try {
      if (!contrato) return
      const params = `?contrato=${encodeURIComponent(contrato)}`
      const response = await fetch(`/api/security-params/potentials${params}`, { method: 'GET' })
      if (!response.ok) throw new Error('Erro ao carregar potenciais')
      const data = await response.json()
      if (data.success) {
        const map: Record<string, string> = {}
        setPotenciaisLocal(
          (data.data || []).map((item: { id: string; potencial_local: string; potencial_sede?: string }) => {
            if (item.potencial_local) {
              map[item.potencial_local] = item.potencial_sede || item.potencial_local
            }
            return {
              id: String(item.id),
              label: item.potencial_local
            }
          })
        )
        setPotencialMap(map)
      }
    } catch (error) {
      console.error(error)
    }
  }

  const loadLocais = async (contrato?: string) => {
    try {
      if (!contrato) return
      const params = `?contrato=${encodeURIComponent(contrato)}&limit=500`
      const response = await fetch(`/api/security-params/locations${params}`, { method: 'GET' })
      if (!response.ok) throw new Error('Erro ao carregar locais')
      const data = await response.json()
      if (data.success) {
        const locaisList = (data.data || [])
          .map((item: { local?: string }) => item.local)
          .filter((local: string | undefined): local is string => typeof local === 'string' && local.trim().length > 0)
        const uniqueLocais = Array.from(new Set<string>(locaisList))
        setLocais(uniqueLocais)
      }
    } catch (error) {
      console.error(error)
    }
  }

  const loadEquipes = async () => {
    try {
      const response = await fetch('/api/teams', { method: 'GET' })
      if (!response.ok) throw new Error('Erro ao carregar equipes')
      const data = await response.json()
      const list = Array.isArray(data) ? data : data.teams || []
      setEquipes(list.map((item: { id: string; equipe?: string }) => ({
        id: String(item.id),
        label: item.equipe || '-'
      })))
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    void loadDesvio()
    void loadRiscos()
    void loadEquipes()
  }, [loadDesvio])

  useEffect(() => {
    const contrato = user?.contrato_raiz || formData.contrato || desvio?.contrato || undefined
    void loadNaturezas(contrato)
    void loadPotenciaisLocal(contrato)
    void loadLocais(contrato)
  }, [user?.contrato_raiz, desvio?.contrato, formData.contrato])

  useEffect(() => {
    if (!formData.potencial_local) return
    const mapped = potencialMap[formData.potencial_local]
    if (mapped && mapped !== formData.potencial) {
      setFormData((prev) => ({ ...prev, potencial: mapped }))
    }
  }, [formData.potencial_local, formData.potencial, potencialMap])

  useEffect(() => {
    if (formData.natureza_id) {
      const contrato = user?.contrato_raiz || formData.contrato || desvio?.contrato || undefined
      void loadTipos(formData.natureza_id, contrato)
    }
  }, [formData.natureza_id, user?.contrato_raiz, desvio?.contrato, formData.contrato])

  const requiredMissing = useMemo(() => {
    return !formData.descricao.trim() || !formData.local.trim() || !formData.natureza_id || !formData.tipo_id || !formData.riscoassociado_id || !formData.potencial
  }, [formData])

  const statusOptions = useMemo(() => {
    const values = [formData.status, ...STATUS_OPTIONS].filter(Boolean) as string[]
    return Array.from(new Set(values))
  }, [formData.status])

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!desvio) return

    if (requiredMissing) {
      toast.error('Preencha descricao, local, natureza, tipo, risco associado e potencial')
      return
    }

    setSaving(true)
    try {
      const payload = {
        id: desvio.id,
        descricao: formData.descricao.trim(),
        local: formData.local.trim(),
        contrato: formData.contrato || null,
        natureza_id: formData.natureza_id || null,
        tipo_id: formData.tipo_id || null,
        riscoassociado_id: formData.riscoassociado_id || null,
        potencial: formData.potencial || null,
        potencial_local: formData.potencial_local || null,
        ver_agir: formData.ver_agir,
        acao_cliente: formData.acao_cliente,
        gerou_recusa: formData.gerou_recusa,
        status: formData.status || null,
        acao: formData.acao || null,
        observacao: formData.observacao || null,
        equipe_id: formData.equipe_id || null
      }

      const response = await fetch('/api/desvios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Erro ao salvar desvio')
      }

      toast.success('Desvio atualizado com sucesso')
      router.push(`/desvios/${desvio.id}`)
    } catch (error) {
      console.error(error)
      toast.error('Erro ao salvar desvio')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!desvio) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Desvio nao encontrado</p>
        <button
          onClick={() => router.back()}
          className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar desvio</h1>
          <p className="text-sm text-gray-500">Atualize qualquer informacao do desvio.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Descricao</label>
            <textarea
              value={formData.descricao}
              onChange={(event) => setFormData((prev) => ({ ...prev, descricao: event.target.value }))}
              rows={5}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
            <select
              value={formData.local}
              onChange={(event) => setFormData((prev) => ({ ...prev, local: event.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione</option>
              {locais.map((local: string) => (
                <option key={local} value={local}>
                  {local}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contrato</label>
            <input
              value={formData.contrato}
              disabled
              onChange={(event) => setFormData((prev) => ({ ...prev, contrato: event.target.value }))}
              className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Natureza</label>
            <select
              value={formData.natureza_id}
              onChange={(event) => setFormData((prev) => ({ ...prev, natureza_id: event.target.value, tipo_id: '' }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione</option>
              {naturezas.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={formData.tipo_id}
              onChange={(event) => setFormData((prev) => ({ ...prev, tipo_id: event.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione</option>
              {tipos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Risco associado</label>
            <select
              value={formData.riscoassociado_id}
              onChange={(event) => setFormData((prev) => ({ ...prev, riscoassociado_id: event.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione</option>
              {riscos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Equipe</label>
            <select
              value={formData.equipe_id}
              onChange={(event) => setFormData((prev) => ({ ...prev, equipe_id: event.target.value }))}
              disabled
              className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600"
            >
              <option value="">Selecione</option>
              {equipes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Potencial</label>
            <input
              value={formData.potencial}
              disabled
              className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Potencial local</label>
            <select
              value={formData.potencial_local}
              onChange={(event) => {
                const value = event.target.value
                setFormData((prev) => ({
                  ...prev,
                  potencial_local: value,
                  potencial: potencialMap[value] || prev.potencial
                }))
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione</option>
              {potenciaisLocal.map((item) => (
                <option key={item.id} value={item.label}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value }))}
              disabled
              className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600"
            >
              <option value="">Selecione</option>
              {statusOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Acao</label>
            <textarea
              value={formData.acao}
              onChange={(event) => setFormData((prev) => ({ ...prev, acao: event.target.value }))}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Observacao</label>
            <textarea
              value={formData.observacao}
              onChange={(event) => setFormData((prev) => ({ ...prev, observacao: event.target.value }))}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formData.ver_agir}
                onChange={(event) => setFormData((prev) => ({ ...prev, ver_agir: event.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Ver & Agir
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formData.acao_cliente}
                onChange={(event) => setFormData((prev) => ({ ...prev, acao_cliente: event.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Acao cliente
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formData.gerou_recusa}
                onChange={(event) => setFormData((prev) => ({ ...prev, gerou_recusa: event.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Gerou recusa
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/desvios/${desvio.id}`)}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
