'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, Search } from 'lucide-react'

interface Equipe {
  id: string
  equipe: string
  supervisor: string
  supervisor_nome?: string
  created_at: string
}

interface Supervisor {
  matricula: string
  nome: string
}

interface EquipeFormData {
  equipe: string
  supervisor: string | null
}

export default function EquipesPage() {
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [supervisores, setSupervisores] = useState<Supervisor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEquipe, setEditingEquipe] = useState<Equipe | null>(null)
  const [formData, setFormData] = useState<EquipeFormData>({
    equipe: '',
    supervisor: null
  })

  useEffect(() => {
   
      fetchEquipes()
      fetchSupervisores()
    }
  , [])

  // Buscar equipes
  const fetchEquipes = async () => {
    try {
      

      const response = await fetch('/api/teams', {
       method: 'GET'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao buscar equipes')
      }

      const data = await response.json()
      setEquipes(data)
    } catch (error: unknown) {
      console.error('Erro ao buscar equipes:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar equipes'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Buscar supervisores
  const fetchSupervisores = async () => {
    try {
     

      const response = await fetch('/api/teams/supervisors', {
        method: 'GET'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao buscar supervisores')
      }

      const data = await response.json()
      setSupervisores(data)
    } catch (error: unknown) {
      console.error('Erro ao buscar supervisores:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar supervisores'
      toast.error(errorMessage)
    }
  }

  // Criar ou atualizar equipe
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.equipe || !formData.supervisor) {
      toast.error('Todos os campos são obrigatórios')
      return
    }
    
    try {
      

      const method = editingEquipe ? 'PUT' : 'POST'
      const url = editingEquipe ? `/api/teams/${editingEquipe.id}` : '/api/teams'
      
      const response = await fetch(url, {
        method,
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao salvar equipe')
      }

      toast.success(editingEquipe ? 'Equipe atualizada com sucesso!' : 'Equipe criada com sucesso!')
      setIsModalOpen(false)
      resetForm()
      fetchEquipes()
    } catch (error: unknown) {
      console.error('Erro ao salvar equipe:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro ao salvar equipe'
      toast.error(errorMessage)
    }
  }

  // Editar equipe
  const handleEdit = (equipe: Equipe) => {
    setEditingEquipe(equipe)
    setFormData({
      equipe: equipe.equipe,
      supervisor: equipe.supervisor
    })
    setIsModalOpen(true)
  }

  // Excluir equipe
  const handleDelete = async (equipeId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta equipe?')) {
      return
    }

    try {

      const response = await fetch(`/api/teams/${equipeId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao excluir equipe')
      }

      toast.success('Equipe excluída com sucesso!')
      fetchEquipes()
    } catch (error: unknown) {
      console.error('Erro ao excluir equipe:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro ao excluir equipe'
      toast.error(errorMessage)
    }
  }

  const resetForm = () => {
    setFormData({
      equipe: '',
      supervisor: null
    })
    setEditingEquipe(null)
  }

  // Filtrar equipes
  const filteredEquipes = equipes.filter(equipe => {
    return equipe.equipe.toLowerCase().includes(searchTerm.toLowerCase())
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gerenciamento de Equipes</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={20} />
            Nova Equipe
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar equipes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Lista de Equipes */}
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Equipe
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Supervisor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Data de Criação
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEquipes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    Nenhuma equipe encontrada
                  </td>
                </tr>
              ) : (
                filteredEquipes.map((equipe) => (
                  <tr key={equipe.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{equipe.equipe}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {equipe.supervisor_nome || equipe.supervisor}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {new Date(equipe.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(equipe)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(equipe.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {editingEquipe ? 'Editar Equipe' : 'Nova Equipe'}
                </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome da Equipe *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.equipe}
                    onChange={(e) => setFormData({ ...formData, equipe: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Nome da equipe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Supervisor *
                  </label>
                  <select
                    required
                    value={formData.supervisor || ''}
                    onChange={(e) => setFormData({ ...formData, supervisor: e.target.value || null })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Selecione um supervisor</option>
                    {supervisores.map(supervisor => (
                      <option key={supervisor.matricula} value={supervisor.matricula}>
                        {supervisor.nome} ({supervisor.matricula})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false)
                      resetForm()
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    {editingEquipe ? 'Atualizar' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        )}
      </div>
  )
}
