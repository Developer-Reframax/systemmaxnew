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
import MainLayout from '@/components/Layout/MainLayout'
import { toast } from 'sonner'

interface Contrato {
  codigo: string
  nome: string
}

interface Area {
  id: string
  area: string
  contrato_id: string
  created_at?: string
  updated_at?: string
}

export default function ConfiguracoesAreas() {
  const { user } = useAuth()
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [contratoSelecionado, setContratoSelecionado] = useState<string>('')
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newArea, setNewArea] = useState('')
  const [editingArea, setEditingArea] = useState('')
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
      loadAreas(contratoSelecionado)
    } else {
      setAreas([])
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

  const loadAreas = async (contratoId: string) => {
    try {
      setLoading(true)
      
      const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!auth_token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      const response = await fetch(`/api/interacoes/areas?contrato_id=${contratoId}`, {
        headers: {
          'Authorization': `Bearer ${auth_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar áreas')
      }

      const data = await response.json()
      
      if (data.success) {
        setAreas(data.data || [])
      } else {
        toast.error(data.message || 'Erro ao carregar áreas')
        setAreas([])
      }
      
    } catch (error) {
      console.error('Error loading areas:', error)
      toast.error('Erro ao carregar áreas')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!newArea.trim() || !contratoSelecionado) return

    try {
      setSaving(true)
      
      const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!auth_token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      const response = await fetch('/api/interacoes/areas', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          area: newArea.trim(),
          contrato_id: contratoSelecionado
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao adicionar área')
      }

      await response.json()
      
      toast.success('Área adicionada com sucesso')
      setNewArea('')
      setShowAddForm(false)
      loadAreas(contratoSelecionado)
      
    } catch (error) {
      console.error('Error adding area:', error)
      toast.error('Erro ao adicionar área')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (id: string) => {
    if (!editingArea.trim()) return

    try {
      setSaving(true)
      
      const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!auth_token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      const response = await fetch(`/api/interacoes/areas/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${auth_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          area: editingArea.trim()
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao atualizar área')
      }

      await response.json()
      
      toast.success('Área atualizada com sucesso')
      setEditingId(null)
      setEditingArea('')
      loadAreas(contratoSelecionado)
      
    } catch (error) {
      console.error('Error updating area:', error)
      toast.error('Erro ao atualizar área')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta área?')) return

    try {
      setSaving(true)
      
      const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!auth_token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      const response = await fetch(`/api/interacoes/areas/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${auth_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao excluir área')
      }

      await response.json()
      
      toast.success('Área excluída com sucesso')
      loadAreas(contratoSelecionado)
      
    } catch (error) {
      console.error('Error deleting area:', error)
      toast.error('Erro ao excluir área')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (area: Area) => {
    setEditingId(area.id)
    setEditingArea(area.area)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingArea('')
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
            Configurações - Áreas
          </h1>
          <p className="text-gray-600 mt-2">
            Gerencie as áreas disponíveis no sistema
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

        {/* Lista de Áreas */}
        {contratoSelecionado && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Áreas</h2>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Área
                </button>
              </div>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Carregando áreas...</p>
                </div>
              ) : (
                <>
                  {/* Formulário de Adição */}
                  {showAddForm && (
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Plus className="w-4 h-4 text-blue-600" />
                        <h3 className="font-medium text-gray-900">Nova Área</h3>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newArea}
                          onChange={(e) => setNewArea(e.target.value)}
                          placeholder="Nome da área"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                        />
                        <button
                          onClick={handleAdd}
                          disabled={saving || !newArea.trim()}
                          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          Salvar
                        </button>
                        <button
                          onClick={() => {
                            setShowAddForm(false)
                            setNewArea('')
                          }}
                          className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Lista de Áreas */}
                  {areas.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Nenhuma área encontrada</p>
                      <p className="text-gray-400 text-sm">Adicione a primeira área para começar</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {areas.map((area) => (
                        <div key={area.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                          {editingId === area.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={editingArea}
                                onChange={(e) => setEditingArea(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onKeyPress={(e) => e.key === 'Enter' && handleEdit(area.id)}
                              />
                              <button
                                onClick={() => handleEdit(area.id)}
                                disabled={saving || !editingArea.trim()}
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
                                <span className="font-medium text-gray-900">{area.area}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => startEdit(area)}
                                  className="text-blue-600 hover:text-blue-800 p-1"
                                  title="Editar"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(area.id)}
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
    </MainLayout>
  )
}
