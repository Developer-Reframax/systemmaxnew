'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import MainLayout from '@/components/Layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Plus,
  Save,
  Lightbulb,
  Target,
  Users,
  Tag,
  FileText,
  Trash2,
  Video
} from 'lucide-react'
import { toast } from 'sonner'

interface CatalogItem {
  id: number
  nome: string
}

interface TagItem {
  id: number
  nome: string
  cor?: string
}

interface FormData {
  titulo: string
  descricao_problema: string
  descricao: string
  objetivo: string
  data_implantacao?: string
  area_aplicada?: string
  pilar_id?: number
  elimina_desperdicio_id?: number
  categoria_id?: number
  resultados?: string
  fabricou_dispositivo?: boolean
  tags: number[]
  envolvidos: number[]
}

interface Usuario {
  matricula: number
  nome: string
  email?: string
  funcao?: string
}

interface EvidenciaItem {
  id: string
  is_video: boolean
  file?: File
  url?: string
  categoria: 'antes' | 'depois'
  descricao?: string
  previewUrl?: string
}

function NovaBoaPraticaPage() {
  const router = useRouter()
  useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Catalog data
  const [pilares, setPilares] = useState<CatalogItem[]>([])
  const [desperdicios, setDesperdicios] = useState<CatalogItem[]>([])
  const [categorias, setCategorias] = useState<CatalogItem[]>([])
  const [tagsCatalogo, setTagsCatalogo] = useState<TagItem[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [evidencias, setEvidencias] = useState<EvidenciaItem[]>([])

  // Form data
  const [formData, setFormData] = useState<FormData>({
    titulo: '',
    descricao_problema: '',
    descricao: '',
    objetivo: '',
    fabricou_dispositivo: false,
    tags: [],
    envolvidos: []
  })

  const [usuarioSearch, setUsuarioSearch] = useState('')
  const [tagSearch, setTagSearch] = useState('')
  const [newTagName, setNewTagName] = useState('')
  const [creatingTag, setCreatingTag] = useState(false)
  const [fabricouDispositivo, setFabricouDispositivo] = useState<boolean | null>(null)
  const [projetoFile, setProjetoFile] = useState<File | null>(null)
  const [evidenciaTipo, setEvidenciaTipo] = useState<'imagem' | 'video'>('imagem')
  const [evidenciaFile, setEvidenciaFile] = useState<File | null>(null)
  const [evidenciaUrl, setEvidenciaUrl] = useState('')
  const [evidenciaCategoria, setEvidenciaCategoria] = useState<'antes' | 'depois'>('antes')
  const [evidenciaDescricao, setEvidenciaDescricao] = useState('')

  useEffect(() => {
    const loadCatalogs = async () => {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const [pilaresRes, desperdiciosRes, categoriasRes, tagsRes] = await Promise.all([
          fetch('/api/boas-praticas/pilares', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/boas-praticas/elimina-desperdicio', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/boas-praticas/categorias', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/boas-praticas/tags-catalogo', { headers: { Authorization: `Bearer ${token}` } })
        ])

        if (pilaresRes.ok) setPilares((await pilaresRes.json()).data || [])
        if (desperdiciosRes.ok) setDesperdicios((await desperdiciosRes.json()).data || [])
        if (categoriasRes.ok) setCategorias((await categoriasRes.json()).data || [])
        if (tagsRes.ok) setTagsCatalogo((await tagsRes.json()).data || [])
      } catch {
        toast.error('Erro ao carregar dados dos catalogos')
      } finally {
        setLoading(false)
      }
    }

    loadCatalogs()
  }, [])

  useEffect(() => {
    const loadUsuarios = async () => {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      try {
        const res = await fetch('/api/usuarios', { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) {
          const data = await res.json()
          setUsuarios(data || [])
        }
      } catch {
        toast.error('Erro ao carregar usuarios')
      }
    }

    loadUsuarios()
  }, [])

  useEffect(() => {
    if (evidenciaTipo === 'imagem') {
      setEvidenciaUrl('')
    } else {
      setEvidenciaFile(null)
    }
  }, [evidenciaTipo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const token = localStorage.getItem('auth_token')
    if (!token) {
      setSaving(false)
      toast.error('Token de autenticacao nao encontrado')
      return
    }

    if (fabricouDispositivo === true && !projetoFile) {
      toast.error('Anexe o arquivo do projeto (obrigatorio quando a resposta for Sim)')
      setSaving(false)
      return
    }

    try {
      const res = await fetch('/api/boas-praticas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          fabricou_dispositivo: fabricouDispositivo === true,
          evidencias: undefined
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Erro ao salvar boa pratica')
      }

      const json = await res.json()
      const id = json.data?.id

      if (id) {
        if (fabricouDispositivo === true && projetoFile) {
          const uploadForm = new FormData()
          uploadForm.append('file', projetoFile)

          const uploadRes = await fetch(`/api/boas-praticas/${id}/projeto`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: uploadForm
          })

          if (!uploadRes.ok) {
            const err = await uploadRes.json().catch(() => null)
            throw new Error(err?.error || err?.message || 'Erro ao enviar projeto')
          }
        }

        if (evidencias.length > 0) {
          for (const ev of evidencias) {
            if (ev.is_video) {
              await fetch(`/api/boas-praticas/${id}/evidencias`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                  url: ev.url,
                  categoria: ev.categoria,
                  descricao: ev.descricao,
                  is_video: true
                })
              })
            } else if (ev.file) {
              const formDataUpload = new FormData()
              formDataUpload.append('file', ev.file)
              formDataUpload.append('categoria', ev.categoria)
              formDataUpload.append('descricao', ev.descricao || '')

              await fetch(`/api/boas-praticas/${id}/evidencias`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formDataUpload
              })
            }
          }
        }

        toast.success('Boa pratica criada com sucesso!')
        router.push(`/boas-praticas/${id}`)
      }
    } catch (_error) {
      toast.error(_error instanceof Error ? _error.message : 'Erro ao salvar boa pratica')
    } finally {
      setSaving(false)
    }
  }

  const removeEnvolvido = (matricula: number) => {
    setFormData(prev => ({
      ...prev,
      envolvidos: prev.envolvidos.filter(id => id !== matricula)
    }))
  }

  const removeTag = (tagId: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(id => id !== tagId)
    }))
  }

  const addTagFromList = (tagId: number) => {
    if (!formData.tags.includes(tagId)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagId]
      }))
    }
  }

  const addEnvolvidoFromList = (matricula: number) => {
    if (!formData.envolvidos.includes(matricula)) {
      setFormData(prev => ({
        ...prev,
        envolvidos: [...prev.envolvidos, matricula]
      }))
    }
  }

  const filteredUsuarios = usuarios.filter(usuario =>
    usuario.nome?.toLowerCase().includes(usuarioSearch.toLowerCase())
  )

  const getNomeCurto = (matricula: number) => {
    const usuario = usuarios.find(u => u.matricula === matricula)
    if (!usuario?.nome) return `Matricula ${matricula}`
    const partes = usuario.nome.trim().split(/\s+/)
    if (partes.length === 1) return partes[0]
    return `${partes[0]} ${partes[partes.length - 1]}`
  }

  const filteredTags = tagsCatalogo.filter(tag =>
    tag.nome?.toLowerCase().includes(tagSearch.toLowerCase())
  )

  const normalizeTagName = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return ''
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
  }

  const generateColorFromName = (name: string) => {
    const palette = ['#0ea5e9', '#f97316', '#22c55e', '#a855f7', '#ec4899', '#f59e0b', '#6366f1', '#14b8a6']
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % palette.length
    return palette[index]
  }

  const handleCreateTag = async () => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      toast.error('Token de autenticacao nao encontrado')
      return
    }

    const normalizedName = normalizeTagName(newTagName)
    if (!normalizedName) {
      toast.error('Informe um nome para a tag')
      return
    }

    setCreatingTag(true)
    try {
      const cor = generateColorFromName(normalizedName)
      const res = await fetch('/api/boas-praticas/tags-catalogo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ nome: normalizedName, cor })
      })

      if (!res.ok) {
        const error = await res.json().catch(() => null)
        const msg = error?.error || error?.message || 'Erro ao criar tag'
        throw new Error(msg)
      }

      const json = await res.json()
      const novaTag: TagItem | undefined = json.data

      if (novaTag) {
        setTagsCatalogo(prev => [...prev, novaTag])
        if (!formData.tags.includes(novaTag.id)) {
          setFormData(prev => ({ ...prev, tags: [...prev.tags, novaTag.id] }))
        }
        toast.success('Tag criada e adicionada')
        setNewTagName('')
      }
    } catch (_error) {
      toast.error(_error instanceof Error ? _error.message : 'Erro ao criar tag')
    } finally {
      setCreatingTag(false)
    }
  }

  const getTagDisplay = (tagId: number) => {
    const tag = tagsCatalogo.find(t => t.id === tagId)
    return tag?.nome || `Tag ${tagId}`
  }

  const getTagColor = (tagId: number) => {
    const tag = tagsCatalogo.find(t => t.id === tagId)
    return tag?.cor
  }

  const resetEvidenciaForm = () => {
    setEvidenciaFile(null)
    setEvidenciaUrl('')
    setEvidenciaCategoria('antes')
    setEvidenciaDescricao('')
    setEvidenciaTipo('imagem')
  }

  const addEvidencia = () => {
    if (evidenciaTipo === 'imagem') {
      if (!evidenciaFile) {
        toast.error('Selecione uma imagem')
        return
      }
      if (evidenciaFile.size > 5 * 1024 * 1024) {
        toast.error('Cada imagem deve ter no maximo 5MB')
        return
      }
    } else {
      if (!evidenciaUrl) {
        toast.error('Informe a URL do video')
        return
      }
    }

    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    setEvidencias(prev => [
      ...prev,
      {
        id,
        is_video: evidenciaTipo === 'video',
        file: evidenciaTipo === 'imagem' ? evidenciaFile ?? undefined : undefined,
        url: evidenciaTipo === 'video' ? evidenciaUrl : undefined,
        categoria: evidenciaCategoria,
        descricao: evidenciaDescricao,
        previewUrl: evidenciaTipo === 'imagem' && evidenciaFile ? URL.createObjectURL(evidenciaFile) : undefined
      }
    ])

    resetEvidenciaForm()
  }

  const removeEvidencia = (id: string) => {
    setEvidencias(prev => prev.filter(ev => ev.id !== id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/boas-praticas')}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Nova Boa Pratica</h1>
            <p className="text-gray-600">Cadastre uma nova melhoria ou boa pratica</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informacoes Basicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Informacoes Basicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Titulo *
                  </label>
                  <Input
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    placeholder="Titulo da boa pratica"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Implantacao
                  </label>
                  <Input
                    type="date"
                    value={formData.data_implantacao || ''}
                    onChange={(e) => setFormData({ ...formData, data_implantacao: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descricao do Problema *
                </label>
                <Textarea
                  value={formData.descricao_problema}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, descricao_problema: e.target.value })}
                  placeholder="Descreva o problema que esta boa pratica resolve"
                  rows={3}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descricao da Boa Pratica *
                </label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descreva detalhadamente a boa pratica"
                  rows={4}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Objetivo *
                </label>
                <Textarea
                  value={formData.objetivo}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, objetivo: e.target.value })}
                  placeholder="Qual o objetivo desta boa pratica?"
                  rows={2}
                  required
                />
              </div>
            </CardContent>
          </Card>

          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Contexto e Classificacao
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Area Aplicada
                  </label>
                  <Input
                    value={formData.area_aplicada || ''}
                    onChange={(e) => setFormData({ ...formData, area_aplicada: e.target.value })}
                    placeholder="Digite a area aplicada"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pilar
                  </label>
                  <select 
                    value={formData.pilar_id || ''} 
                    onChange={(e) => setFormData({ ...formData, pilar_id: Number(e.target.value) || undefined })}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">Selecione um pilar...</option>
                    {pilares.map((pilar) => (
                      <option key={pilar.id} value={pilar.id}>
                        {pilar.nome}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Elimina Desperdicio
                  </label>
                  <select 
                    value={formData.elimina_desperdicio_id || ''} 
                    onChange={(e) => setFormData({ ...formData, elimina_desperdicio_id: Number(e.target.value) || undefined })}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">Selecione uma opcao...</option>
                    {desperdicios.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nome}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria
                  </label>
                  <select 
                    value={formData.categoria_id || ''} 
                    onChange={(e) => setFormData({ ...formData, categoria_id: Number(e.target.value) || undefined })}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">Selecione uma categoria...</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Foi necessario fabricar algum dispositivo e/ou peças?
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={fabricouDispositivo === true ? 'default' : 'outline'}
                    onClick={() => {
                      setFabricouDispositivo(true)
                      setFormData(prev => ({ ...prev, fabricou_dispositivo: true }))
                    }}
                  >
                    Sim
                  </Button>
                  <Button
                    type="button"
                    variant={fabricouDispositivo === false ? 'default' : 'outline'}
                    onClick={() => {
                      setFabricouDispositivo(false)
                      setFormData(prev => ({ ...prev, fabricou_dispositivo: false }))
                      setProjetoFile(null)
                    }}
                  >
                    Nao
                  </Button>
                </div>

                {fabricouDispositivo === true && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Anexe o arquivo do projeto (imagem, pdf, word ou excel - max 50MB)
                    </label>
                    <Input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) {
                          setProjetoFile(null)
                          return
                        }
                        if (file.size > 50 * 1024 * 1024) {
                          toast.error('Arquivo deve ter no maximo 50MB')
                          e.target.value = ''
                          setProjetoFile(null)
                          return
                        }
                        setProjetoFile(file)
                      }}
                    />
                    {projetoFile && (
                      <p className="text-sm text-gray-600">Arquivo selecionado: {projetoFile.name}</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pessoas Envolvidas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Pessoas Envolvidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Buscar usuario por nome
                </label>
                <Input
                  placeholder="Digite para filtrar"
                  value={usuarioSearch}
                  onChange={(e) => setUsuarioSearch(e.target.value)}
                />
                <div className="max-h-64 overflow-auto border rounded-md divide-y">
                  {filteredUsuarios.map((usuario) => (
                    <div key={usuario.matricula} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium">{usuario.nome}</span>
                        <span className="text-gray-500">Matricula: {usuario.matricula}</span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={formData.envolvidos.includes(usuario.matricula) ? 'secondary' : 'outline'}
                        onClick={() => addEnvolvidoFromList(usuario.matricula)}
                        disabled={formData.envolvidos.includes(usuario.matricula)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        {formData.envolvidos.includes(usuario.matricula) ? 'Adicionado' : 'Adicionar'}
                      </Button>
                    </div>
                  ))}
                  {filteredUsuarios.length === 0 && (
                    <div className="px-3 py-4 text-sm text-gray-500">Nenhum usuario encontrado</div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {formData.envolvidos.map((matricula) => (
                  <Badge key={matricula} variant="secondary" className="flex items-center gap-1">
                    {getNomeCurto(matricula)}
                    <button
                      type="button"
                      onClick={() => removeEnvolvido(matricula)}
                      className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Evidencias */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Evidencias
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Tipo</label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={evidenciaTipo === 'imagem' ? 'default' : 'outline'}
                      onClick={() => setEvidenciaTipo('imagem')}
                    >
                      Imagem
                    </Button>
                    <Button
                      type="button"
                      variant={evidenciaTipo === 'video' ? 'default' : 'outline'}
                      onClick={() => setEvidenciaTipo('video')}
                    >
                      <Video className="w-4 h-4 mr-1" />
                      Video
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Categoria</label>
                  <select
                    value={evidenciaCategoria}
                    onChange={(e) => setEvidenciaCategoria(e.target.value as 'antes' | 'depois')}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="antes">Antes</option>
                    <option value="depois">Depois</option>
                  </select>
                </div>
              </div>

              {evidenciaTipo === 'imagem' ? (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Imagem (max 5MB)</label>
                  <Input
                    key="evidencia-imagem"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setEvidenciaFile(e.target.files?.[0] || null)}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">URL do video</label>
                  <Input
                    key="evidencia-video"
                    placeholder="https://"
                    value={evidenciaUrl}
                    onChange={(e) => setEvidenciaUrl(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Descricao</label>
                <Textarea
                  value={evidenciaDescricao}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEvidenciaDescricao(e.target.value)}
                  placeholder="Descricao da evidencia"
                  rows={2}
                />
              </div>

              <Button type="button" onClick={addEvidencia}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Evidencia
              </Button>

              {evidencias.length > 0 && (
                <div className="space-y-3">
                  {evidencias.map((ev) => (
                    <div key={ev.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                      <div className="flex items-center gap-3">
                        {!ev.is_video && ev.previewUrl && (
                          <img src={ev.previewUrl} alt="preview" className="w-16 h-16 object-cover rounded" />
                        )}
                        {ev.is_video && (
                          <div className="flex items-center gap-2 text-sm text-blue-600">
                            <Video className="w-4 h-4" />
                            <span>Video</span>
                          </div>
                        )}
                        <div className="flex flex-col text-sm">
                          <span className="font-medium capitalize">{ev.categoria}</span>
                          {ev.descricao && <span className="text-gray-600">{ev.descricao}</span>}
                          {ev.is_video && ev.url && (
                            <a href={ev.url} className="text-blue-600 underline" target="_blank" rel="noreferrer">
                              Abrir video
                            </a>
                          )}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => removeEvidencia(ev.id)}>
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resultados e Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Resultados e Tags
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resultados Alcancados
                </label>
                <Textarea
                  value={formData.resultados || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, resultados: e.target.value })}
                  placeholder="Descreva os resultados e beneficios alcancados"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <div className="space-y-2">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
                    <Input
                      placeholder="Nova tag (nome)"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                    />
                    <Button type="button" onClick={handleCreateTag} disabled={creatingTag}>
                      {creatingTag ? 'Criando...' : 'Cadastrar nova tag'}
                    </Button>
                  </div>

                  <Input
                    placeholder="Buscar tag pelo nome"
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                  />
                  <div className="max-h-64 overflow-auto border rounded-md divide-y">
                    {filteredTags.map((tag) => (
                      <div key={tag.id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full border"
                            style={{ backgroundColor: tag.cor || '#6b7280' }}
                          />
                          <span>{tag.nome}</span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={formData.tags.includes(tag.id) ? 'secondary' : 'outline'}
                          onClick={() => addTagFromList(tag.id)}
                          disabled={formData.tags.includes(tag.id)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          {formData.tags.includes(tag.id) ? 'Adicionada' : 'Adicionar'}
                        </Button>
                      </div>
                    ))}
                    {filteredTags.length === 0 && (
                      <div className="px-3 py-4 text-sm text-gray-500">Nenhuma tag encontrada</div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.tags.map((tagId) => {
                    const color = getTagColor(tagId)
                    return (
                      <Badge
                        key={tagId}
                        variant="outline"
                        className="flex items-center gap-1"
                        style={color ? { backgroundColor: color, color: '#fff', borderColor: color } : undefined}
                      >
                        <Tag className="w-3 h-3" />
                        {getTagDisplay(tagId)}
                        <button
                          type="button"
                          onClick={() => removeTag(tagId)}
                          className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                          style={color ? { backgroundColor: 'rgba(255,255,255,0.2)' } : undefined}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/boas-praticas')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Boa Pratica
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  )
}

export default NovaBoaPraticaPage
