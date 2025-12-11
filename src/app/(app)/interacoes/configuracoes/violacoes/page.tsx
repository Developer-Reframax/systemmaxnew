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
  CheckCircle,
  Building2
} from 'lucide-react'
import { toast } from 'sonner'

interface Contrato {
  codigo: string
  nome: string
}

interface Violacao {
  id: string
  violacao: string
  contrato_id: string
  created_at?: string
  updated_at?: string
}

export default function ConfiguracoesViolacoes() {
  const { user } = useAuth()
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [contratoSelecionado, setContratoSelecionado] = useState<string>('')
  const [violacoes, setViolacoes] = useState<Violacao[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newViolacao, setNewViolacao] = useState('')
  const [editingViolacao, setEditingViolacao] = useState('')
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
      loadViolacoes(contratoSelecionado)
    } else {
      setViolacoes([])
    }
  }, [contratoSelecionado])

  const loadContratos = async () => {
    try {

      const response = await fetch('/api/contracts', {
        method: 'GET'
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

  const loadViolacoes = async (contratoId: string) => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/interacoes/violacoes?contrato_id=${contratoId}`, {
       method: 'GET'
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar violações')
      }

      const data = await response.json()
      
      if (data.success) {
        setViolacoes(data.data || [])
      } else {
        toast.error(data.message || 'Erro ao carregar violações')
        setViolacoes([])
      }
      
    } catch (error) {
      console.error('Error loading violacoes:', error)
      toast.error('Erro ao carregar violações')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!newViolacao.trim() || !contratoSelecionado) return

    try {
      setSaving(true)

      const response = await fetch('/api/interacoes/violacoes', {
        method: 'POST',
        body: JSON.stringify({
          violacao: newViolacao.trim(),
          contrato_id: contratoSelecionado
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Erro ao adicionar violação')
      }

      const data = await response.json()
      
      if (data.success) {
        toast.success('Violação adicionada com sucesso')
        setNewViolacao('')
        setShowAddForm(false)
        loadViolacoes(contratoSelecionado)
      } else {
        toast.error(data.message || 'Erro ao adicionar violação')
      }
      
    } catch (error) {
      console.error('Error adding violacao:', error)
      toast.error('Erro ao adicionar violação')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (id: string) => {
    if (!editingViolacao.trim()) return

    try {
      setSaving(true)

      const response = await fetch(`/api/interacoes/violacoes/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          violacao: editingViolacao.trim()
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Erro ao atualizar violação')
      }

      const data = await response.json()
      
      if (data.success) {
        toast.success('Violação atualizada com sucesso')
        setEditingId(null)
        setEditingViolacao('')
        loadViolacoes(contratoSelecionado)
      } else {
        toast.error(data.message || 'Erro ao atualizar violação')
      }
      
    } catch (error) {
      console.error('Error updating violacao:', error)
      toast.error('Erro ao atualizar violação')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta violação?')) return

    try {
      setSaving(true)
      
      const response = await fetch(`/api/interacoes/violacoes/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Erro ao excluir violação')
      }

      const data = await response.json()
      
      if (data.success) {
        toast.success('Violação excluída com sucesso')
        loadViolacoes(contratoSelecionado)
      } else {
        toast.error(data.message || 'Erro ao excluir violação')
      }
      
    } catch (error) {
      console.error('Error deleting violacao:', error)
      toast.error('Erro ao excluir violação')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (violacao: Violacao) => {
    setEditingId(violacao.id)
    setEditingViolacao(violacao.violacao)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingViolacao('')
  }

  if (user?.role !== 'Admin') {
    return null
  }

  return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Configurações - Violações
          </h1>
          <p className="text-gray-600 mt-2">
            Gerencie as violações disponíveis no sistema
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
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione um contrato</option>
            {contratos && contratos.map((contrato) => (
              <option key={contrato.codigo} value={contrato.codigo}>
                {contrato.codigo} - {contrato.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Lista de Violações */}
        {contratoSelecionado && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Violações</h2>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Violação
                </button>
              </div>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Carregando violações...</p>
                </div>
              ) : (
                <>
                  {/* Formulário de Adição */}
                  {showAddForm && (
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Plus className="w-4 h-4 text-blue-600" />
                        <h3 className="font-medium text-gray-900">Nova Violação</h3>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newViolacao}
                          onChange={(e) => setNewViolacao(e.target.value)}
                          placeholder="Nome da violação"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                        />
                        <button
                          onClick={handleAdd}
                          disabled={saving || !newViolacao.trim()}
                          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          Salvar
                        </button>
                        <button
                          onClick={() => {
                            setShowAddForm(false)
                            setNewViolacao('')
                          }}
                          className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Lista de Violações */}
                  {violacoes.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Nenhuma violação encontrada</p>
                      <p className="text-gray-400 text-sm">Adicione a primeira violação para começar</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {violacoes.map((violacao) => (
                        <div key={violacao.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                          {editingId === violacao.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={editingViolacao}
                                onChange={(e) => setEditingViolacao(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onKeyPress={(e) => e.key === 'Enter' && handleEdit(violacao.id)}
                              />
                              <button
                                onClick={() => handleEdit(violacao.id)}
                                disabled={saving || !editingViolacao.trim()}
                                className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="bg-gray-500 text-white px-3 py-2 rounded-md hover:bg-gray-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                                <span className="font-medium text-gray-900">{violacao.violacao}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => startEdit(violacao)}
                                  className="text-blue-600 hover:text-blue-800 p-1"
                                  title="Editar"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(violacao.id)}
                                  className="text-red-600 hover:text-red-800 p-1"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
  )
}
