'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/Layout/MainLayout'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectItem } from '@/components/ui/select'
import { toast } from 'sonner'
import { BookOpen, Search, Tag, Filter, Sparkles, Eye } from 'lucide-react'

interface TagOption {
  id: number
  nome: string
  cor?: string
}

interface CatalogoOption {
  id: number
  nome: string
}

interface BoaPraticaResumo {
  id: string
  titulo: string
  descricao?: string
  descricao_problema?: string
  status: string
  created_at?: string
  relevancia?: number | null
  pilar?: number | null
  categoria?: number | null
  elimina_desperdicio?: number | null
  tags?: number[]
  autor_nome?: string | null
  visualizacoes?: number | null
  likes?: number | null
}

export default function BookBoasPraticasPage() {
  useAuth()
  const router = useRouter()

  const [items, setItems] = useState<BoaPraticaResumo[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [tag, setTag] = useState<string | undefined>()
  const [pilar, setPilar] = useState<string | undefined>()
  const [categoria, setCategoria] = useState<string | undefined>()
  const [elimina, setElimina] = useState<string | undefined>()

  const [tagsCatalogo, setTagsCatalogo] = useState<TagOption[]>([])
  const [pilares, setPilares] = useState<CatalogoOption[]>([])
  const [categorias, setCategorias] = useState<CatalogoOption[]>([])
  const [eliminaCatalogo, setEliminaCatalogo] = useState<CatalogoOption[]>([])

  const tagMap = useMemo(() => new Map(tagsCatalogo.map((t) => [t.id, t])), [tagsCatalogo])

  useEffect(() => {
    const loadCatalogos = async () => {
      const token = localStorage.getItem('auth_token')
      if (!token) return
      const headers = { Authorization: `Bearer ${token}` }
      try {
        const [tagsRes, pilaresRes, categoriasRes, eliminaRes] = await Promise.all([
          fetch('/api/boas-praticas/tags-catalogo', { headers }),
          fetch('/api/boas-praticas/pilares', { headers }),
          fetch('/api/boas-praticas/categorias', { headers }),
          fetch('/api/boas-praticas/elimina-desperdicio', { headers })
        ])
        if (tagsRes.ok) {
          const data = await tagsRes.json()
          setTagsCatalogo(data.data || [])
        }
        if (pilaresRes.ok) {
          const data = await pilaresRes.json()
          setPilares(data.data || [])
        }
        if (categoriasRes.ok) {
          const data = await categoriasRes.json()
          setCategorias(data.data || [])
        }
        if (eliminaRes.ok) {
          const data = await eliminaRes.json()
          setEliminaCatalogo(data.data || [])
        }
      } catch {
        toast.error('Erro ao carregar filtros do book')
      }
    }
    loadCatalogos()
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setLoading(false)
        return
      }
      const headers = { Authorization: `Bearer ${token}` }
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (tag) params.set('tag', tag)
      if (pilar) params.set('pilar', pilar)
      if (categoria) params.set('categoria', categoria)
      if (elimina) params.set('elimina', elimina)
      try {
        const res = await fetch(`/api/boas-praticas/book?${params.toString()}`, { headers })
        if (!res.ok) throw new Error()
        const json = await res.json()
        setItems(json.data || [])
      } catch {
        toast.error('Erro ao carregar book')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [search, tag, pilar, categoria, elimina])

  const resumo = useMemo(() => ({
    total: items.length,
    totalLikes: items.reduce((acc, item) => acc + (item.likes || 0), 0),
    totalViews: items.reduce((acc, item) => acc + (item.visualizacoes || 0), 0)
  }), [items])

  const handleOpenPratica = async (id: string) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      try {
        await fetch(`/api/boas-praticas/book/${id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ action: 'view' })
        })
        setItems((prev) =>
          prev.map((p) => (p.id === id ? { ...p, visualizacoes: (p.visualizacoes || 0) + 1 } : p))
        )
      } catch {
        // silencioso
      }
    }
    router.push(`/boas-praticas/book/${id}`)
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <BookOpen className="w-10 h-10 text-indigo-50 bg-gradient-to-br from-indigo-500 to-purple-500 p-2 rounded-lg shadow" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Book de Boas Praticas</h1>
              <p className="text-gray-600">Explore boas praticas validadas, busque por palavras e filtros.</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => router.push('/boas-praticas')}>
            Voltar ao modulo
          </Button>
        </div>

        <Card className="bg-gradient-to-r from-indigo-50 via-white to-cyan-50 border-0 shadow-sm">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-lg text-gray-900">Filtros do book</CardTitle>
            </div>
            <div className="flex flex-col md:flex-row gap-3 md:items-center w-full md:w-auto">
              <div className="flex items-center gap-2 bg-white rounded-md border px-3 py-2 shadow-sm">
                <Search className="w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Buscar por titulo, problema ou descricao"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64 border-0 focus-visible:ring-0"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select
                  value={tag || ''}
                  onChange={(e) => setTag(e.target.value ? e.target.value : undefined)}
                  className="w-48"
                >
                  <SelectItem value="">Todas as tags</SelectItem>
                  {tagsCatalogo.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.nome}
                    </SelectItem>
                  ))}
                </Select>
                <Select
                  value={pilar || ''}
                  onChange={(e) => setPilar(e.target.value ? e.target.value : undefined)}
                  className="w-48"
                >
                  <SelectItem value="">Todos os pilares</SelectItem>
                  {pilares.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </Select>
                <Select
                  value={categoria || ''}
                  onChange={(e) => setCategoria(e.target.value ? e.target.value : undefined)}
                  className="w-48"
                >
                  <SelectItem value="">Todas as categorias</SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </Select>
                <Select
                  value={elimina || ''}
                  onChange={(e) => setElimina(e.target.value ? e.target.value : undefined)}
                  className="w-48"
                >
                  <SelectItem value="">Elimina desperdicio</SelectItem>
                  {eliminaCatalogo.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.nome}
                    </SelectItem>
                  ))}
                </Select>
                <Button
                  variant="outline"
                  onClick={() => { setSearch(''); setTag(undefined); setPilar(undefined); setCategoria(undefined); setElimina(undefined) }}
                >
                  Limpar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4 text-sm text-gray-700">
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-white shadow-sm">
              <BookOpen className="w-4 h-4 text-indigo-600" /> Total: <strong>{resumo.total}</strong>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-white shadow-sm">
              <Sparkles className="w-4 h-4 text-pink-500" /> Likes: <strong>{resumo.totalLikes}</strong>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-white shadow-sm">
              <Eye className="w-4 h-4 text-blue-500" /> Visualizacoes: <strong>{resumo.totalViews}</strong>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center text-gray-500 py-10">Carregando...</div>
          ) : (
            items.map((item) => (
              <Card
                key={item.id}
                className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col"
                onClick={() => handleOpenPratica(item.id)}
              >
                <CardHeader className="space-y-1">
                  <CardTitle className="text-lg font-semibold text-gray-900">{item.titulo}</CardTitle>
                  <p className="text-sm text-gray-600 line-clamp-2">{item.descricao || item.descricao_problema}</p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                    {item.tags?.slice(0, 4).map((t) => {
                      const info = tagMap.get(t)
                      return (
                        <Badge
                          key={t}
                          variant="outline"
                          className="flex items-center gap-1"
                          style={info?.cor ? { backgroundColor: info.cor, color: '#fff', borderColor: info.cor } : undefined}
                        >
                          <Tag className="w-3 h-3" />
                          {info?.nome || `#${t}`}
                        </Badge>
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>{item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : '-'}</span>
                    <div className="flex gap-2">
                      <Badge variant="outline">Views: {item.visualizacoes ?? 0}</Badge>
                      <Badge variant="outline">Likes: {item.likes ?? 0}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          {!loading && items.length === 0 && (
            <div className="col-span-full text-center text-gray-500 py-10">
              Nenhuma boa pratica encontrada para os filtros selecionados.
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
