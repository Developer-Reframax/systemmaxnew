'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'

interface Contrato {
  codigo: string
  nome: string
}

interface Usuario {
  matricula: number
  nome: string
}

interface ResponsavelContrato {
  id?: number
  codigo_contrato: string
  responsavel_sesmt: number
  responsavel_gestor: number
}

type DropdownOption = { value: string | number; label: string }

type DropdownProps<T> = {
  label: string
  open: boolean
  setOpen: (v: boolean) => void
  searchValue: string
  setSearchValue: (v: string) => void
  items: T[]
  renderOption: (item: T) => DropdownOption
  onSelect: (value: string | number) => void
  placeholder: string
}

function Dropdown<T>({
  label,
  open,
  setOpen,
  searchValue,
  setSearchValue,
  items,
  renderOption,
  onSelect,
  placeholder
}: DropdownProps<T>) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <span>{label}</span>
        <span className="text-xs text-gray-500">▼</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-md border bg-white shadow-md">
          <div className="p-2">
            <Input
              autoFocus
              placeholder={placeholder}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
          <div className="max-h-48 overflow-auto">
            {items.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-500">Nenhum item encontrado</div>
            )}
            {items.map((item) => {
              const opt = renderOption(item)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onSelect(opt.value)
                    setOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ResponsaveisContratosPage() {
  useAuth()
  const router = useRouter()
  const [items, setItems] = useState<ResponsavelContrato[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [contratoSearch, setContratoSearch] = useState('')
  const [usuarioSesmtSearch, setUsuarioSesmtSearch] = useState('')
  const [usuarioGestorSearch, setUsuarioGestorSearch] = useState('')
  const [openContrato, setOpenContrato] = useState(false)
  const [openSesmt, setOpenSesmt] = useState(false)
  const [openGestor, setOpenGestor] = useState(false)
  const [form, setForm] = useState<ResponsavelContrato>({
    codigo_contrato: '',
    responsavel_sesmt: 0,
    responsavel_gestor: 0
  })
  const [editingId, setEditingId] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await fetch(`/api/boas-praticas/responsaveis-contratos?${params.toString()}`, {
        method:'GET'
      })
      if (!res.ok) throw new Error()
      const json = await res.json()
      setItems(json.data || [])
    } catch {
      toast.error('Erro ao carregar registros')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const [contratosRes, usuariosRes] = await Promise.all([
          fetch('/api/contracts', { method:'GET' }),
          fetch('/api/usuarios', { method:'GET' })
        ])
        if (contratosRes.ok) {
          const data = await contratosRes.json()
          setContratos(data.contracts || data.data || [])
        }
        if (usuariosRes.ok) {
          const users = await usuariosRes.json()
          setUsuarios(Array.isArray(users) ? users : users.data || [])
        }
      } catch {
        toast.error('Erro ao carregar contratos/usuarios')
      }
    }
    loadCatalogs()
  }, [])

  const filteredContratos = contratos.filter((c) =>
    c.codigo?.toLowerCase().includes(contratoSearch.toLowerCase()) ||
    (c.nome || '').toLowerCase().includes(contratoSearch.toLowerCase())
  )

  const filteredUsuariosSesmt = usuarios.filter((u) =>
    (u.nome || '').toLowerCase().includes(usuarioSesmtSearch.toLowerCase()) ||
    String(u.matricula).includes(usuarioSesmtSearch)
  )

  const filteredUsuariosGestor = usuarios.filter((u) =>
    (u.nome || '').toLowerCase().includes(usuarioGestorSearch.toLowerCase()) ||
    String(u.matricula).includes(usuarioGestorSearch)
  )

  const getContratoDisplay = (codigo: string) => {
    const contrato = contratos.find((c) => c.codigo === codigo)
    if (!contrato) return codigo
    return `${contrato.codigo} - ${contrato.nome}`
  }

  const nomeCurto = (nome?: string) => {
    if (!nome) return ''
    const partes = nome.trim().split(/\s+/)
    if (partes.length === 1) return partes[0]
    return `${partes[0]} ${partes[partes.length - 1]}`
  }

  const getUsuarioDisplay = (matricula: number) => {
    const usuario = usuarios.find((u) => u.matricula === matricula)
    if (!usuario) return String(matricula)
    return `${usuario.matricula} - ${nomeCurto(usuario.nome)}`
  }

  const resetForm = () => {
    setForm({ codigo_contrato: '', responsavel_sesmt: 0, responsavel_gestor: 0 })
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.codigo_contrato || !form.responsavel_sesmt || !form.responsavel_gestor) {
      toast.error('Preencha todos os campos')
      return
    }

    const method = editingId ? 'PUT' : 'POST'
    const url = editingId
      ? `/api/boas-praticas/responsaveis-contratos/${editingId}`
      : '/api/boas-praticas/responsaveis-contratos'

    const res = await fetch(url, {
      method,
      body: JSON.stringify(form)
    })

    if (!res.ok) {
      const error = await res.json().catch(() => null)
      toast.error(error?.error || 'Erro ao salvar')
      return
    }

    toast.success('Registro salvo com sucesso')
    resetForm()
    loadData()
  }

  const handleEdit = (item: ResponsavelContrato) => {
    setEditingId(item.id || null)
    setForm({
      codigo_contrato: item.codigo_contrato,
      responsavel_sesmt: item.responsavel_sesmt,
      responsavel_gestor: item.responsavel_gestor
    })
  }

  const handleDelete = async (id?: number) => {
    if (!id) return
    if (!confirm('Deseja realmente excluir este registro?')) return

    const res = await fetch(`/api/boas-praticas/responsaveis-contratos/${id}`, {
      method: 'DELETE'
    })
    if (!res.ok) {
      const error = await res.json().catch(() => null)
      toast.error(error?.error || 'Erro ao excluir')
      return
    }
    toast.success('Registro excluido')
    loadData()
  }

  return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Responsaveis por Contrato</h1>
            <p className="text-gray-600">Configure responsavel SESMT e Gestor por contrato</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/boas-praticas')}>
            Voltar ao modulo
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Editar' : 'Cadastrar'} responsavel</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-1 space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Contrato</label>
                <Dropdown
                  label={form.codigo_contrato ? `${form.codigo_contrato}` : 'Selecione um contrato'}
                  open={openContrato}
                  setOpen={setOpenContrato}
                  searchValue={contratoSearch}
                  setSearchValue={setContratoSearch}
                  items={filteredContratos}
                  renderOption={(c) => ({ value: c.codigo, label: `${c.codigo} - ${c.nome}` })}
                  onSelect={(value) => setForm({ ...form, codigo_contrato: String(value) })}
                  placeholder="Filtrar por codigo ou nome"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Responsavel SESMT</label>
                <Dropdown
                  label={form.responsavel_sesmt ? `${form.responsavel_sesmt}` : 'Selecione'}
                  open={openSesmt}
                  setOpen={setOpenSesmt}
                  searchValue={usuarioSesmtSearch}
                  setSearchValue={setUsuarioSesmtSearch}
                  items={filteredUsuariosSesmt}
                  renderOption={(u) => ({ value: u.matricula, label: `${u.matricula} - ${nomeCurto(u.nome)}` })}
                  onSelect={(value) => setForm({ ...form, responsavel_sesmt: Number(value) })}
                  placeholder="Filtrar por nome ou matricula"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Responsavel Gestor</label>
                <Dropdown
                  label={form.responsavel_gestor ? `${form.responsavel_gestor}` : 'Selecione'}
                  open={openGestor}
                  setOpen={setOpenGestor}
                  searchValue={usuarioGestorSearch}
                  setSearchValue={setUsuarioGestorSearch}
                  items={filteredUsuariosGestor}
                  renderOption={(u) => ({ value: u.matricula, label: `${u.matricula} - ${nomeCurto(u.nome)}` })}
                  onSelect={(value) => setForm({ ...form, responsavel_gestor: Number(value) })}
                  placeholder="Filtrar por nome ou matricula"
                />
              </div>
              <div className="flex items-end gap-2">
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
            <CardTitle>Responsaveis cadastrados</CardTitle>
            <Input
              placeholder="Buscar por contrato"
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
                    <TableHead>Contrato</TableHead>
                    <TableHead>Resp. SESMT</TableHead>
                    <TableHead>Resp. Gestor</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{getContratoDisplay(item.codigo_contrato)}</TableCell>
                      <TableCell>{getUsuarioDisplay(item.responsavel_sesmt)}</TableCell>
                      <TableCell>{getUsuarioDisplay(item.responsavel_gestor)}</TableCell>
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
                      <TableCell colSpan={4} className="text-center text-gray-500">
                        Nenhum registro encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
  )
}
