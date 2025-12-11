'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Search, Edit, Trash2, FileText, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

interface Nature {
  id: string
  natureza: string
  contrato: string
  created_at: string
  updated_at: string
}

interface Contract {
  codigo: string
  nome: string
}

interface NatureFormData {
  natureza: string
  contrato: string
}

export default function NaturesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [natures, setNatures] = useState<Nature[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingNature, setEditingNature] = useState<Nature | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedContract, setSelectedContract] = useState('')
  const [formData, setFormData] = useState<NatureFormData>({
    natureza: '',
    contrato: ''
  })



  const fetchNatures = useCallback(async () => {
    try {

      const url = selectedContract 
        ? `/api/security-params/natures?contrato=${selectedContract}`
        : '/api/security-params/natures'

      const response = await fetch(url, {
        method: 'GET'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao carregar naturezas')
      }

      const data = await response.json()
      setNatures(data.data || [])
    } catch (error: unknown) {
      console.error('Erro ao carregar naturezas:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar naturezas')
    } finally {
      setLoading(false)
    }
  }, [selectedContract])

  const fetchContracts = useCallback(async () => {
    try {


      const response = await fetch('/api/contracts', {
       method: 'GET'
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
    fetchNatures()
    fetchContracts()
  }, [fetchNatures, fetchContracts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {


      if (editingNature) {
        // Update nature
        const response = await fetch(`/api/security-params/natures/${editingNature.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Erro ao atualizar natureza')
        }

        toast.success('Natureza atualizada com sucesso!')
      } else {
        // Create new nature
        const response = await fetch('/api/security-params/natures', {
          method: 'POST',
          body: JSON.stringify(formData)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Erro ao criar natureza')
        }

        toast.success('Natureza criada com sucesso!')
      }

      setShowModal(false)
      setEditingNature(null)
      resetForm()
      fetchNatures()
    } catch (error: unknown) {
      console.error('Erro ao salvar natureza:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar natureza')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (nature: Nature) => {
    setEditingNature(nature)
    setFormData({
      natureza: nature.natureza,
      contrato: nature.contrato
    })
    setShowModal(true)
  }

  const handleDelete = async (natureId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta natureza?')) {
      return
    }

    try {
      const response = await fetch(`/api/security-params/natures/${natureId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao excluir natureza')
      }
      
      toast.success('Natureza excluída com sucesso!')
      fetchNatures()
    } catch (error: unknown) {
      console.error('Erro ao excluir natureza:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir natureza')
    }
  }

  const resetForm = () => {
    setFormData({
      natureza: '',
      contrato: ''
    })
  }

  const filteredNatures = natures.filter(nature =>
    nature.natureza.toLowerCase().includes(searchTerm.toLowerCase()) ||
    nature.contrato.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!user || user.role === 'Usuario') {
    return (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Acesso negado. Apenas administradores e editores podem gerenciar naturezas.</p>
        </div>
    )
  }

  return (
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Natureza</h1>
              <p className="text-gray-600 dark:text-gray-400">Gerenciar tipos de natureza por contrato</p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingNature(null)
              resetForm()
              setShowModal(true)
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nova Natureza
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar naturezas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={selectedContract}
            onChange={(e) => {
              setSelectedContract(e.target.value)
              fetchNatures()
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

        {/* Natures Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : filteredNatures.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
              Nenhuma natureza encontrada
            </div>
          ) : (
            filteredNatures.map((nature) => (
              <div key={nature.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-green-600" />
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {nature.natureza}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(nature)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(nature.id)}
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
                      {contracts.find(c => c.codigo === nature.contrato)?.nome || nature.contrato}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Criado em: {new Date(nature.created_at).toLocaleDateString('pt-BR')}
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
                  {editingNature ? 'Editar Natureza' : 'Nova Natureza'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Natureza *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.natureza}
                      onChange={(e) => setFormData({ ...formData, natureza: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Ex: Acidente de Trabalho"
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
                        setEditingNature(null)
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
                      {loading ? 'Salvando...' : editingNature ? 'Atualizar' : 'Criar'}
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
