'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Search, Edit, Trash2, Tag, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/Layout/MainLayout'
import { useAuth } from '@/hooks/useAuth'

interface Type {
  id: string
  tipo: string
  contrato: string
  created_at: string
  updated_at: string
}

interface Contract {
  codigo: string
  nome: string
}

interface TypeFormData {
  tipo: string
  contrato: string
}

export default function TypesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [types, setTypes] = useState<Type[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingType, setEditingType] = useState<Type | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedContract, setSelectedContract] = useState('')
  const [formData, setFormData] = useState<TypeFormData>({
    tipo: '',
    contrato: ''
  })



  const fetchTypes = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      const url = selectedContract 
        ? `/api/security-params/types?contrato=${selectedContract}`
        : '/api/security-params/types'

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao carregar tipos')
      }

      const data = await response.json()
      setTypes(data.data || [])
    } catch (error: unknown) {
      console.error('Erro ao carregar tipos:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar tipos')
    } finally {
      setLoading(false)
    }
  }, [selectedContract])

  const fetchContracts = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) return

      const response = await fetch('/api/contracts', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setContracts(data.contracts || [])
      }
    } catch (error) {
      console.error('Erro ao buscar contratos:', error)
    }
  }, [])

    useEffect(() => {
    fetchTypes()
    fetchContracts()
  }, [fetchTypes, fetchContracts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      if (editingType) {
        // Update type
        const response = await fetch(`/api/security-params/types/${editingType.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Erro ao atualizar tipo')
        }

        toast.success('Tipo atualizado com sucesso!')
      } else {
        // Create new type
        const response = await fetch('/api/security-params/types', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Erro ao criar tipo')
        }

        toast.success('Tipo criado com sucesso!')
      }

      setShowModal(false)
      setEditingType(null)
      resetForm()
      fetchTypes()
    } catch (error: unknown) {
      console.error('Erro ao salvar tipo:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar tipo')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (type: Type) => {
    setEditingType(type)
    setFormData({
      tipo: type.tipo,
      contrato: type.contrato
    })
    setShowModal(true)
  }

  const handleDelete = async (typeId: string) => {
    if (!confirm('Tem certeza que deseja excluir este tipo?')) {
      return
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch(`/api/security-params/types/${typeId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao excluir tipo')
      }
      
      toast.success('Tipo excluído com sucesso!')
      fetchTypes()
    } catch (error: unknown) {
      console.error('Erro ao excluir tipo:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir tipo')
    }
  }

  const resetForm = () => {
    setFormData({
      tipo: '',
      contrato: ''
    })
  }

  const filteredTypes = types.filter(type =>
    type.tipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    type.contrato.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!user || user.role === 'Usuario') {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Acesso negado. Apenas administradores e editores podem gerenciar tipos.</p>
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tipos</h1>
              <p className="text-gray-600 dark:text-gray-400">Gerenciar tipos de classificação por contrato</p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingType(null)
              resetForm()
              setShowModal(true)
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo Tipo
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar tipos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={selectedContract}
            onChange={(e) => {
              setSelectedContract(e.target.value)
              fetchTypes()
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Todos os contratos</option>
            {contracts.map((contract) => (
              <option key={contract.codigo} value={contract.codigo}>
                {contract.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : filteredTypes.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
              Nenhum tipo encontrado
            </div>
          ) : (
            filteredTypes.map((type) => (
              <div key={type.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-2">
                    <Tag className="h-5 w-5 text-green-600" />
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {type.tipo}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(type)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(type.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Contrato</p>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {contracts.find(c => c.codigo === type.contrato)?.nome || type.contrato}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Criado em: {new Date(type.created_at).toLocaleDateString('pt-BR')}
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
                  {editingType ? 'Editar Tipo' : 'Novo Tipo'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tipo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Ex: Incidente"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Contrato *
                    </label>
                    <select
                      required
                      value={formData.contrato}
                      onChange={(e) => setFormData({ ...formData, contrato: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Selecione um contrato</option>
                      {contracts.map((contract) => (
                        <option key={contract.codigo} value={contract.codigo}>
                          {contract.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false)
                        setEditingType(null)
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
                      {loading ? 'Salvando...' : editingType ? 'Atualizar' : 'Criar'}
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
