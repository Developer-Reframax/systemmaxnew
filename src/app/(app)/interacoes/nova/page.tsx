'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Save, Users, MapPin, FileText, Search, X, ChevronDown, ChevronRight, Shield } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Usuario {
  matricula: number
  nome: string
  funcao?: string
  email?: string
}

interface TipoInteracao {
  id: number
  tipo: string
  descricao?: string
}

interface Unidade {
  id: number
  unidade: string
  descricao?: string
}

interface Area {
  id: number
  area: string
  descricao?: string
}

interface Classificacao {
  id: number
  classificacao: string
  descricao?: string
}

interface Violacao {
  id: number
  violacao: string
  descricao?: string
}

interface GrandeRisco {
  id: number
  grandes_riscos: string
  descricao?: string
}

interface LocalInstalacao {
  id: number
  local_instalacao: string
  descricao?: string
}

interface Local {
  id: number
  local: string
  descricao?: string
}



interface InteracaoFormData {
  tipo_id: string
  metodo_coach: string
  data_interacao: string
  unidade_id: string
  empresa: string
  area_id: string
  local_id: string
  houve_desvios: string
  descricao: string
  acao: string
  evento: string
  violacao_id: string
  instante: string
  grande_risco_id: string
  matricula_colaborador: string
  matricula_coordenador: string
  classificacao_id: string
  local_instalacao_id: string
  matricula_supervisor: string
}

// Componente SearchableSelect reutilizável
interface SearchableSelectOption {
  id: number;
  nome?: string;
  tipo?: string;
  unidade?: string;
  area?: string;
  classificacao?: string;
  violacao?: string;
  grandes_riscos?: string;
  local_instalacao?: string;
  local?: string;
  matricula?: number;
  descricao?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  disabled?: boolean
  error?: string
}

function SearchableSelect({ 
  options, 
  value, 
  onChange, 
  placeholder, 
  disabled = false, 
  error
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const getDisplayName = (option: SearchableSelectOption) => {
    return option.nome || option.tipo || option.unidade || option.area || 
           option.classificacao || option.violacao || option.grandes_riscos || 
           option.local_instalacao || option.local || ''
  }

  const filteredOptions = options.filter(option => 
    searchTerm === '' || 
    getDisplayName(option).toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedOption = options.find(option => option.id.toString() === value)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (option: SearchableSelectOption) => {
    onChange(option.id.toString())
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setSearchTerm('')
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className={`relative w-full border rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent ${
        error ? 'border-red-500' : 'border-gray-300'
      } ${disabled ? 'bg-gray-100' : 'bg-white'}`}>
        <div className="flex items-center">
          <Search className="w-4 h-4 text-gray-400 ml-3" />
          <input
            type="text"
            value={isOpen ? searchTerm : (selectedOption ? getDisplayName(selectedOption) : '')}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              if (!isOpen) setIsOpen(true)
            }}
            onFocus={() => !disabled && setIsOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 px-3 py-2 bg-transparent focus:outline-none disabled:cursor-not-allowed"
          />
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded mr-1"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 mr-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option)}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium text-gray-900">{getDisplayName(option)}</div>
                {option.descricao && (
                  <div className="text-sm text-gray-500">{option.descricao}</div>
                )}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-gray-500 text-center">
              Nenhuma opção encontrada
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function NovaInteracao() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingDropdowns, setLoadingDropdowns] = useState(true)
  
  // Estados para as opções dos dropdowns
  const [tipos, setTipos] = useState<TipoInteracao[]>([])
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [classificacoes, setClassificacoes] = useState<Classificacao[]>([])
  const [violacoes, setViolacoes] = useState<Violacao[]>([])
  const [grandesRiscos, setGrandesRiscos] = useState<GrandeRisco[]>([])
  const [locaisInstalacao, setLocaisInstalacao] = useState<LocalInstalacao[]>([])
  const [locais, setLocais] = useState<Local[]>([])
  const [coordenadores, setCoordenadores] = useState<Usuario[]>([])
  const [supervisores, setSupervisores] = useState<Usuario[]>([])
  
  const [formData, setFormData] = useState<InteracaoFormData>({
    tipo_id: '',
    metodo_coach: '',
    data_interacao: '',
    unidade_id: '',
    empresa: '',
    area_id: '',
    local_id: '',
    houve_desvios: '',
    descricao: '',
    acao: '',
    evento: '',
    violacao_id: '',
    instante: '',
    grande_risco_id: '',
    matricula_colaborador: '',
    matricula_coordenador: '',
    classificacao_id: '',
    local_instalacao_id: '',
    matricula_supervisor: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Carregar dados dos dropdowns
  useEffect(() => {
    loadDropdownData()
  }, [])

  const loadDropdownData = async () => {
    try {
      setLoadingDropdowns(true)

      console.log('Carregando dados dos dropdowns...')

      const [
        tiposRes,
        unidadesRes,
        areasRes,
        classificacoesRes,
        violacoesRes,
        grandesRiscosRes,
        locaisInstalacaoRes,
        locaisRes,
        usuariosRes
      ] = await Promise.all([
        fetch('/api/interacoes/tipos', { method: 'GET' }),
        fetch('/api/interacoes/unidades', { method: 'GET' }),
        fetch('/api/interacoes/areas', { method: 'GET' }),
        fetch('/api/interacoes/classificacoes', { method: 'GET' }),
        fetch('/api/interacoes/violacoes', { method: 'GET' }),
        fetch('/api/interacoes/grandes-riscos', { method: 'GET' }),
        fetch('/api/interacoes/local-instalacao', { method: 'GET' }),
        fetch('/api/security-params/locations', { method: 'GET' }),
        fetch('/api/usuarios', { method: 'GET' })
      ])

      // Processar tipos
      if (tiposRes.ok) {
        const tiposData = await tiposRes.json()
        console.log('Tipos carregados:', tiposData)
        if (tiposData.success) {
          setTipos(tiposData.data || [])
        } else {
          console.error('Erro ao carregar tipos:', tiposData.message)
          toast.error('Erro ao carregar tipos de interação')
        }
      } else {
        console.error('Erro na requisição de tipos:', tiposRes.status)
        toast.error('Erro ao carregar tipos de interação')
      }

      // Processar unidades
      if (unidadesRes.ok) {
        const unidadesData = await unidadesRes.json()
        console.log('Unidades carregadas:', unidadesData)
        if (unidadesData.success) {
          setUnidades(unidadesData.data || [])
        } else {
          console.error('Erro ao carregar unidades:', unidadesData.message)
          toast.error('Erro ao carregar unidades')
        }
      } else {
        console.error('Erro na requisição de unidades:', unidadesRes.status)
        toast.error('Erro ao carregar unidades')
      }

      // Processar áreas
      if (areasRes.ok) {
        const areasData = await areasRes.json()
        console.log('Áreas carregadas:', areasData)
        if (areasData.success) {
          setAreas(areasData.data || [])
        } else {
          console.error('Erro ao carregar áreas:', areasData.message)
          toast.error('Erro ao carregar áreas')
        }
      } else {
        console.error('Erro na requisição de áreas:', areasRes.status)
        toast.error('Erro ao carregar áreas')
      }

      // Processar classificações
      if (classificacoesRes.ok) {
        const classificacoesData = await classificacoesRes.json()
        console.log('Classificações carregadas:', classificacoesData)
        if (classificacoesData.success) {
          setClassificacoes(classificacoesData.data || [])
        } else {
          console.error('Erro ao carregar classificações:', classificacoesData.message)
          toast.error('Erro ao carregar classificações')
        }
      } else {
        console.error('Erro na requisição de classificações:', classificacoesRes.status)
        toast.error('Erro ao carregar classificações')
      }

      // Processar violações
      if (violacoesRes.ok) {
        const violacoesData = await violacoesRes.json()
        console.log('Violações carregadas:', violacoesData)
        if (violacoesData.success) {
          setViolacoes(violacoesData.data || [])
        } else {
          console.error('Erro ao carregar violações:', violacoesData.message)
          toast.error('Erro ao carregar violações')
        }
      } else {
        console.error('Erro na requisição de violações:', violacoesRes.status)
        toast.error('Erro ao carregar violações')
      }

      // Processar grandes riscos
      if (grandesRiscosRes.ok) {
        const grandesRiscosData = await grandesRiscosRes.json()
        console.log('Grandes riscos carregados:', grandesRiscosData)
        if (grandesRiscosData.success) {
          setGrandesRiscos(grandesRiscosData.data || [])
        } else {
          console.error('Erro ao carregar grandes riscos:', grandesRiscosData.message)
          toast.error('Erro ao carregar grandes riscos')
        }
      } else {
        console.error('Erro na requisição de grandes riscos:', grandesRiscosRes.status)
        toast.error('Erro ao carregar grandes riscos')
      }

      // Processar locais de instalação
      if (locaisInstalacaoRes.ok) {
        const locaisInstalacaoData = await locaisInstalacaoRes.json()
        console.log('Locais de instalação carregados:', locaisInstalacaoData)
        if (locaisInstalacaoData.success) {
          setLocaisInstalacao(locaisInstalacaoData.data || [])
        } else {
          console.error('Erro ao carregar locais de instalação:', locaisInstalacaoData.message)
          toast.error('Erro ao carregar locais de instalação')
        }
      } else {
        console.error('Erro na requisição de locais de instalação:', locaisInstalacaoRes.status)
        toast.error('Erro ao carregar locais de instalação')
      }

      // Processar locais
      if (locaisRes.ok) {
        const locaisData = await locaisRes.json()
        console.log('Locais carregados:', locaisData)
        if (locaisData.success && locaisData.data) {
          setLocais(locaisData.data.map((local: Local) => ({
            id: local.id,
            local: local.local,
            descricao: local.descricao
          })))
        } else {
          console.error('Erro ao carregar locais:', locaisData.message)
          toast.error('Erro ao carregar locais')
        }
      } else {
        console.error('Erro na requisição de locais:', locaisRes.status)
        toast.error('Erro ao carregar locais')
      }

      // Processar usuários (coordenadores e supervisores)
      if (usuariosRes.ok) {
        const usuariosData = await usuariosRes.json()
        console.log('Usuários carregados:', usuariosData)
        // A API /api/usuarios retorna diretamente um array de usuários
        if (Array.isArray(usuariosData)) {
          setCoordenadores(usuariosData)
          setSupervisores(usuariosData)
        } else {
          console.error('Formato inesperado dos dados de usuários:', usuariosData)
          toast.error('Erro ao processar dados de usuários')
        }
      } else {
        console.error('Erro na requisição de usuários:', usuariosRes.status)
        toast.error('Erro ao carregar usuários')
      }

      console.log('Carregamento dos dropdowns concluído')
    } catch (error) {
      console.error('Erro ao carregar dados dos dropdowns:', error)
      toast.error('Erro ao carregar dados do formulário')
    } finally {
      setLoadingDropdowns(false)
    }
  }

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 1) {
      if (!formData.tipo_id) newErrors.tipo_id = 'Tipo de interação é obrigatório'
      if (!formData.metodo_coach) newErrors.metodo_coach = 'Método coach é obrigatório'
      if (!formData.data_interacao) newErrors.data_interacao = 'Data da interação é obrigatória'
      if (!formData.unidade_id) newErrors.unidade_id = 'Unidade é obrigatória'
      if (!formData.empresa.trim()) newErrors.empresa = 'Empresa é obrigatória'
      if (!formData.area_id) newErrors.area_id = 'Área é obrigatória'
      if (!formData.local_id) newErrors.local_id = 'Local é obrigatório'
      if (!formData.local_instalacao_id) newErrors.local_instalacao_id = 'Local de instalação é obrigatório'
    }

    if (step === 2) {
      if (!formData.evento) newErrors.evento = 'Evento é obrigatório'
      if (!formData.instante) newErrors.instante = 'Instante é obrigatório'
      if (!formData.houve_desvios) newErrors.houve_desvios = 'Campo "Houve desvios" é obrigatório'
      if (!formData.classificacao_id) newErrors.classificacao_id = 'Classificação é obrigatória'
    }

    if (step === 3) {
      if (!formData.descricao.trim()) newErrors.descricao = 'Descrição é obrigatória'
      if (!formData.acao.trim()) newErrors.acao = 'Ação imediata é obrigatória'
      if (!formData.matricula_coordenador) newErrors.matricula_coordenador = 'Coordenador responsável é obrigatório'
      if (!formData.matricula_supervisor) newErrors.matricula_supervisor = 'Supervisor responsável é obrigatório'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1)
    setErrors({})
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateStep(3)) {
      return
    }

    try {
      setLoading(true)

      // Preencher automaticamente a matrícula do colaborador e mapear campos para a API
      const { data_interacao, local_instalacao_id, ...restFormData } = formData
      const formDataWithColaborador = {
        ...restFormData,
        data: data_interacao, // Mapear para o campo esperado pela API
        local_interacao_id: local_instalacao_id // Mapear local_instalacao_id para local_interacao_id
      }

      const response = await fetch('/api/interacoes', {
        method: 'POST',
        body: JSON.stringify(formDataWithColaborador)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao criar interação')
      }

      toast.success('Interação criada com sucesso!')
      router.push('/interacoes')
    } catch (error) {
      console.error('Erro ao criar interação:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao criar interação')
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { number: 1, title: 'Informações Básicas', description: 'Tipo, método, data, empresa e localização' },
    { number: 2, title: 'Detalhes da Interação', description: 'Evento, instante, desvios e classificação' },
    { number: 3, title: 'Descrição e Responsáveis', description: 'Descrição, ação e responsáveis' }
  ]

  return (
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Link
              href="/interacoes"
              className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Nova Interação</h1>
              <p className="text-gray-600">Registre uma nova interação de segurança</p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.number
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 text-gray-500'
                }`}>
                  {step.number}
                </div>
                <div className="ml-3">
                  <div className={`text-sm font-medium ${
                    currentStep >= step.number ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-500">{step.description}</div>
                </div>
                {index < steps.length - 1 && (
                  <ChevronRight className="w-5 h-5 text-gray-400 mx-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 relative">
          {/* Loading Overlay */}
          {loadingDropdowns && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Carregando dados do formulário...</p>
              </div>
            </div>
          )}

          {/* Step 1: Informações Básicas */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center mb-6">
                <MapPin className="w-5 h-5 text-blue-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">Informações Básicas da Interação</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Interação *
                  </label>
                  <SearchableSelect
                    options={tipos}
                    value={formData.tipo_id}
                    onChange={(value) => setFormData({ ...formData, tipo_id: value })}
                    placeholder="Selecione o tipo de interação"
                    error={errors.tipo_id}
                  />
                  {errors.tipo_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.tipo_id}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Método Coach *
                  </label>
                  <select
                    value={formData.metodo_coach}
                    onChange={(e) => setFormData({ ...formData, metodo_coach: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.metodo_coach ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Selecione</option>
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </select>
                  {errors.metodo_coach && (
                    <p className="mt-1 text-sm text-red-600">{errors.metodo_coach}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data da Interação *
                  </label>
                  <input
                    type="date"
                    value={formData.data_interacao}
                    onChange={(e) => setFormData({ ...formData, data_interacao: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.data_interacao ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.data_interacao && (
                    <p className="mt-1 text-sm text-red-600">{errors.data_interacao}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Empresa *
                  </label>
                  <select
                    value={formData.empresa}
                    onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.empresa ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Selecione uma empresa</option>
                    <option value="Reframax">Reframax</option>
                    <option value="AMT">AMT</option>
                    <option value="AMP">AMP</option>
                  </select>
                  {errors.empresa && (
                    <p className="mt-1 text-sm text-red-600">{errors.empresa}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unidade *
                  </label>
                  <SearchableSelect
                    options={unidades}
                    value={formData.unidade_id}
                    onChange={(value) => setFormData({ ...formData, unidade_id: value })}
                    placeholder="Selecione a unidade"
                    error={errors.unidade_id}
                  />
                  {errors.unidade_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.unidade_id}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Área *
                  </label>
                  <SearchableSelect
                    options={areas}
                    value={formData.area_id}
                    onChange={(value) => setFormData({ ...formData, area_id: value })}
                    placeholder="Selecione a área"
                    error={errors.area_id}
                  />
                  {errors.area_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.area_id}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Local *
                  </label>
                  <SearchableSelect
                    options={locais.map(local => ({
                      id: local.id,
                      local: local.local
                    }))}
                    value={formData.local_id}
                    onChange={(value) => setFormData({ ...formData, local_id: value })}
                    placeholder="Selecione o local"
                    error={errors.local_id}
                  />
                  {errors.local_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.local_id}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Local de Instalação *
                  </label>
                  <SearchableSelect
                    options={locaisInstalacao}
                    value={formData.local_instalacao_id}
                    onChange={(value) => setFormData({ ...formData, local_instalacao_id: value })}
                    placeholder="Selecione o local de instalação"
                    error={errors.local_instalacao_id}
                  />
                  {errors.local_instalacao_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.local_instalacao_id}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Detalhes da Interação */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center mb-6">
                <Shield className="w-5 h-5 text-blue-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">Detalhes da Interação</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Evento *
                  </label>
                  <select
                    value={formData.evento}
                    onChange={(e) => setFormData({ ...formData, evento: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.evento ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Selecione</option>
                    <option value="ROTINA">ROTINA</option>
                    <option value="PARADA">PARADA</option>
                  </select>
                  {errors.evento && (
                    <p className="mt-1 text-sm text-red-600">{errors.evento}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instante *
                  </label>
                  <select
                    value={formData.instante}
                    onChange={(e) => setFormData({ ...formData, instante: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.instante ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Selecione</option>
                    <option value="N/A">N/A</option>
                    <option value="HORA SEGURA">HORA SEGURA</option>
                    <option value="INSPEÇÃO DE SEGURANÇA">INSPEÇÃO DE SEGURANÇA</option>
                  </select>
                  {errors.instante && (
                    <p className="mt-1 text-sm text-red-600">{errors.instante}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Houve Desvios *
                  </label>
                  <select
                    value={formData.houve_desvios}
                    onChange={(e) => setFormData({ ...formData, houve_desvios: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.houve_desvios ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Selecione</option>
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </select>
                  {errors.houve_desvios && (
                    <p className="mt-1 text-sm text-red-600">{errors.houve_desvios}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Classificação *
                  </label>
                  <SearchableSelect
                    options={classificacoes}
                    value={formData.classificacao_id}
                    onChange={(value) => setFormData({ ...formData, classificacao_id: value })}
                    placeholder="Selecione a classificação"
                    error={errors.classificacao_id}
                  />
                  {errors.classificacao_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.classificacao_id}</p>
                  )}
                </div>



                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Violação (opcional)
                  </label>
                  <SearchableSelect
                    options={violacoes}
                    value={formData.violacao_id}
                    onChange={(value) => setFormData({ ...formData, violacao_id: value })}
                    placeholder="Selecione a violação"
                    error={errors.violacao_id}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grande Risco (opcional)
                  </label>
                  <SearchableSelect
                    options={grandesRiscos}
                    value={formData.grande_risco_id}
                    onChange={(value) => setFormData({ ...formData, grande_risco_id: value })}
                    placeholder="Selecione o grande risco"
                    error={errors.grande_risco_id}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Descrição e Responsáveis */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center mb-6">
                <FileText className="w-5 h-5 text-blue-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">Descrição e Responsáveis</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição *
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.descricao ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Descreva detalhadamente a interação realizada..."
                />
                {errors.descricao && (
                  <p className="mt-1 text-sm text-red-600">{errors.descricao}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Users className="w-4 h-4 inline mr-1" />
                    Coordenador Responsável *
                  </label>
                  <SearchableSelect
                    options={coordenadores.map(coord => ({ 
                      id: coord.matricula, 
                      nome: coord.nome,
                      matricula: coord.matricula
                    }))}
                    value={formData.matricula_coordenador}
                    onChange={(value) => setFormData({ ...formData, matricula_coordenador: value })}
                    placeholder="Selecione o coordenador responsável"
                    error={errors.matricula_coordenador}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Shield className="w-4 h-4 inline mr-1" />
                    Supervisor Responsável *
                  </label>
                  <SearchableSelect
                    options={supervisores.map(sup => ({ 
                      id: sup.matricula, 
                      nome: sup.nome,
                      matricula: sup.matricula
                    }))}
                    value={formData.matricula_supervisor}
                    onChange={(value) => setFormData({ ...formData, matricula_supervisor: value })}
                    placeholder="Selecione o supervisor responsável"
                    error={errors.matricula_supervisor}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ação Imediata *
                </label>
                <textarea
                  value={formData.acao}
                  onChange={(e) => setFormData({ ...formData, acao: e.target.value })}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.acao ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Descreva a ação imediata tomada ou necessária..."
                />
                {errors.acao && (
                  <p className="mt-1 text-sm text-red-600">{errors.acao}</p>
                )}
              </div>


            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Anterior
                </button>
              )}
            </div>
            
            <div>
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Próximo
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Interação
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
  )
}
