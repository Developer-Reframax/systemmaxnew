'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Search, Edit, Trash2, Shield, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/Layout/MainLayout'
import { useAuth } from '@/hooks/useAuth'

interface Potential {
  id: string
  potencial_sede: 'Intolerável' | 'Substancial' | 'Moderado' | 'Trivial'
  potencial_local: string
  contrato: string
  created_at: string
  updated_at: string
}

interface Contract {
  codigo: string
  nome: string
}

interface PotentialFormData {
  potencial_sede: 'Intolerável' | 'Substancial' | 'Moderado' | 'Trivial'
  potencial_local: string
  contrato: string
}

export default function PotentialsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [potentials, setPotentials] = useState<Potential[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPotential, setEditingPotential] = useState<Potential | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedContract, setSelectedContract] = useState('')
  const [formData, setFormData] = useState<PotentialFormData>({
    potencial_sede: 'Substancial',
    potencial_local: '',
    contrato: ''
  })



  const fetchPotentials = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      const url = selectedContract 
        ? `/api/security-params/potentials?contrato=${selectedContract}`
        : '/api/security-params/potentials'

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao carregar potenciais')
      }

      const data = await response.json()
      setPotentials(data.data || [])
    } catch (error: unknown) {
      console.error('Erro ao carregar potenciais:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar potenciais')
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
    fetchPotentials()
    fetchContracts()
  }, [fetchPotentials, fetchContracts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      if (editingPotential) {
        // Update potential
        const response = await fetch(`/api/security-params/potentials/${editingPotential.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Erro ao atualizar potencial')
        }

        toast.success('Potencial atualizado com sucesso!')
      } else {
        // Create new potential
        const response = await fetch('/api/security-params/potentials', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Erro ao criar potencial')
        }

        toast.success('Potencial criado com sucesso!')
      }

      setShowModal(false)
      setEditingPotential(null)
      resetForm()
      fetchPotentials()
    } catch (error: unknown) {
      console.error('Erro ao salvar potencial:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar potencial')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (potential: Potential) => {
    setEditingPotential(potential)
    setFormData({
      potencial_sede: potential.potencial_sede,
      potencial_local: potential.potencial_local,
      contrato: potential.contrato
    })
    setShowModal(true)
  }

  const handleDelete = async (potentialId: string) => {
    if (!confirm('Tem certeza que deseja excluir este potencial?')) {
      return
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch(`/api/security-params/potentials/${potentialId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao excluir potencial')
      }
      
      toast.success('Potencial excluído com sucesso!')
      fetchPotentials()
    } catch (error: unknown) {
      console.error('Erro ao excluir potencial:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir potencial')
    }
  }

  const resetForm = () => {
    setFormData({
      potencial_sede: 'Moderado',
      potencial_local: '',
      contrato: ''
    })
  }

  const filteredPotentials = potentials.filter(potential =>
    potential.potencial_local.toLowerCase().includes(searchTerm.toLowerCase()) ||
    potential.potencial_sede.toLowerCase().includes(searchTerm.toLowerCase()) ||
    potential.contrato.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getSedeColor = (sede: string) => {
    switch (sede) {
      case 'Intolerável': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'Substancial': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'Moderado': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'Trivial': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  if (!user || user.role === 'Usuario') {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Acesso negado. Apenas administradores e editores podem gerenciar potenciais.</p>
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Potenciais</h1>
              <p className="text-gray-600 dark:text-gray-400">Gerenciar potenciais de sede e local</p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingPotential(null)
              resetForm()
              setShowModal(true)
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo Potencial
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar potenciais..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={selectedContract}
            onChange={(e) => {
              setSelectedContract(e.target.value)
              fetchPotentials()
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Todos os contratos</option>
            {contracts.map((contract) => (
              <option key={contract.codigo} value={contract.codigo}>
                {contract.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Potentials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredPotentials.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
              Nenhum potencial encontrado
            </div>
          ) : (
            filteredPotentials.map((potential) => (
              <div key={potential.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSedeColor(potential.potencial_sede)}`}>
                      {potential.potencial_sede}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(potential)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(potential.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Potencial Local</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {potential.potencial_local}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Contrato</p>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {contracts.find(c => c.codigo === potential.contrato)?.nome || potential.contrato}
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
                  {editingPotential ? 'Editar Potencial' : 'Novo Potencial'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Potencial Sede *
                    </label>
                    <select
                      required
                      value={formData.potencial_sede}
                      onChange={(e) => setFormData({ ...formData, potencial_sede: e.target.value as 'Intolerável' | 'Substancial' | 'Moderado' | 'Trivial' })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="Intolerável">Intolerável</option>
                      <option value="Substancial">Substancial</option>
                      <option value="Moderado">Moderado</option>
                      <option value="Trivial">Trivial</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Potencial Local *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.potencial_local}
                      onChange={(e) => setFormData({ ...formData, potencial_local: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Ex: Área de Risco A"
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                        setEditingPotential(null)
                        resetForm()
                      }}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Salvando...' : editingPotential ? 'Atualizar' : 'Criar'}
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
