'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import MainLayout from '@/components/Layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface ItemAvaliacao {
  id?: number
  item: string
  eliminatoria?: boolean
}

export default function ItensAvaliacaoPage() {
  useAuth()
  const router = useRouter()
  const [items, setItems] = useState<ItemAvaliacao[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [formItem, setFormItem] = useState('')
  const [formEliminatorio, setFormEliminatorio] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const token = localStorage.getItem('auth_token')
    if (!token) { setLoading(false); return }
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await fetch(`/api/boas-praticas/itens-avaliacao?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error()
      const json = await res.json()
      setItems(json.data || [])
    } catch {
      toast.error('Erro ao carregar itens')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    loadData()
  }, [loadData])

  const resetForm = () => {
    setFormItem('')
    setFormEliminatorio(false)
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('auth_token')
    if (!token) return toast.error('Sem token de autenticacao')
    if (!formItem.trim()) return toast.error('Informe o texto da pergunta')

    const method = editingId ? 'PUT' : 'POST'
    const url = editingId
      ? `/api/boas-praticas/itens-avaliacao/${editingId}`
      : '/api/boas-praticas/itens-avaliacao'

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ item: formItem.trim(), eliminatoria: formEliminatorio })
    })

    if (!res.ok) {
      const error = await res.json().catch(() => null)
      toast.error(error?.error || 'Erro ao salvar')
      return
    }

    toast.success('Item salvo com sucesso')
    resetForm()
    loadData()
  }

  const handleEdit = (item: ItemAvaliacao) => {
    setEditingId(item.id ?? null)
    setFormItem(item.item)
    setFormEliminatorio(Boolean(item.eliminatoria))
  }

  const handleDelete = async (id?: number) => {
    if (!id) return
    const token = localStorage.getItem('auth_token')
    if (!token) return toast.error('Sem token de autenticacao')
    if (!confirm('Deseja realmente excluir este item?')) return

    const res = await fetch(`/api/boas-praticas/itens-avaliacao/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) {
      const error = await res.json().catch(() => null)
      toast.error(error?.error || 'Erro ao excluir')
      return
    }
    toast.success('Item excluido')
    loadData()
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Itens de Avaliação</h1>
            <p className="text-gray-600">Cadastre perguntas que vão compor o questionário de avaliação.</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/boas-praticas')}>
            Voltar ao modulo
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Editar' : 'Cadastrar'} item</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col md:flex-row gap-3">
                <Input
                  placeholder="Digite a pergunta"
                  value={formItem}
                  onChange={(e) => setFormItem(e.target.value)}
                  className="flex-1"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="eliminatoria"
                    checked={formEliminatorio}
                    onChange={(e) => setFormEliminatorio(e.target.checked)}
                    className="h-4 w-4 border rounded"
                  />
                  <label htmlFor="eliminatoria" className="text-sm text-gray-700">
                    Item eliminatorio
                  </label>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">{editingId ? 'Atualizar' : 'Cadastrar'}</Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Itens cadastrados</CardTitle>
            <Input
              placeholder="Buscar por texto"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-gray-600">Carregando...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Eliminatorio</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.item}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={item.eliminatoria ? 'text-rose-700 border-rose-200' : 'text-slate-700'}>
                          {item.eliminatoria ? 'Sim' : 'Nao'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                          Editar
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>
                          Excluir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-gray-500">
                        Nenhum item encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
