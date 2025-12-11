'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Search, Edit, Trash2, MapPin, Layers } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Contrato, Usuario } from '@/lib/supabase'
import type { Modulo } from '@/lib/supabase'

interface ContractFormData {
  codigo: string
  nome: string
  local: string
  responsavel: string
  status: 'ativo' | 'inativo'
  codigo_wpp: string
  localizacao: string
}

export default function ContractsPage() {
  const { user } = useAuth()
  const [contracts, setContracts] = useState<Contrato[]>([])
  const [users, setUsers] = useState<Usuario[]>([])
  const [modules, setModules] = useState<Modulo[]>([])
  const [contractModules, setContractModules] = useState<{ modulo_id: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showModulesModal, setShowModulesModal] = useState(false)
  const [editingContract, setEditingContract] = useState<Contrato | null>(null)
  const [selectedContract, setSelectedContract] = useState<Contrato | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState<ContractFormData>({
    codigo: '',
    nome: '',
    local: '',
    responsavel: '',
    status: 'ativo',
    codigo_wpp: '',
    localizacao: ''
  })

  useEffect(() => {
    fetchContracts()
    fetchUsers()
    fetchModules()
  }, [])

  const fetchContracts = async () => {
    try {
      const response = await fetch('/api/contracts', {
        method: 'GET',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao carregar contratos')
      }

      const data = await response.json()
      setContracts(data.contracts || [])
    } catch (error) {
      console.error('Erro ao carregar contratos:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar contratos')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        console.error('Token de autenticação não encontrado')
        return
      }

      const response = await fetch('/api/users', {
        method: 'GET'
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Resposta da API de usuários:', data) // Debug
        setUsers(data.users || [])
      } else {
        console.error('Erro ao buscar usuários:', response.status, response.statusText)
        const errorData = await response.json().catch(() => ({}))
        console.error('Detalhes do erro:', errorData)
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error)
    }
  }

  const fetchModules = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) return

      const response = await fetch('/api/modules', {
       method: 'GET'
      })

      const data = await response.json()
      if (response.ok) {
        setModules((data || []).filter((m: Modulo) => m.ativo))
      }
    } catch (error) {
      console.error('Erro ao carregar módulos:', error)
    }
  }

  const fetchContractModules = async (codigo: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) return

      const response = await fetch(`/api/module-contracts?codigo_contrato=${codigo}`, {
       method: 'GET'
      })

      const data = await response.json()
      if (response.ok) {
        setContractModules(data.moduleContracts || [])
      } else {
        setContractModules([])
      }
    } catch (error) {
      console.error('Erro ao carregar módulos do contrato:', error)
      setContractModules([])
    }
  }

  const handleManageModules = async (contract: Contrato) => {
    setSelectedContract(contract)
    setShowModulesModal(true)
    await fetchContractModules(contract.codigo)
  }

  const isContractHasModule = (moduloId: string) =>
    contractModules.some((mc) => mc.modulo_id === moduloId)

  const handleToggleModuleForContract = async (moduloId: string) => {
    if (!selectedContract) return
    const codigo_contrato = selectedContract.codigo
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      const hasAccess = isContractHasModule(moduloId)
      const response = await fetch('/api/module-contracts', {
        method: hasAccess ? 'DELETE' : 'POST',
        body: JSON.stringify({ modulo_id: moduloId, codigo_contrato })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar módulos do contrato')
      }

      toast.success(hasAccess ? 'Módulo removido do contrato' : 'Módulo habilitado para o contrato')
      await fetchContractModules(codigo_contrato)
    } catch (error) {
      console.error('Erro ao atualizar módulo do contrato:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar módulo do contrato')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      const contractData = {
        codigo: formData.codigo,
        nome: formData.nome,
        local: formData.local || undefined,
        responsavel: formData.responsavel ? parseInt(formData.responsavel) : undefined,
        status: formData.status,
        codigo_wpp: formData.codigo_wpp || undefined,
        localizacao: formData.localizacao || undefined
      }

      if (editingContract) {
        // Update contract
        const response = await fetch('/api/contracts', {
          method: 'PUT',
          body: JSON.stringify({ ...contractData, codigo: editingContract.codigo })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Erro ao atualizar contrato')
        }

        toast.success('Contrato atualizado com sucesso!')
      } else {
        // Create new contract
        const response = await fetch('/api/contracts', {
          method: 'POST',
          body: JSON.stringify(contractData)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Erro ao criar contrato')
        }

        toast.success('Contrato criado com sucesso!')
      }

      setShowModal(false)
      setEditingContract(null)
      resetForm()
      fetchContracts()
    } catch (error) {
      console.error('Erro ao salvar contrato:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar contrato')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (contract: Contrato) => {
    setEditingContract(contract)
    setFormData({
      codigo: contract.codigo,
      nome: contract.nome,
      local: contract.local || '',
      responsavel: contract.responsavel?.toString() || '',
      status: contract.status,
      codigo_wpp: contract.codigo_wpp || '',
      localizacao: contract.localizacao || ''
    })
    fetchUsers() // Garantir que os usuários sejam carregados
    setShowModal(true)
  }

  const handleDelete = async (contractCodigo: string) => {
    if (!confirm('Tem certeza que deseja excluir este contrato?')) {
      return
    }

    try {
      const response = await fetch('/api/contracts', {
        method: 'DELETE',
        body: JSON.stringify({ codigo: contractCodigo })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao excluir contrato')
      }

      toast.success('Contrato excluído com sucesso!')
      fetchContracts()
    } catch (error) {
      console.error('Erro ao excluir contrato:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir contrato')
    }
  }

  const resetForm = () => {
    setFormData({
      codigo: '',
      nome: '',
      local: '',
      responsavel: '',
      status: 'ativo',
      codigo_wpp: '',
      localizacao: ''
    })
  }



  const filteredContracts = contracts.filter(contract =>
    contract.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contract.local && contract.local.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (!user || user.role === 'Usuario') {
    return (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Acesso negado. Apenas administradores e editores podem gerenciar contratos.</p>
        </div>
    )
  }

  return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gerenciar Contratos</h1>
          <button
            onClick={() => {
              setEditingContract(null)
              resetForm()
              fetchUsers() // Garantir que os usuários sejam carregados
              setShowModal(true)
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo Contrato
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Buscar contratos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Contracts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
              Nenhum contrato encontrado
            </div>
          ) : (
            filteredContracts.map((contract) => (
              <div key={contract.codigo} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {contract.nome}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      #{contract.codigo}
                    </p>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${contract.status === 'ativo' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                    {contract.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {contract.local && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <strong>Local:</strong> {contract.local}
                    </p>
                  )}
                  {contract.responsavel && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <strong>Responsável:</strong> {users.find(u => u.matricula === contract.responsavel)?.nome || contract.responsavel}
                    </p>
                  )}
                  {contract.codigo_wpp && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <strong>WhatsApp:</strong> {contract.codigo_wpp}
                    </p>
                  )}
                  {contract.localizacao && (
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                      <MapPin className="h-4 w-4 mr-1" />
                      {contract.localizacao}
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-2">
                  {/* Gerenciar módulos do contrato */}
                  <button
                    onClick={() => handleManageModules(contract)}
                    className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 p-1"
                    title="Gerenciar módulos do contrato"
                  >
                    <Layers className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(contract)}
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(contract.codigo)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
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
                  {editingContract ? 'Editar Contrato' : 'Novo Contrato'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Código do Contrato *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.codigo}
                        onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nome do Contrato *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Local
                      </label>
                      <input
                        type="text"
                        value={formData.local}
                        onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Ex: Obra Centro"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Responsável
                      </label>
                      <select
                        value={formData.responsavel}
                        onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Selecione um responsável</option>
                        {users && users.length > 0 ? (
                          users.map((user) => (
                            <option key={user.matricula} value={user.matricula}>
                              {user.nome} ({user.matricula})
                            </option>
                          ))
                        ) : (
                          <option disabled>Carregando usuários...</option>
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Status *
                      </label>
                      <select
                        required
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ativo' | 'inativo' })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="ativo">Ativo</option>
                        <option value="inativo">Inativo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Código WhatsApp
                      </label>
                      <input
                        type="text"
                        value={formData.codigo_wpp}
                        onChange={(e) => setFormData({ ...formData, codigo_wpp: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Ex: +5511999999999"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Localização
                    </label>
                    <input
                      type="text"
                      value={formData.localizacao}
                      onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Ex: São Paulo, SP"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false)
                        setEditingContract(null)
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
                      {loading ? 'Salvando...' : editingContract ? 'Atualizar' : 'Criar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        {/* Modal de Gerenciar Módulos do Contrato */}
        {showModulesModal && selectedContract && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Cabeçalho */}
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Gerenciar módulos – {selectedContract.nome} ({selectedContract.codigo})
                  </h2>
                  <button
                    onClick={() => {
                      setShowModulesModal(false)
                      setSelectedContract(null)
                      setContractModules([])
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    ✕
                  </button>
                </div>

                {/* Texto explicativo */}
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Selecione abaixo quais módulos este contrato deve ter acesso. Ao marcar ou desmarcar,
                  o vínculo é salvo automaticamente na tabela <code>modulo_contratos</code>.
                </p>

                {/* Lista de módulos */}
                {modules.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    Nenhum módulo encontrado ou carregado.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {modules.map((modulo) => {
                      const hasAccess = isContractHasModule(modulo.id)

                      return (
                        <div
                          key={modulo.id}
                          className="grid grid-cols-[1fr_auto] gap-4 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="font-medium text-gray-900 dark:text-white break-words">
                              {modulo.nome}
                            </div>
                            {modulo.descricao && (
                              <div className="text-sm text-gray-500 dark:text-gray-400 break-words">
                                {modulo.descricao}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end justify-center space-y-2">
                            {/* Switch de acesso */}
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={hasAccess}
                                onChange={() => handleToggleModuleForContract(modulo.id)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                            </label>
                            <span className="text-xs text-gray-600 dark:text-gray-300 text-center whitespace-nowrap">
                              {hasAccess ? 'Habilitado' : 'Desabilitado'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Rodapé / resumo */}
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600 flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Este contrato possui acesso a{' '}
                    <strong>{contractModules.length}</strong> módulo(s) de{' '}
                    <strong>{modules.length}</strong> disponíveis.
                  </span>
                  <button
                    onClick={() => {
                      setShowModulesModal(false)
                      setSelectedContract(null)
                      setContractModules([])
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-lg transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
  )
}
