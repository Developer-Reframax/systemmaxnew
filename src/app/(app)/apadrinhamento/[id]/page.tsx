'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  CheckCircle,
  Clock,
  AlertTriangle,
  User,
  Users,
  Building2,
  Car,
  Calendar,
  FileText,
  History,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  Apadrinhamento,
  ApadrinhamentoUpdateData,
  Usuario,
  TipoApadrinhamento,
  TIPOS_APADRINHAMENTO,
  STATUS_COLORS
} from '@/lib/types/apadrinhamento'

export default function DetalhesApadrinhamento() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = params?.id as string
  const isEditMode = searchParams?.get('edit') === 'true'

  const [apadrinhamento, setApadrinhamento] = useState<Apadrinhamento | null>(null)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(isEditMode)
  const [showFinalizarModal, setShowFinalizarModal] = useState(false)
  const [observacoesFinalizar, setObservacoesFinalizar] = useState('')

  const [formData, setFormData] = useState<ApadrinhamentoUpdateData>({
    matricula_padrinho: '',
    matricula_supervisor: '',
    tipo_apadrinhamento: 'Técnico' as TipoApadrinhamento,
    observacoes: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Carregar dados do apadrinhamento
  useEffect(() => {
    const loadApadrinhamento = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/apadrinhamento/${id}`, {
          method: 'GET'
        })

        if (!response.ok) {
          throw new Error('Apadrinhamento não encontrado')
        }

        const data = await response.json()
        setApadrinhamento(data)

        // Preencher formulário com dados atuais
        setFormData({
          matricula_padrinho: data.matricula_padrinho,
          matricula_supervisor: data.matricula_supervisor,
          tipo_apadrinhamento: data.tipo_apadrinhamento,
          observacoes: data.observacoes || ''
        })
      } catch (error) {
        console.error('Erro ao carregar apadrinhamento:', error)
        toast.error((error as Error).message || 'Erro ao carregar apadrinhamento')
        router.push('/apadrinhamento')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      loadApadrinhamento()
    }
  }, [id, router])

  // Carregar usuários para os selects
  useEffect(() => {
    const loadUsuarios = async () => {
      try {
        const response = await fetch('/api/usuarios', {
          method: 'GET'
        })

        if (!response.ok) {
          throw new Error('Erro ao carregar usuários')
        }

        const data = await response.json()
        setUsuarios(data)
      } catch (error) {
        console.error('Erro ao carregar usuários:', error)
        toast.error('Erro ao carregar lista de usuários')
      }
    }

    loadUsuarios()
  }, [])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.matricula_padrinho) {
      newErrors.matricula_padrinho = 'Matrícula do padrinho é obrigatória'
    }

    if (!formData.matricula_supervisor) {
      newErrors.matricula_supervisor = 'Matrícula do supervisor é obrigatória'
    }

    if (!formData.tipo_apadrinhamento) {
      newErrors.tipo_apadrinhamento = 'Tipo de apadrinhamento é obrigatório'
    }

    // Validar se as matrículas são diferentes
    if (apadrinhamento && formData.matricula_padrinho &&
      apadrinhamento.matricula_novato === formData.matricula_padrinho) {
      newErrors.matricula_padrinho = 'Padrinho deve ser diferente do novato'
    }

    if (apadrinhamento && formData.matricula_supervisor &&
      apadrinhamento.matricula_novato === formData.matricula_supervisor) {
      newErrors.matricula_supervisor = 'Supervisor deve ser diferente do novato'
    }

    if (formData.matricula_padrinho && formData.matricula_supervisor &&
      formData.matricula_padrinho === formData.matricula_supervisor) {
      newErrors.matricula_supervisor = 'Supervisor deve ser diferente do padrinho'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Por favor, corrija os erros no formulário')
      return
    }

    try {
      setSaving(true)

      const response = await fetch(`/api/apadrinhamento/${id}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar apadrinhamento')
      }

      setApadrinhamento(data)
      setEditing(false)
      toast.success('Apadrinhamento atualizado com sucesso!')
    } catch (error) {
      console.error('Erro ao atualizar apadrinhamento:', error)
      toast.error((error as Error).message || 'Erro ao atualizar apadrinhamento')
    } finally {
      setSaving(false)
    }
  }

  const handleFinalizar = async () => {
    try {
      setSaving(true)

      const response = await fetch(`/api/apadrinhamento/${id}/finalizar`, {
        method: 'PATCH',
        body: JSON.stringify({
          observacoes: observacoesFinalizar
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao finalizar apadrinhamento')
      }

      setApadrinhamento(data)
      setShowFinalizarModal(false)
      setObservacoesFinalizar('')
      toast.success('Apadrinhamento finalizado com sucesso!')
    } catch (error) {
      console.error('Erro ao finalizar apadrinhamento:', error)
      toast.error((error as Error).message || 'Erro ao finalizar apadrinhamento')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof ApadrinhamentoUpdateData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const formatDate = (dateString: string) => {
    // Adicionar 'T00:00:00' para garantir que seja interpretado como horário local
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('pt-BR')
  }

  const calculateProgress = (dataInicio: string, dataFim: string) => {
    const inicio = new Date(dataInicio)
    const fim = new Date(dataFim)
    const hoje = new Date()

    const totalDias = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
    const diasDecorridos = Math.ceil((hoje.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))

    return Math.min(Math.max((diasDecorridos / totalDias) * 100, 0), 100)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Ativo':
        return <Clock className="w-5 h-5" />
      case 'Concluído':
        return <CheckCircle className="w-5 h-5" />
      case 'Vencido':
        return <AlertTriangle className="w-5 h-5" />
      default:
        return <Clock className="w-5 h-5" />
    }
  }

  const getTipoIcon = (tipo: string) => {
    const iconMap = {
      'Técnico': User,
      'Novo Colaborador': Users,
      'Novo Operador de Ponte': Building2,
      'Novo Operador de Empilhadeira': Car
    }
    const IconComponent = iconMap[tipo as keyof typeof iconMap] || User
    return <IconComponent className="w-5 h-5" />
  }



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Carregando apadrinhamento...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!apadrinhamento) {
    return (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Apadrinhamento não encontrado</h3>
            <p className="text-gray-600 mb-4">O apadrinhamento solicitado não existe ou foi removido.</p>
            <Link
              href="/apadrinhamento"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para Lista
            </Link>
          </div>
        </div>
    )
  }

  return (
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/apadrinhamento"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Detalhes do Apadrinhamento</h1>
              <p className="text-gray-600 mt-1">ID: {apadrinhamento.id}</p>
            </div>

            <div className="flex items-center gap-2">
              {!editing && apadrinhamento.status === 'Ativo' && (
                <>
                  <button
                    onClick={() => setShowFinalizarModal(true)}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Finalizar
                  </button>
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Editar
                  </button>
                </>
              )}

              {editing && (
                <>
                  <button
                    onClick={() => setEditing(false)}
                    className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Salvar
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status e Progresso */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${STATUS_COLORS[apadrinhamento.status as keyof typeof STATUS_COLORS]}`}>
                {getStatusIcon(apadrinhamento.status)}
                {apadrinhamento.status}
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-700">
                {getTipoIcon(apadrinhamento.tipo_apadrinhamento)}
                {apadrinhamento.tipo_apadrinhamento}
              </div>
            </div>

            {apadrinhamento.status === 'Ativo' && (
              <div className="flex-1 max-w-md">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progresso</span>
                  <span>{Math.round(calculateProgress(apadrinhamento.data_inicio, apadrinhamento.data_fim))}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${calculateProgress(apadrinhamento.data_inicio, apadrinhamento.data_fim)}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Informações dos Participantes */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <User className="w-5 h-5" />
            Participantes
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Novato */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Novato</h3>
              <p className="text-sm text-blue-700 mb-1">Matrícula: {apadrinhamento.matricula_novato}</p>
              <p className="font-medium text-blue-900">
                {apadrinhamento.novato?.nome || 'Nome não encontrado'}
              </p>
            </div>

            {/* Padrinho */}
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-900 mb-2">Padrinho</h3>
              {editing ? (
                <div>
                  <select
                    value={formData.matricula_padrinho}
                    onChange={(e) => handleInputChange('matricula_padrinho', e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.matricula_padrinho ? 'border-red-500' : 'border-gray-300'
                      }`}
                  >
                    <option value="">Selecione o padrinho</option>
                    {usuarios
                      .filter(u => u.matricula !== apadrinhamento.matricula_novato)
                      .map((usuario) => (
                        <option key={usuario.matricula} value={usuario.matricula}>
                          {usuario.matricula} - {usuario.nome}
                        </option>
                      ))}
                  </select>
                  {errors.matricula_padrinho && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.matricula_padrinho}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-sm text-green-700 mb-1">Matrícula: {apadrinhamento.matricula_padrinho}</p>
                  <p className="font-medium text-green-900">
                    {apadrinhamento.padrinho?.nome || 'Nome não encontrado'}
                  </p>
                </>
              )}
            </div>

            {/* Supervisor */}
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-medium text-purple-900 mb-2">Supervisor</h3>
              {editing ? (
                <div>
                  <select
                    value={formData.matricula_supervisor}
                    onChange={(e) => handleInputChange('matricula_supervisor', e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.matricula_supervisor ? 'border-red-500' : 'border-gray-300'
                      }`}
                  >
                    <option value="">Selecione o supervisor</option>
                    {usuarios
                      .filter(u => u.matricula !== apadrinhamento.matricula_novato && u.matricula !== formData.matricula_padrinho)
                      .map((usuario) => (
                        <option key={usuario.matricula} value={usuario.matricula}>
                          {usuario.matricula} - {usuario.nome}
                        </option>
                      ))}
                  </select>
                  {errors.matricula_supervisor && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.matricula_supervisor}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-sm text-purple-700 mb-1">Matrícula: {apadrinhamento.matricula_supervisor}</p>
                  <p className="font-medium text-purple-900">
                    {apadrinhamento.supervisor_info?.nome || 'Nome não encontrado'}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Informações do Apadrinhamento */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Informações do Apadrinhamento
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Apadrinhamento
              </label>
              {editing ? (
                <div>
                  <select
                    value={formData.tipo_apadrinhamento}
                    onChange={(e) => handleInputChange('tipo_apadrinhamento', e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.tipo_apadrinhamento ? 'border-red-500' : 'border-gray-300'
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
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  {getTipoIcon(apadrinhamento.tipo_apadrinhamento)}
                  <span className="font-medium">{apadrinhamento.tipo_apadrinhamento}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Período
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Início: {formatDate(apadrinhamento.data_inicio)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Fim: {formatDate(apadrinhamento.data_fim)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Observações */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Observações
          </h2>

          {editing ? (
            <div>
              <textarea
                value={formData.observacoes}
                onChange={(e) => handleInputChange('observacoes', e.target.value)}
                rows={4}
                placeholder="Adicione observações sobre o apadrinhamento"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <p className="mt-1 text-sm text-gray-500">
                Máximo de 500 caracteres ({formData.observacoes?.length || 0}/500)
              </p>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg">
              {apadrinhamento.observacoes ? (
                <p className="text-gray-700 whitespace-pre-wrap">{apadrinhamento.observacoes}</p>
              ) : (
                <p className="text-gray-500 italic">Nenhuma observação adicionada</p>
              )}
            </div>
          )}
        </div>

        {/* Timeline/Histórico */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico
          </h2>

          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-blue-900">Apadrinhamento Criado</p>
                <p className="text-sm text-blue-700">
                  Criado em {formatDate(apadrinhamento.created_at)}
                </p>
              </div>
            </div>

            {apadrinhamento.status === 'Concluído' && apadrinhamento.finalizado && (
              <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-green-900">Apadrinhamento Finalizado</p>
                  <p className="text-sm text-green-700">
                    Finalizado em {formatDate(apadrinhamento.updated_at)}
                  </p>
                </div>
              </div>
            )}

            {apadrinhamento.status === 'Vencido' && (
              <div className="flex items-start gap-4 p-4 bg-red-50 rounded-lg">
                <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-red-900">Apadrinhamento Vencido</p>
                  <p className="text-sm text-red-700">
                    Venceu em {formatDate(apadrinhamento.data_fim)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal de Finalizar */}
        {showFinalizarModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Finalizar Apadrinhamento</h3>

              <p className="text-gray-600 mb-4">
                Tem certeza que deseja finalizar este apadrinhamento? Esta ação não pode ser desfeita.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações de Finalização (opcional)
                </label>
                <textarea
                  value={observacoesFinalizar}
                  onChange={(e) => setObservacoesFinalizar(e.target.value)}
                  rows={3}
                  placeholder="Adicione observações sobre a finalização..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowFinalizarModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleFinalizar}
                  disabled={saving}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Finalizando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Finalizar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  )
}