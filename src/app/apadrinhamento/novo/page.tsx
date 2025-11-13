'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Save, Users, Building2, Car, Calendar, FileText, AlertCircle, Search, X, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/Layout/MainLayout'
import { 
  ApadrinhamentoFormData,
  Usuario,
  TipoApadrinhamento,
  TIPOS_APADRINHAMENTO,
  TIPO_ICONS
} from '@/lib/types/apadrinhamento'

// Componente SearchableSelect reutilizável
interface SearchableSelectProps {
  users: Usuario[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  disabled?: boolean
  error?: string
  excludeUsers?: string[]
}

function SearchableSelect({ 
  users, 
  value, 
  onChange, 
  placeholder, 
  disabled = false, 
  error, 
  excludeUsers = [] 
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filtrar usuários baseado no termo de busca e exclusões
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.matricula.toString().includes(searchTerm)
    
    const notExcluded = !excludeUsers.includes(user.matricula.toString())
    
    return matchesSearch && notExcluded
  })

  // Encontrar usuário selecionado
  const selectedUser = users.find(user => user.matricula.toString() === value)

  // Fechar dropdown quando clicar fora
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

  const handleSelect = (user: Usuario) => {
    onChange(user.matricula.toString())
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setSearchTerm('')
  }

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    if (!isOpen) setIsOpen(true)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className={`relative w-full border rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent ${
        error ? 'border-red-500' : 'border-gray-300'
      } ${disabled ? 'bg-gray-100' : 'bg-white'}`}>
        <div className="flex items-center">
          <Search className="w-4 h-4 text-gray-400 ml-3" />
          <input
            ref={inputRef}
            type="text"
            value={isOpen ? searchTerm : (selectedUser ? `${selectedUser.matricula} - ${selectedUser.nome}` : '')}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
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
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <button
                key={user.matricula}
                type="button"
                onClick={() => handleSelect(user)}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium text-gray-900">
                  {user.matricula} - {user.nome}
                </div>
                {user.funcao && (
                  <div className="text-sm text-gray-500">{user.funcao}</div>
                )}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-gray-500 text-center">
              Nenhum usuário encontrado
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function NovoApadrinhamento() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loadingUsuarios, setLoadingUsuarios] = useState(true)
  
  const [formData, setFormData] = useState<ApadrinhamentoFormData>({
    matricula_novato: '',
    matricula_padrinho: '',
    matricula_supervisor: '',
    tipo_apadrinhamento: 'Novo colaborador' as TipoApadrinhamento,
    data_inicio: '',
    observacoes: ''
  })

  const [dataInicioBR, setDataInicioBR] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Funções para conversão de data
  const formatDateToBR = (isoDate: string): string => {
    if (!isoDate) return ''
    const date = new Date(isoDate + 'T00:00:00')
    return date.toLocaleDateString('pt-BR')
  }

  const formatDateToISO = (brDate: string): string => {
    if (!brDate) return ''
    const parts = brDate.split('/')
    if (parts.length !== 3) return ''
    const [day, month, year] = parts
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  const isValidBRDate = (brDate: string): boolean => {
    const parts = brDate.split('/')
    if (parts.length !== 3) return false
    const [day, month, year] = parts.map(Number)
    if (isNaN(day) || isNaN(month) || isNaN(year)) return false
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) return false
    
    const date = new Date(year, month - 1, day)
    return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year
  }

  // Carregar usuários para os selects
  useEffect(() => {
    const loadUsuarios = async () => {
      try {
        setLoadingUsuarios(true)
        const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
        const response = await fetch('/api/usuarios', {
          headers: {
            'Authorization': `Bearer ${auth_token}`
          }
        })
        
        if (!response.ok) {
          throw new Error('Erro ao carregar usuários')
        }

        const data = await response.json()
        setUsuarios(data)
      } catch (error) {
        console.error('Erro ao carregar usuários:', error)
        toast.error('Erro ao carregar lista de usuários')
      } finally {
        setLoadingUsuarios(false)
      }
    }

    loadUsuarios()
  }, [])



  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.matricula_novato) {
      newErrors.matricula_novato = 'Selecione o novato'
    }

    if (!formData.matricula_padrinho) {
      newErrors.matricula_padrinho = 'Selecione o padrinho'
    }

    if (!formData.matricula_supervisor) {
      newErrors.matricula_supervisor = 'Selecione o supervisor'
    }

    if (!formData.tipo_apadrinhamento) {
      newErrors.tipo_apadrinhamento = 'Selecione o tipo de apadrinhamento'
    }

    if (!formData.data_inicio) {
      newErrors.data_inicio = 'Selecione a data de início'
    }

    // Validar se as pessoas são diferentes
    if (formData.matricula_novato && formData.matricula_padrinho && 
        formData.matricula_novato === formData.matricula_padrinho) {
      newErrors.matricula_padrinho = 'O padrinho deve ser diferente do novato'
    }

    if (formData.matricula_novato && formData.matricula_supervisor && 
        formData.matricula_novato === formData.matricula_supervisor) {
      newErrors.matricula_supervisor = 'O supervisor deve ser diferente do novato'
    }

    if (formData.matricula_padrinho && formData.matricula_supervisor && 
        formData.matricula_padrinho === formData.matricula_supervisor) {
      newErrors.matricula_supervisor = 'O supervisor deve ser diferente do padrinho'
    }



    // Validar observações (máximo 500 caracteres)
    if (formData.observacoes && formData.observacoes.length > 500) {
      newErrors.observacoes = 'As observações não podem exceder 500 caracteres'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Por favor, corrija os erros no formulário')
      return
    }

    try {
      setLoading(true)

      // Calcular data de fim (90 dias após o início)
      const dataInicio = new Date(formData.data_inicio)
      const dataFim = new Date(dataInicio)
      dataFim.setDate(dataFim.getDate() + 90)

      const apadrinhamentoData = {
        matricula_novato: parseInt(formData.matricula_novato),
        matricula_padrinho: parseInt(formData.matricula_padrinho),
        matricula_supervisor: parseInt(formData.matricula_supervisor),
        tipo_apadrinhamento: formData.tipo_apadrinhamento,
        data_inicio: formData.data_inicio,
        data_fim: dataFim.toISOString().split('T')[0],
        observacoes: formData.observacoes || null
      }

      const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch('/api/apadrinhamento', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth_token}`
        },
        body: JSON.stringify(apadrinhamentoData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao criar apadrinhamento')
      }

      toast.success('Apadrinhamento criado com sucesso!')
      router.push('/apadrinhamento')
      
    } catch (error) {
      console.error('Erro ao criar apadrinhamento:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao criar apadrinhamento')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof ApadrinhamentoFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleDateChange = (brDate: string) => {
    setDataInicioBR(brDate)
    
    if (brDate && isValidBRDate(brDate)) {
      const isoDate = formatDateToISO(brDate)
      setFormData(prev => ({ ...prev, data_inicio: isoDate }))
    } else {
      setFormData(prev => ({ ...prev, data_inicio: '' }))
    }
    
    // Limpar erro do campo
    if (errors.data_inicio) {
      setErrors(prev => ({ ...prev, data_inicio: '' }))
    }
  }

  const getUsuarioNome = (matricula: string) => {
    const usuario = usuarios.find(u => u.matricula.toString() === matricula)
    return usuario ? usuario.nome : ''
  }

  const getTipoIcon = (tipo: TipoApadrinhamento) => {
    const iconName = TIPO_ICONS[tipo]
    switch (iconName) {
      case 'Users':
        return <Users className="w-4 h-4" />
      case 'Building2':
        return <Building2 className="w-4 h-4" />
      case 'Car':
        return <Car className="w-4 h-4" />
      default:
        return <Users className="w-4 h-4" />
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/apadrinhamento"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Voltar
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Novo Apadrinhamento</h1>
              <p className="text-gray-600">Cadastre um novo apadrinhamento no sistema</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Participantes do Apadrinhamento
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Novato */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Novato *
                </label>
                <SearchableSelect
                  users={usuarios}
                  value={formData.matricula_novato}
                  onChange={(value) => handleInputChange('matricula_novato', value)}
                  placeholder="Buscar novato..."
                  disabled={loadingUsuarios}
                  error={errors.matricula_novato}
                />
                {errors.matricula_novato && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.matricula_novato}
                  </p>
                )}
                {formData.matricula_novato && getUsuarioNome(formData.matricula_novato) && (
                  <p className="mt-1 text-sm text-gray-600">
                    Selecionado: {getUsuarioNome(formData.matricula_novato)}
                  </p>
                )}
              </div>

              {/* Padrinho */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Padrinho *
                </label>
                <SearchableSelect
                  users={usuarios}
                  value={formData.matricula_padrinho}
                  onChange={(value) => handleInputChange('matricula_padrinho', value)}
                  placeholder="Buscar padrinho..."
                  disabled={loadingUsuarios}
                  error={errors.matricula_padrinho}
                  excludeUsers={formData.matricula_novato ? [formData.matricula_novato] : []}
                />
                {errors.matricula_padrinho && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.matricula_padrinho}
                  </p>
                )}
                {formData.matricula_padrinho && getUsuarioNome(formData.matricula_padrinho) && (
                  <p className="mt-1 text-sm text-gray-600">
                    Selecionado: {getUsuarioNome(formData.matricula_padrinho)}
                  </p>
                )}
              </div>

              {/* Supervisor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supervisor *
                </label>
                <SearchableSelect
                  users={usuarios}
                  value={formData.matricula_supervisor}
                  onChange={(value) => handleInputChange('matricula_supervisor', value)}
                  placeholder="Buscar supervisor..."
                  disabled={loadingUsuarios}
                  error={errors.matricula_supervisor}
                  excludeUsers={[
                    ...(formData.matricula_novato ? [formData.matricula_novato] : []),
                    ...(formData.matricula_padrinho ? [formData.matricula_padrinho] : [])
                  ]}
                />
                {errors.matricula_supervisor && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.matricula_supervisor}
                  </p>
                )}
                {formData.matricula_supervisor && getUsuarioNome(formData.matricula_supervisor) && (
                  <p className="mt-1 text-sm text-gray-600">
                    Selecionado: {getUsuarioNome(formData.matricula_supervisor)}
                  </p>
                )}
              </div>

              {/* Tipo de Apadrinhamento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Apadrinhamento *
                </label>
                <select
                  value={formData.tipo_apadrinhamento}
                  onChange={(e) => handleInputChange('tipo_apadrinhamento', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.tipo_apadrinhamento ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  {TIPOS_APADRINHAMENTO.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
                {errors.tipo_apadrinhamento && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.tipo_apadrinhamento}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                  {getTipoIcon(formData.tipo_apadrinhamento)}
                  <span>Tipo selecionado: {formData.tipo_apadrinhamento}</span>
                </div>
              </div>

              {/* Data de Início */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Início *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={dataInicioBR}
                    onChange={(e) => handleDateChange(e.target.value)}
                    placeholder="dd/mm/aaaa"
                    className={`w-full border rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.data_inicio ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <input
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => {
                      const isoDate = e.target.value;
                      if (isoDate) {
                        const brDate = formatDateToBR(isoDate);
                        setDataInicioBR(brDate);
                        setFormData(prev => ({ ...prev, data_inicio: isoDate }));
                        setErrors(prev => ({ ...prev, data_inicio: '' }));
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {errors.data_inicio && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.data_inicio}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Informações Adicionais
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações
              </label>
              <textarea
                value={formData.observacoes}
                onChange={(e) => handleInputChange('observacoes', e.target.value)}
                rows={4}
                placeholder="Adicione observações sobre o apadrinhamento (opcional)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <p className="mt-1 text-sm text-gray-500">
                Máximo de 500 caracteres ({formData.observacoes?.length || 0}/500)
              </p>
            </div>
          </div>

          {/* Informações Automáticas */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 mb-1">Informações Automáticas</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• A data de início será definida como hoje</li>
                  <li>• A data de fim será calculada automaticamente (+90 dias)</li>
                  <li>• O status inicial será "Ativo"</li>
                  <li>• O campo "finalizado" será definido como "false"</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex items-center justify-end gap-4 pt-6">
            <Link
              href="/apadrinhamento"
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading || loadingUsuarios}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar Apadrinhamento
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  )
}
