'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Edit, Plus, Search, Trash2, Users } from 'lucide-react'

type ComiteTipo = 'local' | 'corporativo'

type Comite = {
  id: number
  nome: string
  descricao?: string | null
  tipo: ComiteTipo
  codigo_contrato?: string | null
  contrato_nome?: string | null
  membros: {
    matricula: number
    nome?: string | null
    email?: string | null
    contrato_raiz?: string | null
  }[]
  created_at?: string
}

type Contrato = {
  codigo: string
  nome?: string
}

type Usuario = {
  matricula: number
  nome?: string
  email?: string
  contrato_raiz?: string
}

type FormState = {
  nome: string
  descricao: string
  tipo: ComiteTipo
  codigo_contrato: string
  membros: number[]
}

const initialForm: FormState = {
  nome: '',
  descricao: '',
  tipo: 'local',
  codigo_contrato: '',
  membros: []
}

function ComitesPage() {
  useAuth()
  const router = useRouter()
  const [comites, setComites] = useState<Comite[]>([])
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(false)
  const [usuariosLoading, setUsuariosLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | ComiteTipo>('todos')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<FormState>(initialForm)
  const [membroSearch, setMembroSearch] = useState('')

  const loadComites = useCallback(async () => {
    setLoading(true)
    const token = localStorage.getItem('auth_token')
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const params = new URLSearchParams()
      if (searchTerm) params.set('search', searchTerm)
      if (tipoFiltro !== 'todos') params.set('tipo', tipoFiltro)

      const res = await fetch(`/api/boas-praticas/comites?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) {
        throw new Error('Erro ao carregar comites')
      }

      const json = await res.json()
      setComites(json.data || [])
    } catch (err) {
      console.error(err)
      toast.error('Nao foi possivel carregar os comites')
    } finally {
      setLoading(false)
    }
  }, [searchTerm, tipoFiltro])

  const loadContratos = useCallback(async () => {
    const token = localStorage.getItem('auth_token')
    if (!token) return
    try {
      const res = await fetch('/api/contracts', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) return
      const data = await res.json()
      setContratos(data.contracts || data.data || [])
    } catch {
      toast.error('Erro ao carregar contratos')
    }
  }, [])

  const loadUsuarios = useCallback(
    async (contrato?: string | null) => {
      const token = localStorage.getItem('auth_token')
      if (!token) return
      setUsuariosLoading(true)
      try {
        const params = new URLSearchParams()
        if (contrato) params.set('contrato', contrato)
        const res = await fetch(`/api/boas-praticas/comites/usuarios?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) throw new Error()
        const data = await res.json()
        setUsuarios(data.data || [])
      } catch {
        toast.error('Erro ao carregar usuarios')
      } finally {
        setUsuariosLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    loadComites()
  }, [loadComites])

  useEffect(() => {
    loadContratos()
  }, [loadContratos])

  useEffect(() => {
    if (!showForm) return
    if (formData.tipo === 'local' && !formData.codigo_contrato) {
      setUsuarios([])
      return
    }
    const contrato = formData.tipo === 'local' ? formData.codigo_contrato || null : null
    loadUsuarios(contrato)
  }, [formData.tipo, formData.codigo_contrato, loadUsuarios, showForm])

  const resetForm = () => {
    setFormData(initialForm)
    setEditingId(null)
    setMembroSearch('')
  }

  const toggleMember = (matricula: number, checked: boolean | string | undefined) => {
    setFormData((prev) => {
      const isChecked = checked === true
      if (isChecked) {
        if (prev.membros.includes(matricula)) return prev
        return { ...prev, membros: [...prev.membros, matricula] }
      }
      return { ...prev, membros: prev.membros.filter((m) => m !== matricula) }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('auth_token')
    if (!token) return toast.error('Token nao encontrado')

    if (!formData.nome.trim()) {
      return toast.error('Informe o nome do comite')
    }

    if (formData.tipo === 'local' && !formData.codigo_contrato) {
      return toast.error('Selecione o contrato do comite local')
    }

    if (formData.membros.length === 0) {
      return toast.error('Selecione pelo menos um membro')
    }

    const payload = {
      ...formData,
      codigo_contrato: formData.tipo === 'local' ? formData.codigo_contrato : null,
      membros: formData.membros
    }

    const method = editingId ? 'PUT' : 'POST'
    const url = editingId
      ? `/api/boas-praticas/comites/${editingId}`
      : '/api/boas-praticas/comites'

    try {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar comite')
      }

      toast.success(editingId ? 'Comite atualizado' : 'Comite criado')
      setShowForm(false)
      resetForm()
      loadComites()
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar comite')
    }
  }

  const handleEdit = (comite: Comite) => {
    setEditingId(comite.id)
    setFormData({
      nome: comite.nome,
      descricao: comite.descricao || '',
      tipo: comite.tipo,
      codigo_contrato: comite.codigo_contrato || '',
      membros: (comite.membros || []).map((m) => m.matricula)
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm('Deseja realmente excluir este comite?')
    if (!confirmed) return

    const token = localStorage.getItem('auth_token')
    if (!token) return toast.error('Token nao encontrado')

    try {
      const res = await fetch(`/api/boas-praticas/comites/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao excluir comite')
      }
      toast.success('Comite excluido')
      loadComites()
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir comite')
    }
  }

  const filteredUsuarios = useMemo(() => {
    if (!membroSearch) return usuarios
    const term = membroSearch.toLowerCase()
    return usuarios.filter(
      (u) =>
        (u.nome || '').toLowerCase().includes(term) ||
        String(u.matricula).includes(membroSearch) ||
        (u.contrato_raiz || '').toLowerCase().includes(term)
    )
  }, [usuarios, membroSearch])

  const selectedMembers = useMemo(
    () => usuarios.filter((u) => formData.membros.includes(u.matricula)),
    [usuarios, formData.membros]
  )

  return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/boas-praticas')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Comites</h1>
              <p className="text-gray-600">
                Gerencie comites locais e corporativos de boas praticas
              </p>
            </div>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo comite
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={loadComites} variant="secondary">
                  Filtrar
                </Button>
                <Button
                  variant={tipoFiltro === 'todos' ? 'default' : 'outline'}
                  onClick={() => setTipoFiltro('todos')}
                >
                  Todos
                </Button>
                <Button
                  variant={tipoFiltro === 'local' ? 'default' : 'outline'}
                  onClick={() => setTipoFiltro('local')}
                >
                  Locais
                </Button>
                <Button
                  variant={tipoFiltro === 'corporativo' ? 'default' : 'outline'}
                  onClick={() => setTipoFiltro('corporativo')}
                >
                  Corporativos
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? 'Editar comite' : 'Novo comite'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome *
                    </label>
                    <Input
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Digite o nome do comite"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descricao
                    </label>
                    <textarea
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      placeholder="Resumo do objetivo do comite"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={formData.tipo === 'local' ? 'default' : 'outline'}
                          onClick={() => setFormData({ ...formData, tipo: 'local', codigo_contrato: '' })}
                        >
                          Local
                        </Button>
                        <Button
                          type="button"
                          variant={formData.tipo === 'corporativo' ? 'default' : 'outline'}
                          onClick={() => setFormData({ ...formData, tipo: 'corporativo', codigo_contrato: '' })}
                        >
                          Corporativo
                        </Button>
                      </div>
                    </div>
                    {formData.tipo === 'local' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contrato *
                        </label>
                        <select
                          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={formData.codigo_contrato}
                          onChange={(e) =>
                            setFormData({ ...formData, codigo_contrato: e.target.value })
                          }
                        >
                          <option value="">Selecione um contrato</option>
                          {contratos.map((c) => (
                            <option key={c.codigo} value={c.codigo}>
                              {c.codigo} - {c.nome}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Membros *</p>
                      <p className="text-xs text-gray-500">
                        {formData.tipo === 'local'
                          ? 'Somente usuarios do contrato selecionado.'
                          : 'Usuarios de qualquer contrato.'}
                      </p>
                    </div>
                    <Users className="w-4 h-4 text-gray-500" />
                  </div>
                  <Input
                    placeholder="Filtrar membros..."
                    value={membroSearch}
                    onChange={(e) => setMembroSearch(e.target.value)}
                  />
                  <div className="border rounded-md max-h-64 overflow-auto">
                    {usuariosLoading ? (
                      <div className="p-4 text-sm text-gray-500">Carregando usuarios...</div>
                    ) : filteredUsuarios.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500">
                        Nenhum usuario encontrado para o filtro atual.
                      </div>
                    ) : (
                      filteredUsuarios.map((user) => (
                        <label
                          key={user.matricula}
                          className="flex items-center justify-between px-3 py-2 hover:bg-gray-50"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-800">{user.nome}</p>
                            <p className="text-xs text-gray-500">
                              {user.matricula} • {user.contrato_raiz || 'Sem contrato'}
                            </p>
                          </div>
                          <Checkbox
                            checked={formData.membros.includes(user.matricula)}
                            onCheckedChange={(checked) => toggleMember(user.matricula, checked)}
                          />
                        </label>
                      ))
                    )}
                  </div>
                  {selectedMembers.length > 0 && (
                    <div className="text-xs text-gray-600">
                      Selecionados: {selectedMembers.length}{' '}
                      {selectedMembers.slice(0, 3).map((m) => m.nome || m.matricula).join(', ')}
                      {selectedMembers.length > 3 ? '...' : ''}
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowForm(false)
                        resetForm()
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      {editingId ? 'Atualizar' : 'Criar comite'}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Comites cadastrados</CardTitle>
            <span className="text-sm text-gray-500">
              {loading ? 'Carregando...' : `${comites.length} registros`}
            </span>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Membros</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comites.map((comite) => (
                  <TableRow key={comite.id}>
                    <TableCell>
                      <div className="font-medium">{comite.nome}</div>
                      {comite.descricao && (
                        <div className="text-xs text-gray-500">{comite.descricao}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={comite.tipo === 'local' ? 'default' : 'secondary'}>
                        {comite.tipo === 'local' ? 'Local' : 'Corporativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {comite.tipo === 'local' ? (
                        <div className="text-sm text-gray-800">
                          {comite.codigo_contrato || '-'}
                          {comite.contrato_nome ? ` - ${comite.contrato_nome}` : ''}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-600">Corporativo</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-800">
                        {(comite.membros || []).slice(0, 3).map((m) => m.nome || m.matricula).join(', ')}
                        {comite.membros.length > 3 && ' ...'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {comite.membros.length} membro(s)
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(comite)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(comite.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {comites.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500">
                      {loading ? 'Carregando...' : 'Nenhum comite encontrado'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
  )
}

export default ComitesPage
