'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Save, FileText, Search, X, ChevronDown, ChevronRight, Target, CheckCircle, AlertCircle, Play } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

interface Usuario {
  matricula: number
  nome: string
  funcao?: string
  email?: string
  contrato_raiz?: string
}

interface Local {
  id: string
  local: string
  contrato?: string
}

interface Registro3PFormData {
  area_id: string
  atividade: string
  paralisacao_realizada: boolean | null
  riscos_avaliados: boolean | null
  ambiente_avaliado: boolean | null
  passo_descrito: boolean | null
  hipoteses_levantadas: boolean | null
  atividade_segura: boolean | null
  oportunidades: string
  tipo: '' | 'Melhoria' | 'Aprendizado'
  participantes: number[]
}

// Componente SearchableSelect reutilizável
interface SearchableSelectOption {
  id: string | number
  nome?: string
  local?: string
  matricula?: number
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
    return option.nome || option.local || ''
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
                className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
              >
                {getDisplayName(option)}
              </button>
            ))
          ) : (
            <div className="px-4 py-2 text-gray-500">Nenhum resultado encontrado</div>
          )}
        </div>
      )}
    </div>
  )
}

// Componente para seleção múltipla de participantes
interface MultiSelectProps {
  options: Usuario[]
  selectedValues: number[]
  onChange: (values: number[]) => void
  placeholder: string
  error?: string
}

function MultiSelect({ options, selectedValues, onChange, placeholder, error }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const filteredOptions = options.filter(option => 
    searchTerm === '' || 
    option.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.matricula.toString().includes(searchTerm)
  )

  const selectedOptions = options.filter(option => selectedValues.includes(option.matricula))

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

  const handleToggle = (matricula: number) => {
    if (selectedValues.includes(matricula)) {
      onChange(selectedValues.filter(id => id !== matricula))
    } else {
      onChange([...selectedValues, matricula])
    }
  }

  const handleRemove = (matricula: number, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selectedValues.filter(id => id !== matricula))
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className={`relative w-full border rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent ${
        error ? 'border-red-500' : 'border-gray-300'
      } bg-white min-h-[42px]`}>
        <div className="flex flex-wrap items-center gap-1 p-2">
          {selectedOptions.map((option) => (
            <span
              key={option.matricula}
              className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md"
            >
              {option.nome} ({option.matricula})
              <button
                type="button"
                onClick={(e) => handleRemove(option.matricula, e)}
                className="ml-1 hover:bg-blue-200 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={selectedOptions.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] bg-transparent focus:outline-none"
          />
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option.matricula}
                type="button"
                onClick={() => handleToggle(option.matricula)}
                className={`w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none flex items-center justify-between ${
                  selectedValues.includes(option.matricula) ? 'bg-blue-50' : ''
                }`}
              >
                <span>{option.nome} ({option.matricula})</span>
                {selectedValues.includes(option.matricula) && (
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                )}
              </button>
            ))
          ) : (
            <div className="px-4 py-2 text-gray-500">Nenhum resultado encontrado</div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Novo3P() {
  const { user } = useAuth()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [locais, setLocais] = useState<Local[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState<Registro3PFormData>({
    area_id: '',
    atividade: '',
    paralisacao_realizada: null,
    riscos_avaliados: null,
    ambiente_avaliado: null,
    passo_descrito: null,
    hipoteses_levantadas: null,
    atividade_segura: null,
    oportunidades: '',
    tipo: '',
    participantes: []
  })

  const loadInitialData = useCallback(async () => {
    try {

      // Carregar locais filtrados pelo contrato do usuario
      const contrato = user?.contrato_raiz
      if (contrato) {
        const locaisResponse = await fetch(`/api/security-params/locations?contrato=${encodeURIComponent(contrato)}&limit=500`, {
          method: 'GET'
        })

        if (locaisResponse.ok) {
          const locaisData = await locaisResponse.json()
          setLocais(locaisData.data || [])
        } else {
          setLocais([])
        }
      } else {
        setLocais([])
      }

      // Carregar usuários
      const usuariosResponse = await fetch('/api/users', {
        method: 'GET'
      })

      if (usuariosResponse.ok) {
        const usuariosData = await usuariosResponse.json()
        const usuariosLista = usuariosData.users || []
        const contrato = user?.contrato_raiz
        const filtrados = contrato
          ? usuariosLista.filter((usuario: Usuario) => usuario.contrato_raiz === contrato)
          : []
        setUsuarios(filtrados)
      }
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error)
      toast.error('Erro ao carregar dados iniciais')
    }
  }, [user?.contrato_raiz])

  // Carregar dados iniciais
  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 1) {
      if (!formData.area_id) newErrors.area_id = 'Área é obrigatória'
      if (!formData.atividade.trim()) newErrors.atividade = 'Descrição da atividade é obrigatória'
    }

    if (step === 2) {
      if (formData.paralisacao_realizada === null) newErrors.paralisacao_realizada = 'Campo obrigatório'
    }

    if (step === 3) {
      if (formData.riscos_avaliados === null) newErrors.riscos_avaliados = 'Campo obrigatório'
      if (formData.ambiente_avaliado === null) newErrors.ambiente_avaliado = 'Campo obrigatório'
      if (formData.passo_descrito === null) newErrors.passo_descrito = 'Campo obrigatório'
      if (formData.hipoteses_levantadas === null) newErrors.hipoteses_levantadas = 'Campo obrigatório'
      if (formData.atividade_segura === null) newErrors.atividade_segura = 'Campo obrigatório'
    }

    if (step === 4) {
      if (!formData.tipo) newErrors.tipo = 'Campo obrigatÇürio'
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

  const handleSubmit = async () => {
    if (!validateStep(4)) return

    try {
      setLoading(true)

      const response = await fetch('/api/3ps', {
        method: 'POST',
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success('Registro 3P criado com sucesso!')
        router.push('/3ps')
      } else {
        toast.error(data.error || 'Erro ao criar registro 3P')
      }
    } catch (error) {
      console.error('Erro ao criar registro 3P:', error)
      toast.error('Erro ao criar registro 3P')
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { number: 1, title: 'Informações Básicas', icon: FileText },
    { number: 2, title: 'Pausar', icon: AlertCircle },
    { number: 3, title: 'Processar', icon: Target },
    { number: 4, title: 'Prosseguir', icon: Play }
  ]

  return (
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Link
              href="/3ps"
              className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Novo Registro 3P</h1>
              <p className="text-gray-600">Pausar, Processar, Prosseguir</p>
            </div>
          </div>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.number
              const isCompleted = currentStep > step.number
              
              return (
                <div key={step.number} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    isCompleted 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : isActive 
                        ? 'bg-blue-500 border-blue-500 text-white' 
                        : 'bg-white border-gray-300 text-gray-500'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${
                      isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      Etapa {step.number}
                    </p>
                    <p className={`text-xs ${
                      isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${
                      currentStep > step.number ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Etapa 1: Informações Básicas */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Informações Básicas</h2>
                <p className="text-gray-600 mb-6">Informe a área e descreva a atividade que será avaliada.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Área/Local <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={locais.map(local => ({ id: local.id, local: local.local }))}
                  value={formData.area_id}
                  onChange={(value) => setFormData({ ...formData, area_id: value })}
                  placeholder="Selecione a área onde a atividade será realizada"
                  error={errors.area_id}
                />
                {errors.area_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.area_id}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição da Atividade <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.atividade}
                  onChange={(e) => setFormData({ ...formData, atividade: e.target.value })}
                  placeholder="Descreva detalhadamente a atividade que será executada"
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.atividade ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.atividade && (
                  <p className="mt-1 text-sm text-red-600">{errors.atividade}</p>
                )}
              </div>
            </div>
          )}

          {/* Etapa 2: Pausar */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <AlertCircle className="w-6 h-6 text-orange-500 mr-2" />
                  Etapa 1: Pausar
                </h2>
                <p className="text-gray-600 mb-6">Antes de iniciar qualquer atividade, é fundamental pausar e avaliar.</p>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4">Precisamos pausar!</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Você parou antes de iniciar a atividade para avaliar os riscos? <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="paralisacao_realizada"
                        checked={formData.paralisacao_realizada === true}
                        onChange={() => setFormData({ ...formData, paralisacao_realizada: true })}
                        className="mr-2"
                      />
                      <span>Sim</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="paralisacao_realizada"
                        checked={formData.paralisacao_realizada === false}
                        onChange={() => setFormData({ ...formData, paralisacao_realizada: false })}
                        className="mr-2"
                      />
                      <span>Não</span>
                    </label>
                  </div>
                  {errors.paralisacao_realizada && (
                    <p className="mt-1 text-sm text-red-600">{errors.paralisacao_realizada}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Etapa 3: Processar */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Target className="w-6 h-6 text-blue-500 mr-2" />
                  Etapa 2: Processar
                </h2>
                <p className="text-gray-600 mb-6">Agora vamos processar as informações e avaliar todos os aspectos de segurança.</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900 mb-4">Agora vamos processar!</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Os riscos foram avaliados? <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="riscos_avaliados"
                        checked={formData.riscos_avaliados === true}
                        onChange={() => setFormData({ ...formData, riscos_avaliados: true })}
                        className="mr-2"
                      />
                      <span>Sim</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="riscos_avaliados"
                        checked={formData.riscos_avaliados === false}
                        onChange={() => setFormData({ ...formData, riscos_avaliados: false })}
                        className="mr-2"
                      />
                      <span>Não</span>
                    </label>
                  </div>
                  {errors.riscos_avaliados && (
                    <p className="mt-1 text-sm text-red-600">{errors.riscos_avaliados}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    O ambiente ao redor foi avaliado? <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="ambiente_avaliado"
                        checked={formData.ambiente_avaliado === true}
                        onChange={() => setFormData({ ...formData, ambiente_avaliado: true })}
                        className="mr-2"
                      />
                      <span>Sim</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="ambiente_avaliado"
                        checked={formData.ambiente_avaliado === false}
                        onChange={() => setFormData({ ...formData, ambiente_avaliado: false })}
                        className="mr-2"
                      />
                      <span>Não</span>
                    </label>
                  </div>
                  {errors.ambiente_avaliado && (
                    <p className="mt-1 text-sm text-red-600">{errors.ambiente_avaliado}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    O passo a passo foi descrito? <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="passo_descrito"
                        checked={formData.passo_descrito === true}
                        onChange={() => setFormData({ ...formData, passo_descrito: true })}
                        className="mr-2"
                      />
                      <span>Sim</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="passo_descrito"
                        checked={formData.passo_descrito === false}
                        onChange={() => setFormData({ ...formData, passo_descrito: false })}
                        className="mr-2"
                      />
                      <span>Não</span>
                    </label>
                  </div>
                  {errors.passo_descrito && (
                    <p className="mt-1 text-sm text-red-600">{errors.passo_descrito}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    As hipóteses foram levantadas? <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="hipoteses_levantadas"
                        checked={formData.hipoteses_levantadas === true}
                        onChange={() => setFormData({ ...formData, hipoteses_levantadas: true })}
                        className="mr-2"
                      />
                      <span>Sim</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="hipoteses_levantadas"
                        checked={formData.hipoteses_levantadas === false}
                        onChange={() => setFormData({ ...formData, hipoteses_levantadas: false })}
                        className="mr-2"
                      />
                      <span>Não</span>
                    </label>
                  </div>
                  {errors.hipoteses_levantadas && (
                    <p className="mt-1 text-sm text-red-600">{errors.hipoteses_levantadas}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    A atividade é considerada segura para prosseguir? <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="atividade_segura"
                        checked={formData.atividade_segura === true}
                        onChange={() => setFormData({ ...formData, atividade_segura: true })}
                        className="mr-2"
                      />
                      <span>Sim</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="atividade_segura"
                        checked={formData.atividade_segura === false}
                        onChange={() => setFormData({ ...formData, atividade_segura: false })}
                        className="mr-2"
                      />
                      <span>Não</span>
                    </label>
                  </div>
                  {errors.atividade_segura && (
                    <p className="mt-1 text-sm text-red-600">{errors.atividade_segura}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Etapa 4: Prosseguir */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Play className="w-6 h-6 text-green-500 mr-2" />
                  Etapa 3: Prosseguir
                </h2>
                <p className="text-gray-600 mb-6">Finalize o registro identificando oportunidades e adicionando participantes.</p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900 mb-4">Prosseguir!</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Oportunidades de Melhoria / Aprendizado
                  </label>
                  <textarea
                    value={formData.oportunidades}
                    onChange={(e) => setFormData({ ...formData, oportunidades: e.target.value })}
                    placeholder="Descreva as oportunidades de melhoria identificadas ou aprendizados obtidos durante o processo"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Tipo da descricao <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="tipo"
                        checked={formData.tipo === 'Aprendizado'}
                        onChange={() => setFormData({ ...formData, tipo: 'Aprendizado' })}
                        className="mr-2"
                      />
                      <span>Aprendizado</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="tipo"
                        checked={formData.tipo === 'Melhoria'}
                        onChange={() => setFormData({ ...formData, tipo: 'Melhoria' })}
                        className="mr-2"
                      />
                      <span>Melhoria</span>
                    </label>
                  </div>
                  {errors.tipo && (
                    <p className="mt-1 text-sm text-red-600">{errors.tipo}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Participantes
                  </label>
                  <p className="text-sm text-gray-600 mb-3">
                    Selecione os colaboradores que participaram desta avaliação (você será incluído automaticamente)
                  </p>
                  <MultiSelect
                    options={usuarios}
                    selectedValues={formData.participantes}
                    onChange={(values) => setFormData({ ...formData, participantes: values })}
                    placeholder="Buscar e selecionar participantes"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                Próximo
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Finalizar Registro
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
  )
}
