'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Settings } from 'lucide-react'
import { toast } from 'sonner'

interface Categoria {
  id: number
  categoria: string
  topico_categoria: string
  subcategorias?: Subcategoria[]
}

interface Subcategoria {
  id: number
  categoria_pai: number
  subcategoria: string
  topico_subcategoria: string
}

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

const Modal = ({ isOpen, children }: ModalProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        {children}
      </div>
    </div>
  )
}

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [modalCategoria, setModalCategoria] = useState(false)
  const [modalSubcategoria, setModalSubcategoria] = useState(false)
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null)
  const [subcategoriaEditando, setSubcategoriaEditando] = useState<Subcategoria | null>(null)

  const [formCategoria, setFormCategoria] = useState({
    categoria: '',
    topico_categoria: ''
  })

  const [formSubcategoria, setFormSubcategoria] = useState({
    subcategoria: '',
    topico_subcategoria: '',
    categoria_pai: 0
  })

  useEffect(() => {
    carregarCategorias()
  }, [])

  const carregarCategorias = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/oac/categorias')
      
      if (!response.ok) {
        throw new Error('Erro ao carregar categorias')
      }

      const data = await response.json()
      setCategorias(data)
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
      toast.error('Erro ao carregar categorias')
    } finally {
      setLoading(false)
    }
  }

  const salvarCategoria = async () => {
    try {
      const url = categoriaEditando 
        ? `/api/oac/categorias/${categoriaEditando.id}`
        : '/api/oac/categorias'
      
      const method = categoriaEditando ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formCategoria)
      })

      if (!response.ok) {
        throw new Error('Erro ao salvar categoria')
      }

      toast.success(categoriaEditando ? 'Categoria atualizada!' : 'Categoria criada!')
      fecharModalCategoria()
      carregarCategorias()
    } catch (error) {
      console.error('Erro ao salvar categoria:', error)
      toast.error('Erro ao salvar categoria')
    }
  }

  const salvarSubcategoria = async () => {
    try {
      const url = subcategoriaEditando 
        ? `/api/oac/subcategorias/${subcategoriaEditando.id}`
        : '/api/oac/subcategorias'
      
      const method = subcategoriaEditando ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formSubcategoria)
      })

      if (!response.ok) {
        throw new Error('Erro ao salvar subcategoria')
      }

      toast.success(subcategoriaEditando ? 'Subcategoria atualizada!' : 'Subcategoria criada!')
      fecharModalSubcategoria()
      carregarCategorias()
    } catch (error) {
      console.error('Erro ao salvar subcategoria:', error)
      toast.error('Erro ao salvar subcategoria')
    }
  }

  const excluirCategoria = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return

    try {
      const response = await fetch(`/api/oac/categorias/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Erro ao excluir categoria')
      }

      toast.success('Categoria excluída!')
      carregarCategorias()
    } catch (error) {
      console.error('Erro ao excluir categoria:', error)
      toast.error('Erro ao excluir categoria')
    }
  }

  const excluirSubcategoria = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta subcategoria?')) return

    try {
      const response = await fetch(`/api/oac/subcategorias/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Erro ao excluir subcategoria')
      }

      toast.success('Subcategoria excluída!')
      carregarCategorias()
    } catch (error) {
      console.error('Erro ao excluir subcategoria:', error)
      toast.error('Erro ao excluir subcategoria')
    }
  }

  const abrirModalCategoria = (categoria?: Categoria) => {
    if (categoria) {
      setCategoriaEditando(categoria)
      setFormCategoria({
        categoria: categoria.categoria,
        topico_categoria: categoria.topico_categoria
      })
    } else {
      setCategoriaEditando(null)
      setFormCategoria({
        categoria: '',
        topico_categoria: ''
      })
    }
    setModalCategoria(true)
  }

  const fecharModalCategoria = () => {
    setModalCategoria(false)
    setCategoriaEditando(null)
    setFormCategoria({
      categoria: '',
      topico_categoria: ''
    })
  }

  const abrirModalSubcategoria = (subcategoria?: Subcategoria, categoriaPai?: number) => {
    if (subcategoria) {
      setSubcategoriaEditando(subcategoria)
      setFormSubcategoria({
        subcategoria: subcategoria.subcategoria,
        topico_subcategoria: subcategoria.topico_subcategoria,
        categoria_pai: subcategoria.categoria_pai
      })
    } else {
      setSubcategoriaEditando(null)
      setFormSubcategoria({
        subcategoria: '',
        topico_subcategoria: '',
        categoria_pai: categoriaPai || 0
      })
    }
    setModalSubcategoria(true)
  }

  const fecharModalSubcategoria = () => {
    setModalSubcategoria(false)
    setSubcategoriaEditando(null)
    setFormSubcategoria({
      subcategoria: '',
      topico_subcategoria: '',
      categoria_pai: 0
    })
  }

  const SkeletonRow = () => (
    <tr>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </td>
      <td className="px-6 py-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </td>
    </tr>
  )

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Categorias OAC</h1>
            <p className="text-gray-600 dark:text-gray-400">Gerenciar categorias e subcategorias</p>
          </div>
          
          <button
            onClick={() => abrirModalCategoria()}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Categoria
          </button>
        </div>

        {/* Tabela de Categorias */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Tópico
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : categorias.length > 0 ? (
                categorias.map((categoria) => (
                  <React.Fragment key={categoria.id}>
                    {/* Linha da Categoria */}
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Settings className="h-4 w-4 text-blue-500 mr-2" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {categoria.categoria}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {categoria.topico_categoria}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => {
                              abrirModalSubcategoria(undefined, categoria.id)
                            }}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            title="Adicionar Subcategoria"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => abrirModalCategoria(categoria)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => excluirCategoria(categoria.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Linhas das Subcategorias */}
                    {categoria.subcategorias?.map((subcategoria) => (
                      <tr key={`sub-${subcategoria.id}`} className="bg-gray-50 dark:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center pl-8">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              ↳ {subcategoria.subcategoria}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {subcategoria.topico_subcategoria}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => abrirModalSubcategoria(subcategoria)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => excluirSubcategoria(subcategoria.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    Nenhuma categoria encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Categoria */}
        <Modal isOpen={modalCategoria} onClose={fecharModalCategoria}>
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {categoriaEditando ? 'Editar Categoria' : 'Nova Categoria'}
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nome da Categoria
              </label>
              <input
                type="text"
                value={formCategoria.categoria}
                onChange={(e) => setFormCategoria(prev => ({ ...prev, categoria: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Digite o nome da categoria"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tópico da Categoria
              </label>
              <input
                type="text"
                value={formCategoria.topico_categoria}
                onChange={(e) => setFormCategoria(prev => ({ ...prev, topico_categoria: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Digite o tópico da categoria"
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={fecharModalCategoria}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500"
              >
                Cancelar
              </button>
              <button
                onClick={salvarCategoria}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {categoriaEditando ? 'Atualizar' : 'Criar'}
              </button>
            </div>
          </div>
        </Modal>

        {/* Modal Subcategoria */}
        <Modal isOpen={modalSubcategoria} onClose={fecharModalSubcategoria}>
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {subcategoriaEditando ? 'Editar Subcategoria' : 'Nova Subcategoria'}
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Categoria Pai
              </label>
              <select
                value={formSubcategoria.categoria_pai}
                onChange={(e) => setFormSubcategoria(prev => ({ ...prev, categoria_pai: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value={0}>Selecione uma categoria</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.categoria}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nome da Subcategoria
              </label>
              <input
                type="text"
                value={formSubcategoria.subcategoria}
                onChange={(e) => setFormSubcategoria(prev => ({ ...prev, subcategoria: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Digite o nome da subcategoria"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tópico da Subcategoria
              </label>
              <input
                type="text"
                value={formSubcategoria.topico_subcategoria}
                onChange={(e) => setFormSubcategoria(prev => ({ ...prev, topico_subcategoria: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Digite o tópico da subcategoria"
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={fecharModalSubcategoria}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500"
              >
                Cancelar
              </button>
              <button
                onClick={salvarSubcategoria}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {subcategoriaEditando ? 'Atualizar' : 'Criar'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
  )
}
