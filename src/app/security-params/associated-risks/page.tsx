'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Search, Edit, Trash2, AlertTriangle, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/Layout/MainLayout'
import { useAuth } from '@/hooks/useAuth'

interface AssociatedRisk {
  id: string
  risco_associado: string
  descricao: string
  categoria: string
  created_at: string
  updated_at: string
}

interface AssociatedRiskFormData {
  risco_associado: string
  descricao: string
  categoria: string
}

const RISK_CATEGORIES = [
  'Operacional',
  'Ambiental',
  'Segurança',
  'Qualidade',
  'Financeiro',
  'Regulatório',
  'Tecnológico',
  'Reputacional'
]

export default function AssociatedRisksPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [risks, setRisks] = useState<AssociatedRisk[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRisk, setEditingRisk] = useState<AssociatedRisk | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [formData, setFormData] = useState<AssociatedRiskFormData>({
    risco_associado: '',
    descricao: '',
    categoria: ''
  })

  const fetchRisks = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      const url = selectedCategory 
        ? `/api/security-params/associated-risks?categoria=${selectedCategory}`
        : '/api/security-params/associated-risks'

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao carregar riscos associados')
      }

      const data = await response.json()
      setRisks(data.data || [])
    } catch (error: unknown) {
      console.error('Erro ao carregar riscos associados:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar riscos associados')
    } finally {
      setLoading(false)
    }
  }, [selectedCategory])

  useEffect(() => {
    fetchRisks()
  }, [fetchRisks])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      if (editingRisk) {
        // Update risk
        const response = await fetch(`/api/security-params/associated-risks/${editingRisk.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Erro ao atualizar risco associado')
        }

        toast.success('Risco associado atualizado com sucesso!')
      } else {
        // Create new risk
        const response = await fetch('/api/security-params/associated-risks', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Erro ao criar risco associado')
        }

        toast.success('Risco associado criado com sucesso!')
      }

      setShowModal(false)
      setEditingRisk(null)
      resetForm()
      fetchRisks()
    } catch (error: unknown) {
      console.error('Erro ao salvar risco associado:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar risco associado')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (risk: AssociatedRisk) => {
    setEditingRisk(risk)
    setFormData({
      risco_associado: risk.risco_associado,
      descricao: risk.descricao,
      categoria: risk.categoria
    })
    setShowModal(true)
  }

  const handleDelete = async (riskId: string) => {
    if (!confirm('Tem certeza que deseja excluir este risco associado?')) {
      return
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch(`/api/security-params/associated-risks/${riskId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao excluir risco associado')
      }
      
      toast.success('Risco associado excluído com sucesso!')
      fetchRisks()
    } catch (error: unknown) {
      console.error('Erro ao excluir risco associado:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir risco associado')
    }
  }

  const resetForm = () => {
    setFormData({
      risco_associado: '',
      descricao: '',
      categoria: ''
    })
  }

  const filteredRisks = risks.filter(risk =>
    risk.risco_associado.toLowerCase().includes(searchTerm.toLowerCase()) ||
    risk.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    risk.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Operacional': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'Ambiental': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'Segurança': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'Qualidade': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'Financeiro': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'Regulatório': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      'Tecnológico': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      'Reputacional': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
    }
    return colors[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }

  if (!user || user.role === 'Usuario') {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Acesso negado. Apenas administradores e editores podem gerenciar riscos associados.</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/security-params')}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Riscos Associados</h1>
              <p className="text-gray-600 dark:text-gray-400">Gerenciar riscos associados por categoria</p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingRisk(null)
              resetForm()
              setShowModal(true)
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo Risco
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar riscos associados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value)
              fetchRisks()
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Todas as categorias</option>
            {RISK_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Risks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : filteredRisks.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
              Nenhum risco associado encontrado
            </div>
          ) : (
            filteredRisks.map((risk) => (
              <div key={risk.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {risk.risco_associado}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(risk)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(risk.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(risk.categoria)}`}>
                      {risk.categoria}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Descrição</p>
                    <p className="text-sm text-gray-900 dark:text-white line-clamp-3">
                      {risk.descricao}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Criado em: {new Date(risk.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {editingRisk ? 'Editar Risco Associado' : 'Novo Risco Associado'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Risco Associado *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.risco_associado}
                      onChange={(e) => setFormData({ ...formData, risco_associado: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Ex: Exposição a produtos químicos"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Descrição *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Descreva o risco associado..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Categoria *
                    </label>
                    <select
                      required
                      value={formData.categoria}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Selecione uma categoria</option>
                      {RISK_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false)
                        setEditingRisk(null)
                        resetForm()
                      }}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Salvando...' : editingRisk ? 'Atualizar' : 'Criar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
