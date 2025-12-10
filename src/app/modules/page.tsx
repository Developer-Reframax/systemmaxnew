'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import MainLayout from '@/components/Layout/MainLayout'
import { Modulo } from '@/lib/supabase'
import { Plus, Search, Edit, Trash2, Settings, Eye, EyeOff, List } from 'lucide-react'
import { toast } from 'sonner'

interface ModuleFormData {
  nome: string
  descricao: string
  slug: string
  tipo: 'corporativo' | 'exclusivo'
  ativo: boolean
}

export default function ModulesPage() {
  const { user } = useAuth()
  const [modules, setModules] = useState<Modulo[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingModule, setEditingModule] = useState<Modulo | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState<ModuleFormData>({
    nome: '',
    descricao: '',
    slug: '',
    tipo: 'corporativo',
    ativo: true
  })



  useEffect(() => {
    fetchModules()
  }, [])

  const fetchModules = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        toast.error('Token não encontrado')
        return
      }

      const response = await fetch('/api/modules', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar módulos')
      }

      const data = await response.json()
      setModules(data || [])
    } catch (error) {
      console.error('Erro ao carregar módulos:', error)
      toast.error('Erro ao carregar módulos')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        toast.error('Token não encontrado')
        return
      }

      if (editingModule) {
        // Update module
        const response = await fetch('/api/modules', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ id: editingModule.id, ...formData })
        })

        if (!response.ok) {
          throw new Error('Erro ao atualizar módulo')
        }

        toast.success('Módulo atualizado com sucesso!')
      } else {
        // Create new module
        const response = await fetch('/api/modules', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        })

        if (!response.ok) {
          throw new Error('Erro ao criar módulo')
        }

        toast.success('Módulo criado com sucesso!')
      }

      setShowModal(false)
      setEditingModule(null)
      resetForm()
      fetchModules()
    } catch (error: unknown) {
      console.error('Erro ao salvar módulo:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar módulo')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (module: Modulo) => {
    setEditingModule(module)
    setFormData({
      nome: module.nome,
      descricao: module.descricao,
      slug: module.slug || '',
      tipo: module.tipo,
      ativo: module.ativo
    })
    setShowModal(true)
  }

  const handleDelete = async (moduleId: string) => {
    if (!confirm('Tem certeza que deseja excluir este módulo?')) return

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        toast.error('Token não encontrado')
        return
      }

      const response = await fetch(`/api/modules?id=${moduleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao excluir módulo')
      }

      toast.success('Módulo excluído com sucesso!')
      fetchModules()
    } catch (error: unknown) {
      console.error('Erro ao excluir módulo:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir módulo')
    }
  }

  const toggleModuleStatus = async (moduleId: string, currentStatus: boolean) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        toast.error('Token não encontrado')
        return
      }

      const response = await fetch('/api/modules', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: moduleId, ativo: !currentStatus })
      })

      if (!response.ok) {
        throw new Error('Erro ao alterar status do módulo')
      }

      toast.success(`Módulo ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`)
      fetchModules()
    } catch (error: unknown) {
      console.error('Erro ao alterar status do módulo:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao alterar status do módulo')
    }
  }

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      slug: '',
      tipo: 'corporativo',
      ativo: true
    })
  }

  const filteredModules = modules.filter(module =>
    module.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    module.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!user || user.role !== 'Admin') {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Acesso negado. Apenas administradores podem gerenciar módulos.</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gerenciar Módulos</h1>
          <button
            onClick={() => {
              setEditingModule(null)
              resetForm()
              setShowModal(true)
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo Módulo
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Buscar módulos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading ? (
            <div className="col-span-full flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredModules.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
              Nenhum módulo encontrado
            </div>
          ) : (
            filteredModules.map((module) => (
              <div key={module.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white bg-blue-600">
                    <Settings className="h-6 w-6" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleModuleStatus(module.id, module.ativo)}
                      className={`p-1 rounded ${module.ativo ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'}`}
                      title={module.ativo ? 'Desativar módulo' : 'Ativar módulo'}
                    >
                      {module.ativo ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleEdit(module)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(module.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {module.nome}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                    {module.descricao}
                  </p>
                  <div className="flex items-center justify-end text-xs text-gray-500 dark:text-gray-400">
                    <span className={`px-2 py-1 rounded-full ${
                      module.tipo === 'corporativo' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                    }`}>
                      {module.tipo === 'corporativo' ? 'Corporativo' : 'Exclusivo'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      module.ativo 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {module.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <button
                      onClick={() => window.location.href = `/modules/${module.id}/functionalities`}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <List className="h-4 w-4" />
                      Gerenciar Funcionalidades
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {editingModule ? 'Editar Módulo' : 'Novo Módulo'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nome do m?dulo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Slug do m?dulo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.slug ?? ''}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="ex.: usuarios, desvios"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Usado para o controle de acesso visual (coluna slug da tabela modulos).
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Descrição *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>



                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tipo *
                    </label>
                    <select
                      required
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'corporativo' | 'exclusivo' })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="corporativo">Corporativo</option>
                      <option value="exclusivo">Exclusivo</option>
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Corporativo: Acessível a todos os usuários. Exclusivo: Acesso restrito por configuração.
                    </p>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="ativo"
                      checked={formData.ativo}
                      onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="ativo" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Módulo ativo
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false)
                        setEditingModule(null)
                        resetForm()
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Salvando...' : editingModule ? 'Atualizar' : 'Criar'}
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
