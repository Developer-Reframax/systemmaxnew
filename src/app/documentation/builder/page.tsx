'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type Quill from 'quill'
import DOMPurify from 'dompurify'
import 'react-quill/dist/quill.snow.css'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import {
  Loader2,
  Plus,
  Save,
  Trash2,
  BookOpen,
  Sparkles,
  ShieldCheck,
  LayoutTemplate
} from 'lucide-react'

interface DocumentationPage {
  id?: string
  title: string
  slug: string
  content: string
  is_main: boolean
  updated_at?: string
}

const basePage: DocumentationPage = {
  title: '',
  slug: '/inicio',
  content: '',
  is_main: false
}

const normalizeSlug = (value: string) => {
  const sanitized = value.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-/_]/g, '')
  const withSlash = sanitized.startsWith('/') ? sanitized : `/${sanitized}`
  return withSlash.replace(/\/{2,}/g, '/').toLowerCase()
}

export default function DocumentationBuilderPage() {
  const { user, loading: authLoading, hasRole } = useAuth()
  const [pages, setPages] = useState<DocumentationPage[]>([])
  const [form, setForm] = useState<DocumentationPage>(basePage)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState('')
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor')

  const canEdit = useMemo(() => hasRole('Admin') || hasRole('Editor'), [hasRole])
  const quillContainerRef = useRef<HTMLDivElement | null>(null)
  const quillRef = useRef<Quill | null>(null)

  const quillModules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, 4, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ color: [] }, { background: [] }],
        [{ align: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'image', 'code-block'],
        ['clean']
      ]
    }),
    []
  )

  const quillFormats = useMemo(
    () => [
      'header',
      'bold',
      'italic',
      'underline',
      'strike',
      'blockquote',
      'color',
      'background',
      'align',
      'list',
      'bullet',
      'link',
      'image',
      'code-block'
    ],
    []
  )

  useEffect(() => {
    setPreview(DOMPurify.sanitize(form.content || ''))
  }, [form.content])

  // Inicializa Quill no client (evita findDOMNode e SSR)
  useEffect(() => {
    let isMounted = true
    if (quillRef.current || !quillContainerRef.current) return

    const load = async () => {
      const Quill = (await import('quill')).default
      if (!isMounted || quillRef.current || !quillContainerRef.current) return

      const quill = new Quill(quillContainerRef.current, {
        theme: 'snow',
        modules: quillModules,
        formats: quillFormats,
        placeholder: 'Construa a página com componentes ricos, code blocks e imagens...'
      })
      quill.root.innerHTML = form.content || ''
      quill.on('text-change', () => {
        setForm(prev => ({ ...prev, content: quill.root.innerHTML }))
      })
      quillRef.current = quill
    }

    load()

    return () => {
      isMounted = false
    }
  }, [quillModules, quillFormats, form.content, setForm])

  // Sincroniza conteúdo quando troca de página selecionada
  useEffect(() => {
    if (quillRef.current) {
      quillRef.current.root.innerHTML = form.content || ''
    }
  }, [form.content])

  const loadPages = useCallback(async () => {
    try {
      setLoading(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch('/api/documentation', {
        headers: {
          Authorization: token ? `Bearer ${token}` : ''
        }
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Erro ao carregar páginas')
      }

      setPages(data.pages || [])
      // Se não estiver editando nada, seleciona a principal por padrão
      if (!editingId && data.pages?.length) {
        const main = data.pages.find((p: DocumentationPage) => p.is_main)
        if (main) {
          setForm(main)
          setEditingId(main.id || null)
        }
      }
    } catch (error) {
      console.error(error)
      toast.error('Não foi possível carregar as páginas de documentação')
    } finally {
      setLoading(false)
    }
  }, [editingId])

  useEffect(() => {
    loadPages()
  }, [loadPages])

  const handleChange = (field: keyof DocumentationPage, value: string | boolean) => {
    if (field === 'slug' && typeof value === 'string') {
      setForm(prev => ({ ...prev, slug: normalizeSlug(value) }))
      return
    }
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!form.title || !form.slug || !form.content) {
      toast.warning('Preencha título, slug e conteúdo')
      return
    }

    setSaving(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const method = editingId ? 'PUT' : 'POST'
      const payload = {
        ...form,
        slug: normalizeSlug(form.slug),
        id: editingId || undefined
      }

      const response = await fetch('/api/documentation', {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Erro ao salvar página')
      }

      toast.success(editingId ? 'Página atualizada' : 'Página criada')
      setForm(data.page || basePage)
      setEditingId(data.page?.id ?? null)
      await loadPages()
    } catch (error) {
      console.error(error)
      toast.error('Não foi possível salvar a página')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingId) return
    const confirmDelete = confirm('Deseja realmente remover esta página?')
    if (!confirmDelete) return

    setSaving(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch('/api/documentation', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ id: editingId })
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Erro ao remover página')
      }

      toast.success('Página removida')
      setForm(basePage)
      setEditingId(null)
      await loadPages()
    } catch (error) {
      console.error(error)
      toast.error('Não foi possível remover a página')
    } finally {
      setSaving(false)
    }
  }

  const startNew = () => {
    setEditingId(null)
    setForm({
      ...basePage,
      slug: `/tutorial-${(pages.length + 1).toString().padStart(2, '0')}`
    })
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white">
        <div className="flex items-center space-x-3">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Carregando sessão...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center space-y-3 backdrop-blur">
          <h1 className="text-xl font-semibold">Faça login para criar páginas</h1>
          <p className="text-slate-300">O construtor de documentação é restrito a usuários autenticados.</p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-emerald-500 text-slate-900 font-semibold shadow-lg shadow-emerald-500/30"
          >
            Entrar
          </Link>
        </div>
      </div>
    )
  }

  if (!canEdit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="bg-slate-900/70 border border-slate-800 px-8 py-6 rounded-2xl shadow-2xl">
          <div className="flex items-center space-x-3 mb-3">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
            <h1 className="text-xl font-semibold">Acesso restrito</h1>
          </div>
          <p className="text-slate-400">Somente Admins ou Editors podem gerenciar as páginas de documentação.</p>
          <Link href="/documentation" className="mt-4 inline-flex items-center text-emerald-400 hover:text-emerald-300 transition-colors">
            <BookOpen className="h-4 w-4 mr-2" />
            Ver documentação
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-400/10 text-emerald-300 border border-emerald-500/30">
              <Sparkles className="h-4 w-4 mr-2" />
              Construtor de Documentação
            </div>
            <h1 className="text-3xl font-semibold mt-3">Crie, edite e publique páginas incríveis</h1>
            <p className="text-slate-400 mt-2">Editor rich text (HTML) com preview em tempo real. Defina a página principal e organize o conhecimento do time.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/documentation"
              className="inline-flex items-center px-4 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Ver documentação
            </Link>
            <button
              onClick={startNew}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold shadow-lg shadow-emerald-500/30 transition"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova página
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <LayoutTemplate className="h-5 w-5 text-emerald-300" />
                Páginas
              </h2>
              {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
            </div>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {pages.length === 0 && (
                <div className="text-slate-400 text-sm">Nenhuma página criada ainda.</div>
              )}
              {pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => {
                    setEditingId(page.id || null)
                    setForm(page)
                  }}
                  className={`w-full text-left px-3 py-3 rounded-xl border transition ${
                    editingId === page.id
                      ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-100'
                      : 'border-white/10 bg-white/5 hover:border-emerald-300/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{page.title}</span>
                    {page.is_main && (
                      <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/40">
                        Principal
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{page.slug}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-300">Título</label>
                  <input
                    value={form.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-emerald-400 outline-none"
                    placeholder="Nome da página"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-300">Slug / Caminho</label>
                  <input
                    value={form.slug}
                    onChange={(e) => handleChange('slug', e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-emerald-400 outline-none"
                    placeholder="/inicio"
                  />
                  <p className="text-xs text-slate-400 mt-1">Use paths amigáveis, ex: /primeiros-passos</p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_main}
                    onChange={(e) => handleChange('is_main', e.target.checked)}
                    className="w-4 h-4 rounded border-white/30 bg-transparent accent-emerald-400"
                  />
                  Definir como página principal
                </label>
                <div className="flex gap-2">
                  {editingId && (
                    <button
                      onClick={handleDelete}
                      disabled={saving}
                      className="inline-flex items-center px-3 py-2 rounded-lg border border-red-400/60 text-red-200 hover:bg-red-500/10 transition disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remover
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold shadow-lg shadow-emerald-500/30 transition disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    {editingId ? 'Salvar alterações' : 'Publicar página'}
                  </button>
                </div>
              </div>

            <div className="mt-5">
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setActiveTab('editor')}
                  className={`px-4 py-2 rounded-xl border text-sm font-semibold transition ${
                    activeTab === 'editor'
                      ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-100'
                      : 'border-white/10 bg-white/5 text-slate-200 hover:border-emerald-300/40'
                  }`}
                >
                  Editor
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-4 py-2 rounded-xl border text-sm font-semibold transition ${
                    activeTab === 'preview'
                      ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-100'
                      : 'border-white/10 bg-white/5 text-slate-200 hover:border-emerald-300/40'
                  }`}
                >
                  Preview
                </button>
              </div>

              <div className="space-y-3">
                <div className={activeTab === 'editor' ? 'block' : 'hidden'}>
                  <div className="rounded-2xl border border-white/10 overflow-hidden bg-slate-950/70">
                    <div ref={quillContainerRef} className="quill-rich-text" />
                  </div>
                </div>
                <div className={activeTab === 'preview' ? 'block' : 'hidden'}>
                  <div className="h-[560px] overflow-y-auto rounded-xl border border-white/10 bg-white/5 px-4 py-4 prose prose-invert max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: preview }} />
                  </div>
                </div>
                <style jsx global>{`
                  .quill-rich-text .ql-toolbar {
                    background: rgba(255, 255, 255, 0.06);
                    border: none;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    color: #e5e7eb;
                  }
                  .quill-rich-text .ql-container {
                    background: rgba(15, 23, 42, 0.9);
                    border: none;
                    color: #e5e7eb;
                    min-height: 520px;
                    font-size: 14px;
                    line-height: 1.6;
                  }
                  .quill-rich-text .ql-editor {
                    min-height: 520px;
                  }
                  .quill-rich-text .ql-editor.ql-blank::before {
                    color: rgba(226, 232, 240, 0.4);
                  }
                  .quill-rich-text .ql-stroke {
                    stroke: #cbd5e1;
                  }
                  .quill-rich-text .ql-fill {
                    fill: #cbd5e1;
                  }
                  .quill-rich-text .ql-picker {
                    color: #e5e7eb;
                  }
                `}</style>
              </div>
            </div>
            </div>

            <div className="bg-emerald-400/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-emerald-200">Dica</p>
                <p className="text-sm text-emerald-100/80">Use Markdown para construir rápido e insira blocos HTML apenas quando precisar de algo mais rico.</p>
              </div>
              <Link
                href="/documentation"
                className="inline-flex items-center px-3 py-2 rounded-lg bg-white/90 text-slate-900 font-semibold shadow"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Abrir experiência de leitura
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
