'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  AlertCircle,
  Building2
} from 'lucide-react'
import MainLayout from '@/components/Layout/MainLayout'
import { toast } from 'sonner'

interface Contrato {
  codigo: string
  nome: string
}

interface LocalInstalacao {
  id: string
  local_instalacao: string
  contrato_id: string
  created_at?: string
  updated_at?: string
}

export default function ConfiguracoesLocalInstalacao() {
  const { user } = useAuth()
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [contratoSelecionado, setContratoSelecionado] = useState<string>('')
  const [locais, setLocais] = useState<LocalInstalacao[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newLocal, setNewLocal] = useState('')
  const [editingLocal, setEditingLocal] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  // Verificar se o usuário tem permissão
  useEffect(() => {
    if (user && user.role !== 'Admin') {
      toast.error('Acesso negado. Apenas administradores podem acessar as configurações.')
      window.location.href = '/interacoes'
      return
    }
  }, [user])

  useEffect(() => {
    loadContratos()
  }, [])

  useEffect(() => {
    if (contratoSelecionado) {
      loadLocais(contratoSelecionado)
    } else {
      setLocais([])
    }
  }, [contratoSelecionado])

  const loadContratos = async () => {
    try {
      const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!auth_token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      const response = await fetch('/api/contracts', {
        headers: {
          'Authorization': `Bearer ${auth_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar contratos')
      }

      const data = await response.json()
      
      if (data.success) {
        setContratos(data.contracts)
        if (data.contracts.length > 0) {
          setContratoSelecionado(data.contracts[0].codigo)
        }
      } else {
        toast.error(data.message || 'Erro ao carregar contratos')
      }
      
    } catch (error) {
      console.error('Error loading contracts:', error)
      toast.error('Erro ao carregar contratos')
    }
  }

  const loadLocais = async (contratoId: string) => {
    try {
      setLoading(true)
      
      const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!auth_token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      const response = await fetch(`/api/interacoes/local-instalacao?contrato_id=${contratoId}`, {
        headers: {
          'Authorization': `Bearer ${auth_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar locais de instalação')
      }

      const data = await response.json()
      
      if (data.success) {
        setLocais(data.data || [])
      } else {
        toast.error(data.message || 'Erro ao carregar locais de instalação')
        setLocais([])
      }
      
    } catch (error) {
      console.error('Error loading locais:', error)
      toast.error('Erro ao carregar locais de instalação')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!newLocal.trim() || !contratoSelecionado) return

    try {
      setSaving(true)
      
      const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!auth_token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      const response = await fetch('/api/interacoes/local-instalacao', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          local_instalacao: newLocal.trim(),
          contrato_id: contratoSelecionado
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao adicionar local de instalação')
      }

      await response.json()
      
      toast.success('Local de instalação adicionado com sucesso')
      setNewLocal('')
      setShowAddForm(false)
      loadLocais(contratoSelecionado)
      
    } catch (error) {
      console.error('Error adding local:', error)
      toast.error('Erro ao adicionar local de instalação')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (id: string) => {
    if (!editingLocal.trim()) return

    try {
      setSaving(true)
      
      const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!auth_token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      const response = await fetch(`/api/interacoes/local-instalacao`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${auth_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: id,
          local_instalacao: editingLocal.trim()
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao atualizar local de instalação')
      }

      await response.json()
      
      toast.success('Local de instalação atualizado com sucesso')
      setEditingId(null)
      setEditingLocal('')
      loadLocais(contratoSelecionado)
      
    } catch (error) {
      console.error('Error updating local:', error)
      toast.error('Erro ao atualizar local de instalação')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este local de instalação?')) return

    try {
      setSaving(true)
      
      const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!auth_token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      const response = await fetch(`/api/interacoes/local-instalacao?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${auth_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao excluir local de instalação')
      }

      await response.json()
      
      toast.success('Local de instalação excluído com sucesso')
      loadLocais(contratoSelecionado)
      
    } catch (error) {
      console.error('Error deleting local:', error)
      toast.error('Erro ao excluir local de instalação')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (local: LocalInstalacao) => {
    setEditingId(local.id)
    setEditingLocal(local.local_instalacao)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingLocal('')
  }

  if (user?.role !== 'Admin') {
    return null
  }

  return (
    <MainLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Configurações - Locais de Instalação
          </h1>
          <p className="text-gray-600 mt-2">
            Gerencie os locais de instalação disponíveis no sistema
          </p>
        </div>

        {/* Seleção de Contrato */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Selecionar Contrato</h2>
          </div>
          
          <select
            value={contratoSelecionado}
            onChange={(e) => setContratoSelecionado(e.target.value)}
            className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione um contrato</option>
            {contratos.map(contrato => (
              <option key={contrato.codigo} value={contrato.codigo}>
                {contrato.codigo} - {contrato.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Lista de Locais */}
        {contratoSelecionado && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Locais de Instalação
                </h2>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Local
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Formulário de Adição */}
              {showAddForm && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                  <h3 className="text-md font-medium text-gray-900 mb-3">
                    Adicionar Novo Local de Instalação
                  </h3>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newLocal}
                      onChange={(e) => setNewLocal(e.target.value)}
                      placeholder="Nome do local de instalação"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleAdd}
                      disabled={saving || !newLocal.trim()}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddForm(false)
                        setNewLocal('')
                      }}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Tabela de Locais */}
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Carregando locais...</p>
                </div>
              ) : locais.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhum local de instalação encontrado</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Clique em "Adicionar Local" para criar o primeiro local
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-900">
                          Local de Instalação
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">
                          Data de Criação
                        </th>
                        <th className="text-right py-3 px-4 font-medium text-gray-900">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {locais.map((local) => (
                        <tr key={local.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            {editingId === local.id ? (
                              <input
                                type="text"
                                value={editingLocal}
                                onChange={(e) => setEditingLocal(e.target.value)}
                                className="w-full border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            ) : (
                              <span className="font-medium text-gray-900">
                                {local.local_instalacao}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {local.created_at ? new Date(local.created_at).toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-2">
                              {editingId === local.id ? (
                                <>
                                  <button
                                    onClick={() => handleEdit(local.id)}
                                    disabled={saving}
                                    className="text-green-600 hover:text-green-800 p-1"
                                    title="Salvar"
                                  >
                                    <Save className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="text-gray-600 hover:text-gray-800 p-1"
                                    title="Cancelar"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => startEdit(local)}
                                    className="text-blue-600 hover:text-blue-800 p-1"
                                    title="Editar"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(local.id)}
                                    disabled={saving}
                                    className="text-red-600 hover:text-red-800 p-1"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {!contratoSelecionado && (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Selecione um contrato para visualizar os locais de instalação</p>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
