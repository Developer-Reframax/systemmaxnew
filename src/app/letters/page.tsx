'use client'

import { useState, useEffect } from 'react'
import MainLayout from '@/components/Layout/MainLayout'
import { Plus, Search, Edit, Trash2, FileText, Calendar, Users } from 'lucide-react'
import { toast } from 'sonner'

interface LetterFormData {
  letra: string
  lider: number | ''
}

interface Letra {
  id: string
  letra: string
  codigo_contrato: string
  lider: number
  created_at: string
  usuario?: {
    nome: string
  }
}

interface Leader {
  matricula: number
  nome: string
}

export default function LettersPage() {
  const [letters, setLetters] = useState<Letra[]>([])
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingLetter, setEditingLetter] = useState<Letra | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState<LetterFormData>({
    letra: '',
    lider: ''
  })

  useEffect(() => {
    fetchLetters()
    fetchLeaders()
  }, [])

  const fetchLetters = async () => {
    try {
      setLoading(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      const response = await fetch('/api/letters', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar letras')
      }

      const data = await response.json()
      setLetters(data)
    } catch (error) {
      console.error('Erro ao buscar letras:', error)
      toast.error('Erro ao carregar letras')
    } finally {
      setLoading(false)
    }
  }

  const fetchLeaders = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      const response = await fetch('/api/letters/leaders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar líderes')
      }

      const data = await response.json()
      setLeaders(data)
    } catch (error) {
      console.error('Erro ao buscar líderes:', error)
      toast.error('Erro ao carregar líderes')
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

      if (editingLetter) {
        // Update letter
        const response = await fetch('/api/letters', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            id: editingLetter.id,
            letra: formData.letra,
            lider: formData.lider
          })
        })

        if (!response.ok) {
          throw new Error('Erro ao atualizar letra')
        }

        toast.success('Letra atualizada com sucesso!')
      } else {
        // Create new letter
        const response = await fetch('/api/letters', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            letra: formData.letra,
            lider: formData.lider
          })
        })

        if (!response.ok) {
          throw new Error('Erro ao criar letra')
        }

        toast.success('Letra criada com sucesso!')
      }

      setShowModal(false)
      setEditingLetter(null)
      resetForm()
      fetchLetters()
    } catch (error: unknown) {
      console.error('Erro ao salvar letra:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro ao salvar letra'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (letter: Letra) => {
    setEditingLetter(letter)
    setFormData({
      letra: letter.letra,
      lider: letter.lider
    })
    setShowModal(true)
  }

  const handleDelete = async (letterId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta letra?')) return

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      const response = await fetch(`/api/letters?id=${letterId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

      if (!response.ok) {
        throw new Error('Erro ao excluir letra')
      }

      toast.success('Letra excluída com sucesso!')
      fetchLetters()
    } catch (error: unknown) {
      console.error('Erro ao excluir letra:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro ao excluir letra'
      toast.error(errorMessage)
    }
  }

  const resetForm = () => {
    setFormData({
      letra: '',
      lider: ''
    })
  }

  const filteredLetters = letters.filter(letter => {
    return letter.letra.toLowerCase().includes(searchTerm.toLowerCase())
  })

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gerenciar Letras</h1>
          <button
            onClick={() => {
              setEditingLetter(null)
              resetForm()
              setShowModal(true)
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nova Letra
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar letras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Letters List */}
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredLetters.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Nenhuma letra encontrada
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Letra
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Líder
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
                  {filteredLetters.map((letter) => {
                    const leader = leaders.find(l => l.matricula === letter.lider);
                    return (
                      <tr key={letter.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {letter.letra}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>{leader ? leader.nome : `Matrícula ${letter.lider}`}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(letter.created_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleEdit(letter)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(letter.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {editingLetter ? 'Editar Letra' : 'Nova Letra'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Letra *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.letra}
                        onChange={(e) => setFormData({ ...formData, letra: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Ex: A, B, C"
                        style={{ textTransform: 'uppercase' }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Líder *
                      </label>
                      <select
                        required
                        value={formData.lider}
                        onChange={(e) => setFormData({ ...formData, lider: e.target.value === '' ? '' : Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Selecione um líder</option>
                        {leaders.map((leader) => (
                          <option key={leader.matricula} value={leader.matricula.toString()}>
                            {leader.nome} (Matrícula: {leader.matricula})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>



                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false)
                        setEditingLetter(null)
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
                      {loading ? 'Salvando...' : editingLetter ? 'Atualizar' : 'Criar'}
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
