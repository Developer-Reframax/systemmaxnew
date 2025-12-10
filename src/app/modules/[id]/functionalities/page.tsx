'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import MainLayout from '@/components/Layout/MainLayout'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, Search, ArrowLeft } from 'lucide-react'

interface Funcionalidade {
  id: string
  nome: string
  descricao?: string
  ativa: boolean
  modulo_id: string
  slug?: string
  tipo?: 'corporativo' | 'exclusivo'
  modulos?: {
    id?: string
    nome?: string
  }
  created_at?: string
  updated_at?: string
}

interface Module {
  id: string
  nome: string
}

interface FunctionalityFormData {
  nome: string
  descricao: string
  ativa: boolean
  slug: string
  tipo: 'corporativo' | 'exclusivo'
}

export default function FunctionalitiesPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const moduleId = (params?.id as string) ?? ''

  const [functionalities, setFunctionalities] = useState<Funcionalidade[]>([])
  const [module, setModule] = useState<Module | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingFunctionality, setEditingFunctionality] = useState<Funcionalidade | null>(null)
  const [formData, setFormData] = useState<FunctionalityFormData>({
    nome: '',
    descricao: '',
    ativa: true,
    slug: '',
    tipo: 'corporativo'
  })

  // Check authentication - only redirect if explicitly not authenticated and not loading
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
      return
    }
  }, [isAuthenticated, loading, router])

  const fetchFunctionalities = useCallback(async () => {
    try {
      setLoading(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      
      if (!token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      const response = await fetch(`/api/modules/${moduleId}/functionalities`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Sessão expirada. Faça login novamente.')
          // Let AuthContext handle the redirect
          return
        }
        throw new Error(`Erro ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setFunctionalities(data.functionalities || [])
      setModule(data.module || null)
    } catch (error) {
      console.error('Erro ao buscar funcionalidades:', error)
      toast.error('Erro ao carregar funcionalidades')
    } finally {
      setLoading(false)
    }
  }, [moduleId])

  // Fetch functionalities
  useEffect(() => {
    if (moduleId && isAuthenticated) {
      fetchFunctionalities()
    }
  }, [moduleId, isAuthenticated, fetchFunctionalities])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      const url = editingFunctionality 
        ? `/api/modules/${moduleId}/functionalities`
        : `/api/modules/${moduleId}/functionalities`
      
      const method = editingFunctionality ? 'PUT' : 'POST'
      const body = editingFunctionality 
        ? { ...formData, functionalityId: editingFunctionality.id }
        : formData

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro na operação')
      }

      toast.success(editingFunctionality ? 'Funcionalidade atualizada!' : 'Funcionalidade criada!')
      setIsModalOpen(false)
      setEditingFunctionality(null)
      setFormData({ nome: '', descricao: '', ativa: true, slug: '', tipo: 'corporativo' })
      fetchFunctionalities()
    } catch (error: unknown) {
      console.error('Erro ao salvar funcionalidade:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar funcionalidade')
    }
  }

  const handleDelete = async (functionality: Funcionalidade) => {
    if (!confirm(`Tem certeza que deseja excluir a funcionalidade "${functionality.nome}"?`)) {
      return
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      const response = await fetch(`/api/modules/${moduleId}/functionalities?functionalityId=${functionality.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao excluir')
      }

      toast.success('Funcionalidade excluída!')
      fetchFunctionalities()
    } catch (error: unknown) {
      console.error('Erro ao excluir funcionalidade:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir funcionalidade')
    }
  }

  const handleToggleStatus = async (functionality: Funcionalidade) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      const response = await fetch(`/api/modules/${moduleId}/functionalities`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          functionalityId: functionality.id,
          nome: functionality.nome,
          descricao: functionality.descricao,
          ativa: !functionality.ativa,
          slug: functionality.slug,
          tipo: functionality.tipo ?? 'corporativo'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao alterar status')
      }

      toast.success(`Funcionalidade ${!functionality.ativa ? 'ativada' : 'desativada'}!`)
      fetchFunctionalities()
    } catch (error: unknown) {
      console.error('Erro ao alterar status:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao alterar status')
    }
  }

  const openModal = (functionality?: Funcionalidade) => {
    if (functionality) {
      setEditingFunctionality(functionality)
      setFormData({
        nome: functionality.nome,
        descricao: functionality.descricao || '',
        ativa: functionality.ativa,
        slug: functionality.slug || '',
        tipo: functionality.tipo ?? 'corporativo'
      })
    } else {
      setEditingFunctionality(null)
      setFormData({ nome: '', descricao: '', ativa: true, slug: '', tipo: 'corporativo' })
    }
    setIsModalOpen(true)
  }

  const filteredFunctionalities = functionalities.filter(func =>
    func.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (func.descricao && func.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
              onClick={() => router.push('/modules')}
              className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              Voltar
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Funcionalidades - {module?.nome || 'Carregando...'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Gerencie as funcionalidades do módulo
              </p>
            </div>
          </div>
          
          {user?.role === 'Admin' && (
            <button
              onClick={() => openModal()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Nova Funcionalidade</span>
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Buscar funcionalidades..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Functionalities List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          {filteredFunctionalities.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm ? 'Nenhuma funcionalidade encontrada.' : 'Nenhuma funcionalidade cadastrada.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    {user?.role === 'Admin' && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Ações
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredFunctionalities.map((functionality) => (
                    <tr key={functionality.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {functionality.nome}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {functionality.descricao || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => user?.role === 'Admin' && handleToggleStatus(functionality)}
                          disabled={user?.role !== 'Admin'}
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            functionality.ativa
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          } ${user?.role === 'Admin' ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                        >
                          {functionality.ativa ? 'Ativa' : 'Inativa'}
                        </button>
                      </td>
                      {user?.role === 'Admin' && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => openModal(functionality)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(functionality)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {editingFunctionality ? 'Editar Funcionalidade' : 'Nova Funcionalidade'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Slug *
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="ex.: criar_usuario, exportar_usuario"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Coluna slug da tabela modulo_funcionalidades (controle visual).
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo *
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'corporativo' | 'exclusivo' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="corporativo">Corporativo</option>
                    <option value="exclusivo">Exclusivo</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Define se a funcionalidade aparece para todos (corporativo) ou apenas para usuários configurados.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="ativa"
                    checked={formData.ativa}
                    onChange={(e) => setFormData({ ...formData, ativa: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="ativa" className="ml-2 block text-sm text-gray-900 dark:text-white">
                    Funcionalidade ativa
                  </label>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false)
                      setEditingFunctionality(null)
                      setFormData({ nome: '', descricao: '', ativa: true, slug: '', tipo: 'corporativo' })
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-md transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                  >
                    {editingFunctionality ? 'Atualizar' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
