'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Search, Filter, Download, Eye, AlertTriangle, Clock, CheckCircle, XCircle, TrendingUp, Minus, User, ChevronLeft, ChevronRight, Edit, Save, X } from 'lucide-react'
import * as ExcelJS from 'exceljs'
import { toast } from 'sonner'

interface Desvio {
  id: string
  titulo: string
  descricao: string
  local: string
  data_ocorrencia: string
  status: string
  gravidade: string
  potencial: string
  potencial_local: string | null
  responsavel?: string | number | null
  responsavel_nome?: string | null
  avaliador_nome?: string | null
  natureza_id?: string | null
  tipo_id?: string | null
  riscoassociado_id?: string | null
  contrato?: string | null
  ver_agir?: boolean | null
  acao_cliente?: boolean | null
  gerou_recusa?: boolean | null
  acao?: string | null
  observacao?: string | null
  data_limite?: string | null
  data_conclusao?: string | null
  equipe_id?: string | null
  natureza?: {
    id: string
    natureza: string
  }
  tipo?: {
    id: string
    tipo: string
  }
  created_at: string
}

interface Responsavel {
  matricula: number
  nome: string
  email?: string
}

type DesvioStatus = 'Aguardando Avaliação' | 'Em Andamento' | 'Vencido' | 'Concluído'

interface Potencial {
  id: string
  potencial_sede: string
  potencial_local: string
  contrato: string
}

interface Option {
  id: string
  label: string
}

interface DesvioDetalhe extends Desvio {
  criador?: {
    matricula: string | number
    nome: string
    email?: string
  }
  equipe?: {
    id: string
    equipe: string
  }
}

interface EditFormData {
  local: string
  data_ocorrencia: string
  natureza_id: string
  tipo_id: string
  riscoassociado_id: string
  potencial: string
  potencial_local: string
  responsavel: string
  data_conclusao: string
  acao: string
  observacao: string
  ver_agir: boolean
  acao_cliente: boolean
  gerou_recusa: boolean
}

function parseDateOnly(dateString?: string | null) {
  if (!dateString) return null

  const normalizedDate = String(dateString).slice(0, 10)
  if (!normalizedDate) return null

  const parsedDate = new Date(`${normalizedDate}T00:00:00`)
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

function isDeadlineExpired(dateString?: string | null) {
  const deadline = parseDateOnly(dateString)
  if (!deadline) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return deadline < today
}

function deriveEditStatus({
  responsavel,
  dataConclusao,
  dataLimite
}: {
  responsavel?: string | null
  dataConclusao?: string | null
  dataLimite?: string | null
}): DesvioStatus {
  if (dataConclusao?.trim()) {
    return 'Concluído'
  }

  if (responsavel?.trim()) {
    return isDeadlineExpired(dataLimite) ? 'Vencido' : 'Em Andamento'
  }

  return 'Aguardando Avaliação'
}

function ensureSelectedOption(options: Option[], selectedId?: string | null, selectedLabel?: string | null) {
  if (!selectedId || !selectedLabel) {
    return options
  }

  return options.some((option) => option.id === selectedId)
    ? options
    : [{ id: selectedId, label: selectedLabel }, ...options]
}

function resolveSelectedOptionId(options: Option[], selectedId?: string | null, selectedLabel?: string | null) {
  const normalizedId = selectedId?.trim() || ''
  if (normalizedId && options.some((option) => option.id === normalizedId)) {
    return normalizedId
  }

  const normalizedLabel = selectedLabel?.trim().toLowerCase()
  if (!normalizedLabel) {
    return normalizedId
  }

  const matchedOption = options.find((option) => option.label.trim().toLowerCase() === normalizedLabel)
  return matchedOption?.id || normalizedId
}

interface Filtros {
  busca: string
  status: string
  gravidade: string
  responsavel_id: string
}

interface Estatisticas {
  total: number
  aguardando_avaliacao: number
  em_andamento: number
  concluido: number
  vencido: number
}

const statusColors = {
  'Aguardando Avaliação': '#F59E0B', // Amarelo
  'Em Andamento': '#3B82F6', // Azul
  'Concluído': '#10B981', // Verde
  'Vencido': '#EF4444' // Vermelho
}

const statusIcons = {
  'Aguardando Avaliação': Clock,
  'Em Andamento': AlertTriangle,
  'Concluído': CheckCircle,
  'Vencido': XCircle
}

export default function DesviosGerais() {
  const { user } = useAuth()
  const [desvios, setDesvios] = useState<Desvio[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtros, setFiltros] = useState<Filtros>({
    busca: '',
    status: '',
    gravidade: '',
    responsavel_id: ''
  })
  const [estatisticas, setEstatisticas] = useState<Estatisticas>({
    total: 0,
    aguardando_avaliacao: 0,
    em_andamento: 0,
    concluido: 0,
    vencido: 0
  })
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([])
  const [potenciais, setPotenciais] = useState<Potencial[]>([])
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingDesvio, setEditingDesvio] = useState<DesvioDetalhe | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [naturezas, setNaturezas] = useState<Option[]>([])
  const [tipos, setTipos] = useState<Option[]>([])
  const [riscos, setRiscos] = useState<Option[]>([])
  const [locais, setLocais] = useState<string[]>([])
  const [editFormData, setEditFormData] = useState<EditFormData>({
    local: '',
    data_ocorrencia: '',
    natureza_id: '',
    tipo_id: '',
    riscoassociado_id: '',
    potencial: '',
    potencial_local: '',
    responsavel: '',
    data_conclusao: '',
    acao: '',
    observacao: '',
    ver_agir: false,
    acao_cliente: false,
    gerou_recusa: false
  })

  const itemsPerPage = 20

  const formatDateForInput = (dateString?: string | null) => {
    if (!dateString) return ''

    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) {
      return typeof dateString === 'string' ? dateString.slice(0, 10) : ''
    }

    return date.toISOString().slice(0, 10)
  }

  const closeEditModal = useCallback(() => {
    setShowEditModal(false)
    setEditingDesvio(null)
    setTipos([])
    setLocais([])
    setNaturezas([])
    setRiscos([])
    setEditFormData({
      local: '',
      data_ocorrencia: '',
      natureza_id: '',
      tipo_id: '',
      riscoassociado_id: '',
      potencial: '',
      potencial_local: '',
      responsavel: '',
      data_conclusao: '',
      acao: '',
      observacao: '',
      ver_agir: false,
      acao_cliente: false,
      gerou_recusa: false
    })
  }, [])

  const loadNaturezas = useCallback(async (contrato?: string | null) => {
    if (!contrato) {
      setNaturezas([])
      return []
    }

    const response = await fetch(`/api/security-params/natures?contrato=${encodeURIComponent(contrato)}&limit=500`, {
      method: 'GET'
    })

    if (!response.ok) {
      throw new Error('Erro ao carregar naturezas')
    }

    const data = await response.json()
    if (data.success) {
      const options = (data.data || []).map((item: { id: string; natureza: string }) => ({
        id: String(item.id),
        label: item.natureza
      }))
      setNaturezas(options)
      return options
    }

    setNaturezas([])
    return []
  }, [])

  const loadTipos = useCallback(async (naturezaId?: string, contrato?: string | null) => {
    if (!naturezaId || !contrato) {
      setTipos([])
      return []
    }

    const response = await fetch(
      `/api/security-params/types?nature_id=${encodeURIComponent(naturezaId)}&contrato=${encodeURIComponent(contrato)}&limit=500`,
      { method: 'GET' }
    )

    if (!response.ok) {
      throw new Error('Erro ao carregar tipos')
    }

    const data = await response.json()
    if (data.success) {
      const options = (data.data || []).map((item: { id: string; tipo: string }) => ({
        id: String(item.id),
        label: item.tipo
      }))
      setTipos(options)
      return options
    }

    setTipos([])
    return []
  }, [])

  const loadRiscos = useCallback(async () => {
    const response = await fetch('/api/security-params/associated-risks?limit=500', {
      method: 'GET'
    })

    if (!response.ok) {
      throw new Error('Erro ao carregar riscos associados')
    }

    const data = await response.json()
    if (data.success) {
      setRiscos(
        (data.data || []).map((item: { id: string; risco_associado: string }) => ({
          id: String(item.id),
          label: item.risco_associado
        }))
      )
    }
  }, [])

  const loadLocais = useCallback(async (contrato?: string | null) => {
    if (!contrato) {
      setLocais([])
      return
    }

    const response = await fetch(`/api/security-params/locations?contrato=${encodeURIComponent(contrato)}&limit=500`, {
      method: 'GET'
    })

    if (!response.ok) {
      throw new Error('Erro ao carregar locais')
    }

    const data = await response.json()
    if (data.success) {
      const locaisList = (data.data || [])
        .map((item: { local?: string }) => item.local)
        .filter((local: string | undefined): local is string => typeof local === 'string' && local.trim().length > 0)
      setLocais(Array.from(new Set(locaisList)))
    }
  }, [])

  const handleOpenEditModal = useCallback(async (desvioPreview: Desvio) => {
    try {
      setEditLoading(true)
      setShowEditModal(true)

      const response = await fetch(`/api/desvios/${desvioPreview.id}`, {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar desvio')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.message || 'Erro ao carregar desvio')
      }

      const data = {
        ...result.data,
        avaliador_nome: result.data?.avaliador_nome || desvioPreview.avaliador_nome || null
      } as DesvioDetalhe
      const contrato = data.contrato || user?.contrato_raiz || null
      const naturezaId = data.natureza_id ? String(data.natureza_id) : data.natureza?.id ? String(data.natureza.id) : ''
      const tipoId = data.tipo_id ? String(data.tipo_id) : data.tipo?.id ? String(data.tipo.id) : ''

      setEditingDesvio(data)

      const [naturezasOptions] = await Promise.all([
        loadNaturezas(contrato),
        loadLocais(contrato),
        loadRiscos()
      ])

      const resolvedNaturezaId = resolveSelectedOptionId(
        naturezasOptions,
        naturezaId,
        data.natureza?.natureza || null
      )

      setNaturezas((prev) =>
        ensureSelectedOption(prev, resolvedNaturezaId, data.natureza?.natureza || null)
      )

      let resolvedTipoId = tipoId

      if (resolvedNaturezaId) {
        const tiposOptions = await loadTipos(resolvedNaturezaId, contrato)
        resolvedTipoId = resolveSelectedOptionId(
          tiposOptions,
          tipoId,
          data.tipo?.tipo || null
        )

        setTipos((prev) =>
          ensureSelectedOption(prev, resolvedTipoId, data.tipo?.tipo || null)
        )
      } else {
        setTipos([])
        resolvedTipoId = ''
      }

      setEditFormData({
        local: data.local || '',
        data_ocorrencia: formatDateForInput(data.data_ocorrencia || data.created_at),
        natureza_id: resolvedNaturezaId,
        tipo_id: resolvedTipoId,
        riscoassociado_id: data.riscoassociado_id ? String(data.riscoassociado_id) : '',
        potencial: data.potencial || '',
        potencial_local: data.potencial_local || '',
        responsavel: data.responsavel ? String(data.responsavel) : '',
        data_conclusao: formatDateForInput(data.data_conclusao),
        acao: data.acao || '',
        observacao: data.observacao || '',
        ver_agir: Boolean(data.ver_agir),
        acao_cliente: Boolean(data.acao_cliente),
        gerou_recusa: Boolean(data.gerou_recusa)
      })
    } catch (error) {
      console.error('Erro ao abrir edição do desvio:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar dados do desvio')
      closeEditModal()
    } finally {
      setEditLoading(false)
    }
  }, [closeEditModal, loadLocais, loadNaturezas, loadRiscos, loadTipos, user?.contrato_raiz])

  const handleEditSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!editingDesvio) return

    if (!editFormData.local || !editFormData.natureza_id || !editFormData.tipo_id || !editFormData.riscoassociado_id || !editFormData.potencial) {
      toast.error('Preencha os campos obrigatórios para salvar o desvio')
      return
    }

    if (editFormData.data_conclusao && !editFormData.responsavel) {
      toast.error('Informe o responsavel para concluir o desvio')
      return
    }

    const calculatedStatus = deriveEditStatus({
      responsavel: editFormData.responsavel,
      dataConclusao: editFormData.data_conclusao,
      dataLimite: editingDesvio.data_limite
    })

    try {
      setSavingEdit(true)

      const response = await fetch('/api/desvios', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: editingDesvio.id,
          local: editFormData.local,
          data_ocorrencia: editFormData.data_ocorrencia || null,
          natureza_id: editFormData.natureza_id || null,
          tipo_id: editFormData.tipo_id || null,
          riscoassociado_id: editFormData.riscoassociado_id || null,
          potencial: editFormData.potencial || null,
          potencial_local: editFormData.potencial_local || null,
          responsavel: editFormData.responsavel || null,
          status: calculatedStatus,
          data_conclusao: editFormData.data_conclusao || null,
          acao: editFormData.acao || null,
          observacao: editFormData.observacao || null,
          ver_agir: editFormData.ver_agir,
          acao_cliente: editFormData.acao_cliente,
          gerou_recusa: editFormData.gerou_recusa
        })
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Erro ao atualizar desvio')
      }

      toast.success('Desvio atualizado com sucesso')
      closeEditModal()
      await loadDesvios()
    } catch (error) {
      console.error('Erro ao salvar desvio:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar desvio')
    } finally {
      setSavingEdit(false)
    }
  }

  const potencialLocalOptions = useMemo(
    () =>
      potenciais
        .filter((potencial) => !user?.contrato_raiz || potencial.contrato === user.contrato_raiz)
        .map((potencial) => ({
          id: potencial.id,
          label: potencial.potencial_local,
          potencial: potencial.potencial_sede || potencial.potencial_local
        })),
    [potenciais, user?.contrato_raiz]
  )

  const editStatus = useMemo(
    () =>
      deriveEditStatus({
        responsavel: editFormData.responsavel,
        dataConclusao: editFormData.data_conclusao,
        dataLimite: editingDesvio?.data_limite
      }),
    [editFormData.data_conclusao, editFormData.responsavel, editingDesvio?.data_limite]
  )

  const loadDesvios = useCallback(async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        gerais: 'true', // Filtrar todos os desvios do contrato
        ...(filtros.busca && { search: filtros.busca }),
        ...(filtros.status && { status: filtros.status }),
        ...(filtros.gravidade && { potencial_local: filtros.gravidade }),
        ...(filtros.responsavel_id && { responsavel: filtros.responsavel_id })
      })

      const response = await fetch(`/api/desvios?${params}`, {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar desvios')
      }

      const data = await response.json()
      
      if (data.success) {
        console.log('Desvios recebidos da API:', data.data)
        
        setDesvios(data.data)
        setTotalPages(data.pagination.totalPages)
        
        // Calcular estatísticas dos dados recebidos
        const stats = data.data.reduce((acc: Estatisticas, item: Desvio) => {
          switch (item.status) {
            case 'Aguardando Avaliação':
              acc.aguardando_avaliacao++
              break
            case 'Em Andamento':
              acc.em_andamento++
              break
            case 'Concluído':
              acc.concluido++
              break
            case 'Vencido':
              acc.vencido++
              break
          }
          return acc
        }, { total: data.pagination.total, aguardando_avaliacao: 0, em_andamento: 0, concluido: 0, vencido: 0 })

        setEstatisticas(stats)
      } else {
        toast.error(data.message || 'Erro ao carregar desvios')
      }
      
    } catch (error) {
      console.error('Error loading desvios:', error)
      toast.error('Erro ao carregar desvios')
    } finally {
      setLoading(false)
    }
  }, [currentPage, filtros])

  const loadPotenciais = async () => {
    try {
 

      const response = await fetch('/api/security-params/potentials', {
        method: 'GET'
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setPotenciais(data.data || [])
        }
      }
    } catch (error) {
      console.error('Erro ao carregar potenciais:', error)
    }
  }

  const loadFilterOptions = useCallback(async () => {
    try {


      // Carregar responsáveis
      const responsaveisResponse = await fetch('/api/desvios/responsaveis', {
        method: 'GET'
      })

      if (responsaveisResponse.ok) {
        const responsaveisData = await responsaveisResponse.json()
        if (responsaveisData.success) {
          setResponsaveis(responsaveisData.users || [])
        }
      }

      // Carregar potenciais
      await loadPotenciais()
    } catch (error) {
      console.error('Erro ao carregar opções de filtro:', error)
    }
  }, [])

  // Debounce para o campo de busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setFiltros(prev => ({ ...prev, busca: searchTerm }))
      setCurrentPage(1)
    }, 500)
    
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Carregamento inicial das opções de filtro
  useEffect(() => {
    if (user) {
      loadFilterOptions()
    }
  }, [user, loadFilterOptions])

  // Carregamento dos desvios quando filtros ou página mudam
  useEffect(() => {
    if (user) {
      loadDesvios()
    }
  }, [user, filtros, currentPage, loadDesvios])

  useEffect(() => {
    if (!showEditModal || !editingDesvio) return

    const contrato = editingDesvio.contrato || user?.contrato_raiz || null
    if (!editFormData.natureza_id || !contrato) {
      setTipos([])
      return
    }

    void loadTipos(editFormData.natureza_id, contrato)
  }, [editFormData.natureza_id, editingDesvio, loadTipos, showEditModal, user?.contrato_raiz])

  useEffect(() => {
    if (!editFormData.potencial_local) return

    const selectedPotencial = potencialLocalOptions.find(
      (potencial) => potencial.label === editFormData.potencial_local
    )

    if (selectedPotencial && selectedPotencial.potencial !== editFormData.potencial) {
      setEditFormData((prev) => ({
        ...prev,
        potencial: selectedPotencial.potencial
      }))
    }
  }, [editFormData.potencial, editFormData.potencial_local, potencialLocalOptions])

  const handleFilterChange = (field: keyof Filtros, value: string) => {
    setFiltros(prev => ({ ...prev, [field]: value }))
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setFiltros({
      busca: '',
      status: '',
      gravidade: '',
      responsavel_id: ''
    })
    setCurrentPage(1)
  }

  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Desvios Gerais')

      // Cabeçalhos
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 15 },
        { header: 'Título', key: 'titulo', width: 30 },
        { header: 'Descrição', key: 'descricao', width: 40 },
        { header: 'Local', key: 'local', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Gravidade', key: 'gravidade', width: 15 },
        { header: 'Potencial', key: 'potencial', width: 15 },
        { header: 'Responsável', key: 'responsavel_nome', width: 25 },
        { header: 'Avaliador', key: 'avaliador_nome', width: 25 },
        { header: 'Data Ocorrência', key: 'data_ocorrencia', width: 15 },
        { header: 'Criado em', key: 'created_at', width: 15 }
      ]

      // Dados
      desvios.forEach(desvio => {
        worksheet.addRow({
          id: desvio.id,
          titulo: desvio.titulo,
          descricao: desvio.descricao,
          local: desvio.local,
          status: desvio.status,
          gravidade: desvio.gravidade,
          potencial: desvio.potencial,
          responsavel_nome: desvio.responsavel_nome || 'Não atribuído',
          avaliador_nome: desvio.avaliador_nome || 'Não definido',
          data_ocorrencia: formatDate(desvio.data_ocorrencia),
          created_at: formatDate(desvio.created_at)
        })
      })

      // Estilizar cabeçalho
      worksheet.getRow(1).font = { bold: true }
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F3FF' }
      }

      // Gerar arquivo
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `desvios-gerais-${new Date().toISOString().split('T')[0]}.xlsx`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erro ao exportar para Excel:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const FarolStatus = ({ status }: { status: string }) => {
    const getStatusConfig = (status: string) => {
      switch (status) {
        case 'Aguardando Avaliação':
          return { color: 'bg-yellow-500', icon: Clock }
        case 'Em Andamento':
          return { color: 'bg-blue-500', icon: TrendingUp }
        case 'Concluído':
          return { color: 'bg-green-500', icon: CheckCircle }
        case 'Vencido':
          return { color: 'bg-red-500', icon: XCircle }
        default:
          return { color: 'bg-gray-500', icon: Minus }
      }
    }

    const config = getStatusConfig(status)
    const Icon = config.icon

    return (
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${config.color}`} />
        <Icon className="w-4 h-4" />
      </div>
    )
  }

  const LegendaFarol = () => (
    <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
      <h3 className="font-semibold text-gray-900 mb-3">Legenda do Status</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(statusColors).map(([status, color]) => {
          const Icon = statusIcons[status as keyof typeof statusIcons]
          return (
            <div key={status} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <Icon size={14} style={{ color }} />
              <span className="text-sm text-gray-700">{status}</span>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Desvios Gerais</h1>
          <p className="text-gray-600 mt-2">
            Visualização completa dos desvios do contrato
          </p>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{estatisticas.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Aguardando</p>
                <p className="text-2xl font-bold text-gray-900">{estatisticas.aguardando_avaliacao}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Em Andamento</p>
                <p className="text-2xl font-bold text-gray-900">{estatisticas.em_andamento}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Concluído</p>
                <p className="text-2xl font-bold text-gray-900">{estatisticas.concluido}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Vencido</p>
                <p className="text-2xl font-bold text-gray-900">{estatisticas.vencido}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Legenda do Farol */}
        <LegendaFarol />

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-500" />
                <h3 className="font-semibold text-gray-900">Filtros</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Limpar Filtros
                </button>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {showFilters ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Busca */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Buscar
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Título ou descrição..."
                      className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={filtros.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Todos</option>
                    <option value="Aguardando Avaliação">Aguardando Avaliação</option>
                    <option value="Em Andamento">Em Andamento</option>
                    <option value="Concluído">Concluído</option>
                    <option value="Vencido">Vencido</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>

                {/* Gravidade (Potencial Local) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gravidade
                  </label>
                  <select
                    value={filtros.gravidade}
                    onChange={(e) => handleFilterChange('gravidade', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Todas</option>
                    {potenciais.map(pot => (
                      <option key={pot.id} value={pot.potencial_local}>{pot.potencial_local}</option>
                    ))}
                  </select>
                </div>

                {/* Responsável */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Responsável
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select
                      value={filtros.responsavel_id}
                      onChange={(e) => handleFilterChange('responsavel_id', e.target.value)}
                      className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Todos</option>
                      {responsaveis.map(resp => (
                        <option key={resp.matricula} value={resp.matricula}>{resp.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-sm text-gray-600">
            {desvios.length} de {estatisticas.total} desvios
          </div>
          <button
            onClick={exportToExcel}
            disabled={desvios.length === 0}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            Exportar Excel ({desvios.length})
          </button>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Carregando desvios...</p>
            </div>
          ) : desvios.length === 0 ? (
            <div className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum desvio encontrado</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Título
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Local
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gravidade
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Responsável
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avaliador
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {desvios.map((desvio) => (
                      <tr key={desvio.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <FarolStatus status={desvio.status} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {desvio.titulo}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {desvio.descricao}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {desvio.local}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(desvio.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            desvio.potencial_local === 'Crítica' ? 'bg-red-100 text-red-800' :
                            desvio.potencial_local === 'Alta' ? 'bg-orange-100 text-orange-800' :
                            desvio.potencial_local === 'Média' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {desvio.potencial_local || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {desvio.responsavel_nome || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {desvio.avaliador_nome || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleOpenEditModal(desvio)}
                              className="text-amber-600 hover:text-amber-900 flex items-center gap-1"
                            >
                              <Edit className="h-4 w-4" />
                              Editar
                            </button>
                            <button
                              onClick={() => window.open(`/desvios/${desvio.id}`, '_blank')}
                              className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              Ver
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Próximo
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Mostrando{' '}
                          <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
                          {' '}até{' '}
                          <span className="font-medium">
                            {Math.min(currentPage * itemsPerPage, estatisticas.total)}
                          </span>
                          {' '}de{' '}
                          <span className="font-medium">{estatisticas.total}</span>
                          {' '}resultados
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum
                            if (totalPages <= 5) {
                              pageNum = i + 1
                            } else if (currentPage <= 3) {
                              pageNum = i + 1
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i
                            } else {
                              pageNum = currentPage - 2 + i
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  currentPage === pageNum
                                    ? 'z-10 bg-blue-500 border-blue-500 text-blue-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {pageNum}
                              </button>
                            )
                          })}
                          
                          <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b px-6 py-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Editar desvio</h2>
                  <p className="text-sm text-gray-500">
                    Você pode alterar os dados do desvio, exceto a descrição do relato e as informações do relatante.
                  </p>
                </div>
                <button
                  onClick={closeEditModal}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {editLoading || !editingDesvio ? (
                <div className="flex items-center justify-center py-16">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <form onSubmit={handleEditSubmit} className="space-y-6 p-6">
                  <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Relatante</p>
                      <p className="mt-1 text-sm text-gray-900">{editingDesvio.criador?.nome || '-'}</p>
                      <p className="text-xs text-gray-500">
                        Matrícula: {editingDesvio.criador?.matricula || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Equipe do relato</p>
                      <p className="mt-1 text-sm text-gray-900">{editingDesvio.equipe?.equipe || '-'}</p>
                      <p className="text-xs text-gray-500">
                        Avaliador derivado: {editingDesvio.avaliador_nome || '-'}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-gray-700">Descrição do relato</label>
                      <textarea
                        value={editingDesvio.descricao || ''}
                        disabled
                        rows={4}
                        className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Local</label>
                      <select
                        value={editFormData.local}
                        onChange={(event) => setEditFormData((prev) => ({ ...prev, local: event.target.value }))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecione</option>
                        {locais.map((local) => (
                          <option key={local} value={local}>
                            {local}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Data da ocorrência</label>
                      <input
                        type="date"
                        value={editFormData.data_ocorrencia}
                        onChange={(event) => setEditFormData((prev) => ({ ...prev, data_ocorrencia: event.target.value }))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Natureza</label>
                      <select
                        value={editFormData.natureza_id}
                        onChange={(event) => setEditFormData((prev) => ({ ...prev, natureza_id: event.target.value, tipo_id: '' }))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      <label className="mb-1 block text-sm font-medium text-gray-700">Tipo</label>
                      <select
                        value={editFormData.tipo_id}
                        onChange={(event) => setEditFormData((prev) => ({ ...prev, tipo_id: event.target.value }))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      <label className="mb-1 block text-sm font-medium text-gray-700">Risco associado</label>
                      <select
                        value={editFormData.riscoassociado_id}
                        onChange={(event) => setEditFormData((prev) => ({ ...prev, riscoassociado_id: event.target.value }))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      <label className="mb-1 block text-sm font-medium text-gray-700">Responsável</label>
                      <select
                        value={editFormData.responsavel}
                        onChange={(event) => setEditFormData((prev) => ({ ...prev, responsavel: event.target.value }))}
                        required={Boolean(editFormData.data_conclusao)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Não atribuído</option>
                        {responsaveis.map((resp) => (
                          <option key={resp.matricula} value={resp.matricula}>
                            {resp.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                      <input
                        type="text"
                        value={editStatus}
                        disabled
                        className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Calculado automaticamente por responsavel, data limite e data de conclusao.
                      </p>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Potencial</label>
                      <input
                        type="text"
                        value={editFormData.potencial}
                        disabled
                        className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Potencial local</label>
                      <select
                        value={editFormData.potencial_local}
                        onChange={(event) => {
                          const selected = potencialLocalOptions.find((item) => item.label === event.target.value)
                          setEditFormData((prev) => ({
                            ...prev,
                            potencial_local: event.target.value,
                            potencial: selected?.potencial || prev.potencial
                          }))
                        }}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecione</option>
                        {potencialLocalOptions.map((item) => (
                          <option key={item.id} value={item.label}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Data conclusão</label>
                      <input
                        type="date"
                        value={editFormData.data_conclusao}
                        onChange={(event) => setEditFormData((prev) => ({ ...prev, data_conclusao: event.target.value }))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-gray-700">Ação</label>
                      <textarea
                        value={editFormData.acao}
                        onChange={(event) => setEditFormData((prev) => ({ ...prev, acao: event.target.value }))}
                        rows={3}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-gray-700">Observação</label>
                      <textarea
                        value={editFormData.observacao}
                        onChange={(event) => setEditFormData((prev) => ({ ...prev, observacao: event.target.value }))}
                        rows={3}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <label className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={editFormData.ver_agir}
                          onChange={(event) => setEditFormData((prev) => ({ ...prev, ver_agir: event.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Ver &amp; Agir
                      </label>
                      <label className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={editFormData.acao_cliente}
                          onChange={(event) => setEditFormData((prev) => ({ ...prev, acao_cliente: event.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Ação cliente
                      </label>
                      <label className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={editFormData.gerou_recusa}
                          onChange={(event) => setEditFormData((prev) => ({ ...prev, gerou_recusa: event.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Gerou recusa
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 border-t pt-4">
                    <button
                      type="button"
                      onClick={closeEditModal}
                      className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={savingEdit}
                      className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      <Save className="h-4 w-4" />
                      {savingEdit ? 'Salvando...' : 'Salvar alterações'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
  )
}
