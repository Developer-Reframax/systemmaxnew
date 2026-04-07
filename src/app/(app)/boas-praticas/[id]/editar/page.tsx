'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Save,
  Lightbulb,
  Target,
  FileText,
  Plus,
  Users,
  Tag,
  Trash2,
  Video
} from 'lucide-react'
import { toast } from 'sonner'

interface Usuario {
  matricula: number
  nome: string
  email?: string
  funcao?: string
}

interface CatalogItem {
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
  projeto?: string | null
  tags: number[]
  envolvidos: number[]
}

interface EvidenciaExistente {
  id: string
  url: string
  categoria: 'antes' | 'depois'
  descricao?: string
  is_video: boolean
  nome_arquivo?: string
}

interface NovaEvidenciaItem {
  id: string
  is_video: boolean
  file?: File
  url?: string
  categoria: 'antes' | 'depois'
  descricao?: string
  previewUrl?: string
}

const ALLOWED_EVIDENCIA_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

function EditarBoaPraticaPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  useAuth()
  const praticaId = params?.id ?? null

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Catalog data
  const [pilares, setPilares] = useState<CatalogItem[]>([])
  const [desperdicios, setDesperdicios] = useState<CatalogItem[]>([])
  const [categorias, setCategorias] = useState<CatalogItem[]>([])
  const [tagsCatalogo, setTagsCatalogo] = useState<CatalogItem[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])

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

  const [tagSearch, setTagSearch] = useState('')
  const [newTagName, setNewTagName] = useState('')
  const [creatingTag, setCreatingTag] = useState(false)
  const [usuarioSearch, setUsuarioSearch] = useState('')
  const [fabricouDispositivo, setFabricouDispositivo] = useState<boolean | null>(null)
  const [projetoFile, setProjetoFile] = useState<File | null>(null)
  const [projetoUrl, setProjetoUrl] = useState<string | null>(null)
  const [evidenciasExistentes, setEvidenciasExistentes] = useState<EvidenciaExistente[]>([])
  const [evidenciasParaExcluir, setEvidenciasParaExcluir] = useState<string[]>([])
  const [novasEvidencias, setNovasEvidencias] = useState<NovaEvidenciaItem[]>([])
  const [evidenciaTipo, setEvidenciaTipo] = useState<'imagem' | 'video'>('imagem')
  const [evidenciaFile, setEvidenciaFile] = useState<File | null>(null)
  const [evidenciaUrl, setEvidenciaUrl] = useState('')
  const [evidenciaCategoria, setEvidenciaCategoria] = useState<'antes' | 'depois'>('antes')
  const [evidenciaDescricao, setEvidenciaDescricao] = useState('')

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      if (!praticaId) {
        setLoading(false)
        return
      }

      try {
        const [boaPraticaRes, pilaresRes, desperdiciosRes, categoriasRes, tagsRes, usuariosRes] = await Promise.all([
          fetch(`/api/boas-praticas/${praticaId}`, { method:'GET' }),
          fetch('/api/boas-praticas/pilares', { method:'GET' }),
          fetch('/api/boas-praticas/elimina-desperdicio', { method:'GET' }),
          fetch('/api/boas-praticas/categorias', { method:'GET' }),
          fetch('/api/boas-praticas/tags-catalogo', { method:'GET' }),
          fetch('/api/usuarios', { method:'GET' })
        ])

        if (boaPraticaRes.ok) {
          const boaPraticaData = await boaPraticaRes.json()
          const data = boaPraticaData.data
          const selectedTags = data.tags_detalhes?.map((t: { id: number }) => t.id) || []
          const areaAplicadaTexto = data.area_aplicada ?? data.area_aplicada_nome ?? ''
          setFabricouDispositivo(!!data.fabricou_dispositivo)
          setProjetoUrl(data.projeto || null)
          setEvidenciasExistentes(
            Array.isArray(data.evidencias)
              ? data.evidencias.map((e: {
                  id: string
                  url: string
                  categoria?: 'antes' | 'depois'
                  descricao?: string
                  is_video?: boolean
                  nome_arquivo?: string
                }) => ({
                  id: e.id,
                  url: e.url,
                  categoria: e.categoria || 'antes',
                  descricao: e.descricao || '',
                  is_video: !!e.is_video,
                  nome_arquivo: e.nome_arquivo
                }))
              : []
          )
          setEvidenciasParaExcluir([])
          setNovasEvidencias([])
          setFormData({
            titulo: data.titulo || '',
            descricao_problema: data.descricao_problema || '',
            descricao: data.descricao || '',
            objetivo: data.objetivo || '',
            data_implantacao: data.data_implantacao || '',
            area_aplicada: areaAplicadaTexto,
            pilar_id: data.pilar || data.pilar_id || undefined,
            elimina_desperdicio_id: data.elimina_desperdicio || data.elimina_desperdicio_id || undefined,
            categoria_id: data.categoria || data.categoria_id || undefined,
            resultados: data.resultados || '',
            fabricou_dispositivo: !!data.fabricou_dispositivo,
            projeto: data.projeto || null,
            tags: selectedTags,
            envolvidos: data.envolvidos?.map((e: { matricula_envolvido: number }) => e.matricula_envolvido) || []
          })
        }

        if (pilaresRes.ok) setPilares((await pilaresRes.json()).data || [])
        if (desperdiciosRes.ok) setDesperdicios((await desperdiciosRes.json()).data || [])
        if (categoriasRes.ok) setCategorias((await categoriasRes.json()).data || [])
        if (tagsRes.ok) setTagsCatalogo((await tagsRes.json()).data || [])
        if (usuariosRes.ok) {
          const usuariosData = await usuariosRes.json().catch(() => null)
          if (Array.isArray(usuariosData)) setUsuarios(usuariosData)
        }
      } catch {
        toast.error('Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [praticaId])

  useEffect(() => {
    if (evidenciaTipo === 'imagem') {
      setEvidenciaUrl('')
    } else {
      setEvidenciaFile(null)
    }
  }, [evidenciaTipo])

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
      if (evidenciaFile.size > 10 * 1024 * 1024) {
        toast.error('Cada imagem deve ter no maximo 10MB')
        return
      }
      if (!ALLOWED_EVIDENCIA_MIME_TYPES.includes(evidenciaFile.type)) {
        toast.error('Formato nao suportado. Use JPEG, PNG, GIF ou WEBP')
        return
      }
    } else if (!evidenciaUrl) {
      toast.error('Informe a URL do video')
      return
    }

    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    setNovasEvidencias((prev) => [
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

  const marcarExclusaoEvidenciaExistente = (id: string) => {
    setEvidenciasParaExcluir((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  const restaurarEvidenciaExistente = (id: string) => {
    setEvidenciasParaExcluir((prev) => prev.filter((item) => item !== id))
  }

  const removerNovaEvidencia = (id: string) => {
    setNovasEvidencias((prev) => prev.filter((ev) => ev.id !== id))
  }

  const evidenciaMarcadaParaExclusao = (id: string) => evidenciasParaExcluir.includes(id)

  const getEvidenciaTitulo = (evidencia: { nome_arquivo?: string; url?: string; is_video: boolean }) => {
    if (evidencia.is_video) return 'Video'
    return evidencia.nome_arquivo || evidencia.url?.split('/').pop() || 'evidencia'
  }

  const uploadNovasEvidencias = async () => {
    if (!praticaId) {
      throw new Error('ID da boa pratica nao encontrado')
    }

    for (const ev of novasEvidencias) {
      if (ev.is_video) {
        const response = await fetch(`/api/boas-praticas/${praticaId}/evidencias`, {
          method: 'POST',
          body: JSON.stringify({
            url: ev.url,
            categoria: ev.categoria,
            descricao: ev.descricao,
            is_video: true
          })
        })

        if (!response.ok) {
          const err = await response.json().catch(() => null)
          throw new Error(err?.error || err?.message || 'Erro ao enviar evidencia de video')
        }
      } else if (ev.file) {
        const formDataUpload = new FormData()
        formDataUpload.append('file', ev.file)
        formDataUpload.append('categoria', ev.categoria)
        formDataUpload.append('descricao', ev.descricao || '')

        const response = await fetch(`/api/boas-praticas/${praticaId}/evidencias`, {
          method: 'POST',
          body: formDataUpload
        })

        if (!response.ok) {
          const err = await response.json().catch(() => null)
          throw new Error(err?.error || err?.message || 'Erro ao enviar evidencia')
        }
      }
    }
  }

  const excluirEvidenciasMarcadas = async () => {
    if (!praticaId) {
      throw new Error('ID da boa pratica nao encontrado')
    }

    for (const evidenciaId of evidenciasParaExcluir) {
      const response = await fetch(`/api/boas-praticas/${praticaId}/evidencias/${evidenciaId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(err?.error || err?.message || 'Erro ao excluir evidencia')
      }
    }
  }

  const filteredTags = tagsCatalogo.filter(tag =>
    tag.nome?.toLowerCase().includes(tagSearch.toLowerCase())
  )

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
        body: JSON.stringify({ nome: normalizedName, cor })
      })

      if (!res.ok) {
        const error = await res.json().catch(() => null)
        const msg = error?.error || error?.message || 'Erro ao criar tag'
        throw new Error(msg)
      }

      const json = await res.json()
      const novaTag: CatalogItem | undefined = json.data

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

  const addTagFromList = (tagId: number) => {
    if (!formData.tags.includes(tagId)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagId]
      }))
    }
  }

  const removeTag = (tagId: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(id => id !== tagId)
    }))
  }

  const addEnvolvidoFromList = (matricula: number) => {
    if (!formData.envolvidos.includes(matricula)) {
      setFormData(prev => ({
        ...prev,
        envolvidos: [...prev.envolvidos, matricula]
      }))
    }
  }

  const removeEnvolvido = (matricula: number) => {
    setFormData(prev => ({
      ...prev,
      envolvidos: prev.envolvidos.filter(id => id !== matricula)
    }))
  }

  const getTagDisplay = (tagId: number) => {
    const tag = tagsCatalogo.find(t => t.id === tagId)
    return tag?.nome || `Tag ${tagId}`
  }

  const getTagColor = (tagId: number) => {
    const tag = tagsCatalogo.find(t => t.id === tagId)
    return tag?.cor
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    if (!praticaId) {
      setSaving(false)
      toast.error('ID de autenticacao nao encontrado')
      return
    }

    if (fabricouDispositivo === true && !projetoFile && !projetoUrl) {
      setSaving(false)
      toast.error('Anexe o arquivo do projeto (obrigatorio quando a resposta for Sim)')
      return
    }

    try {
      const res = await fetch(`/api/boas-praticas/${praticaId}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...formData,
          area_aplicada: formData.area_aplicada,
          pilar: formData.pilar_id,
          elimina_desperdicio: formData.elimina_desperdicio_id,
          categoria: formData.categoria_id,
          fabricou_dispositivo: fabricouDispositivo === true,
          projeto: fabricouDispositivo === true ? (projetoUrl || null) : null
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Erro ao salvar boa pratica')
      }

      if (fabricouDispositivo === true && projetoFile) {
        const uploadForm = new FormData()
        uploadForm.append('file', projetoFile)

        const uploadRes = await fetch(`/api/boas-praticas/${praticaId}/projeto`, {
          method: 'POST',
          body: uploadForm
        })

        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => null)
          throw new Error(err?.error || err?.message || 'Erro ao enviar projeto')
        }
      }

      if (evidenciasParaExcluir.length > 0) {
        await excluirEvidenciasMarcadas()
      }

      if (novasEvidencias.length > 0) {
        await uploadNovasEvidencias()
      }

      toast.success('Boa pratica atualizada com sucesso!')
      router.push(`/boas-praticas/${praticaId}`)
    } catch (_error) {
      toast.error(_error instanceof Error ? _error.message : 'Erro ao salvar boa pratica')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => praticaId && router.push(`/boas-praticas/${praticaId}`)}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Editar Boa Pratica</h1>
            <p className="text-gray-600">Edite as informacoes da boa pratica</p>
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
                  onChange={(e) => setFormData({ ...formData, descricao_problema: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
                  placeholder="Qual o objetivo desta boa pratica?"
                  rows={2}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Contexto e Classificacao */}
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
                  Foi necessario fabricar algum dispositivo e/ou pecas?
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
                      setFormData(prev => ({ ...prev, fabricou_dispositivo: false, projeto: null }))
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
                        setProjetoUrl(null)
                      }}
                    />
                    {(projetoFile || projetoUrl) && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <span>Arquivo atual: {projetoFile?.name || 'Projeto existente'}</span>
                        {projetoUrl && (
                          <Button type="button" variant="link" className="p-0" onClick={() => window.open(projetoUrl, '_blank', 'noopener,noreferrer')}>
                            Abrir projeto atual
                          </Button>
                        )}
                      </div>
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Evidencias
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-700">Evidencias atuais</div>
                {evidenciasExistentes.length === 0 ? (
                  <div className="text-sm text-gray-500">Nenhuma evidencia cadastrada</div>
                ) : (
                  <div className="space-y-3">
                    {evidenciasExistentes.map((ev) => {
                      const marcada = evidenciaMarcadaParaExclusao(ev.id)
                      return (
                        <div
                          key={ev.id}
                          className={`flex items-center justify-between border rounded-md px-3 py-2 ${marcada ? 'border-red-300 bg-red-50 opacity-60' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            {!ev.is_video && ev.url && (
                              <img src={ev.url} alt="preview" className="w-16 h-16 object-cover rounded" />
                            )}
                            {ev.is_video && (
                              <div className="flex items-center gap-2 text-sm text-blue-600">
                                <Video className="w-4 h-4" />
                                <span>Video</span>
                              </div>
                            )}
                            <div className="flex flex-col text-sm">
                              <span className="font-medium capitalize">{ev.categoria}</span>
                              <span className="text-gray-700">{getEvidenciaTitulo(ev)}</span>
                              {ev.descricao && <span className="text-gray-600">{ev.descricao}</span>}
                              <a href={ev.url} className="text-blue-600 underline" target="_blank" rel="noreferrer">
                                Abrir evidencia
                              </a>
                              {marcada && <span className="text-red-600">Marcada para exclusao ao salvar</span>}
                            </div>
                          </div>
                          {marcada ? (
                            <Button type="button" variant="outline" size="sm" onClick={() => restaurarEvidenciaExistente(ev.id)}>
                              Restaurar
                            </Button>
                          ) : (
                            <Button type="button" variant="outline" size="sm" onClick={() => marcarExclusaoEvidenciaExistente(ev.id)}>
                              <Trash2 className="w-4 h-4 mr-1" />
                              Excluir
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="border-t pt-4 space-y-4">
                <div className="text-sm font-medium text-gray-700">Adicionar novas evidencias</div>

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
                    <label className="block text-sm font-medium text-gray-700">Imagem (max 10MB)</label>
                    <Input
                      key="editar-evidencia-imagem"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        if (!file) {
                          setEvidenciaFile(null)
                          return
                        }
                        if (!ALLOWED_EVIDENCIA_MIME_TYPES.includes(file.type)) {
                          toast.error('Formato nao suportado. Use JPEG, PNG, GIF ou WEBP')
                          e.target.value = ''
                          setEvidenciaFile(null)
                          return
                        }
                        if (file.size > 10 * 1024 * 1024) {
                          toast.error('Cada imagem deve ter no maximo 10MB')
                          e.target.value = ''
                          setEvidenciaFile(null)
                          return
                        }
                        setEvidenciaFile(file)
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">URL do video</label>
                    <Input
                      key="editar-evidencia-video"
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
                    onChange={(e) => setEvidenciaDescricao(e.target.value)}
                    placeholder="Descricao da evidencia"
                    rows={2}
                  />
                </div>

                <Button type="button" onClick={addEvidencia}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Evidencia
                </Button>

                {novasEvidencias.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-gray-700">Novas evidencias pendentes</div>
                    {novasEvidencias.map((ev) => (
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
                            {ev.file && <span className="text-gray-700">{ev.file.name}</span>}
                            {ev.descricao && <span className="text-gray-600">{ev.descricao}</span>}
                            {ev.is_video && ev.url && (
                              <a href={ev.url} className="text-blue-600 underline" target="_blank" rel="noreferrer">
                                Abrir video
                              </a>
                            )}
                          </div>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => removerNovaEvidencia(ev.id)}>
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remover
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                  onChange={(e) => setFormData({ ...formData, resultados: e.target.value })}
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
                      {creatingTag ? 'Criando...' : 'Adicionar nova tag'}
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
              onClick={() => praticaId && router.push(`/boas-praticas/${praticaId}`)}
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
                  Salvar Alteracoes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
  )
}

export default EditarBoaPraticaPage
