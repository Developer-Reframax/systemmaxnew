'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Search, Edit, Trash2, MapPin, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

interface Location {
  id: string
  local: string
  contrato: string
  created_at: string
  updated_at: string
}

interface Contract {
  codigo: string
  nome: string
}

interface LocationFormData {
  local: string
  contrato: string
}

export default function LocationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [locations, setLocations] = useState<Location[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedContract, setSelectedContract] = useState('')
  const [formData, setFormData] = useState<LocationFormData>({
    local: '',
    contrato: ''
  })



  const fetchLocations = useCallback(async () => {
    try {

      const url = selectedContract 
        ? `/api/security-params/locations?contrato=${selectedContract}`
        : '/api/security-params/locations'

      const response = await fetch(url, {
        method: 'GET'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao carregar locais')
      }

      const data = await response.json()
      setLocations(data.data || [])
    } catch (error: unknown) {
      console.error('Erro ao carregar locais:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar locais')
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
    fetchLocations()
    fetchContracts()
  }, [fetchLocations, fetchContracts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {

      if (editingLocation) {
        // Update location
        const response = await fetch(`/api/security-params/locations/${editingLocation.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Erro ao atualizar local')
        }

        toast.success('Local atualizado com sucesso!')
      } else {
        // Create new location
        const response = await fetch('/api/security-params/locations', {
          method: 'POST',
          body: JSON.stringify(formData)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Erro ao criar local')
        }

        toast.success('Local criado com sucesso!')
      }

      setShowModal(false)
      setEditingLocation(null)
      resetForm()
      fetchLocations()
    } catch (error: unknown) {
      console.error('Erro ao salvar local:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar local')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (location: Location) => {
    setEditingLocation(location)
    setFormData({
      local: location.local,
      contrato: location.contrato
    })
    setShowModal(true)
  }

  const handleDelete = async (locationId: string) => {
    if (!confirm('Tem certeza que deseja excluir este local?')) {
      return
    }

    try {
      const response = await fetch(`/api/security-params/locations/${locationId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao excluir local')
      }
      
      toast.success('Local excluído com sucesso!')
      fetchLocations()
    } catch (error: unknown) {
      console.error('Erro ao excluir local:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir local')
    }
  }

  const resetForm = () => {
    setFormData({
      local: '',
      contrato: ''
    })
  }

  const filteredLocations = locations.filter(location =>
    location.local.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.contrato.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!user || user.role === 'Usuario') {
    return (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Acesso negado. Apenas administradores e editores podem gerenciar locais.</p>
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Locais</h1>
              <p className="text-gray-600 dark:text-gray-400">Gerenciar locais por contrato</p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingLocation(null)
              resetForm()
              setShowModal(true)
            }}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo Local
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar locais..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={selectedContract}
            onChange={(e) => {
              setSelectedContract(e.target.value)
              fetchLocations()
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Todos os contratos</option>
            {contracts.map((contract) => (
              <option key={contract.codigo} value={contract.codigo}>
                {contract.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Locations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
              Nenhum local encontrado
            </div>
          ) : (
            filteredLocations.map((location) => (
              <div key={location.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5 text-yellow-600" />
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {location.local}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(location)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(location.id)}
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
                      {contracts.find(c => c.codigo === location.contrato)?.nome || location.contrato}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Criado em: {new Date(location.created_at).toLocaleDateString('pt-BR')}
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
                  {editingLocation ? 'Editar Local' : 'Novo Local'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Local *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.local}
                      onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Ex: Escritório Principal"
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                        setEditingLocation(null)
                        resetForm()
                      }}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Salvando...' : editingLocation ? 'Atualizar' : 'Criar'}
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
