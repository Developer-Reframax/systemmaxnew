'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import DOMPurify from 'dompurify'
import { Loader2, BookOpen, Sparkles, ArrowUpRight, Star, Wand2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'

interface DocumentationPage {
  id?: string
  title: string
  slug: string
  content: string
  is_main: boolean
  updated_at?: string
}

export default function DocumentationExperience() {
  const { user, loading: authLoading, hasRole } = useAuth()
  const [pages, setPages] = useState<DocumentationPage[]>([])
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const activePage = useMemo(() => {
    if (!pages.length) return null
    if (activeSlug) return pages.find((p) => p.slug === activeSlug) || pages[0]
    const main = pages.find((p) => p.is_main)
    return main || pages[0]
  }, [pages, activeSlug])

  const renderContent = (content?: string) => {
    return DOMPurify.sanitize(content || '')
  }

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
        throw new Error(data.message || 'Erro ao carregar documentação')
      }

      setPages(data.pages || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPages()
  }, [loadPages])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white px-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center space-y-3 backdrop-blur max-w-md">
          <h1 className="text-2xl font-semibold">Acesse para ver a documentação</h1>
          <p className="text-slate-200">Conecte-se para carregar os tutoriais e guias dinâmicos.</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white">
              <Sparkles className="h-4 w-4 mr-2 text-amber-300" />
              Documentação viva
            </div>
            <h1 className="text-3xl font-semibold mt-3">Documentação interativa do SystemMax</h1>
            <p className="text-slate-300 mt-2 max-w-2xl">
              Tutoriais, guias e atalhos para dominar o sistema. Estrutura modular com páginas dinâmicas.
            </p>
          </div>
          {(hasRole('Admin') || hasRole('Editor')) ? (
            <Link
              href="/documentation/builder"
              className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold shadow-lg shadow-emerald-500/30 transition"
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Abrir construtor
            </Link>
          ) : null}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          <aside className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-emerald-300" />
                <h2 className="text-lg font-semibold">Mapa de conhecimento</h2>
              </div>
              {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
            </div>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {pages.length === 0 && !loading && (
                <div className="text-slate-400 text-sm">Nenhuma página publicada ainda.</div>
              )}
              {pages.map((page) => (
                <button
                  key={page.slug}
                  onClick={() => setActiveSlug(page.slug)}
                  className={`w-full text-left px-3 py-3 rounded-xl border transition ${
                    activePage?.slug === page.slug
                      ? 'border-emerald-400/70 bg-emerald-400/10 text-emerald-50'
                      : 'border-white/10 bg-white/5 hover:border-emerald-400/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{page.title}</span>
                    {page.is_main && (
                      <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-100 border border-emerald-400/40">
                        Principal
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{page.slug}</p>
                </button>
              ))}
            </div>
          </aside>

          <main className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur">
            {loading ? (
              <div className="flex items-center justify-center h-64 text-slate-300">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : activePage ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-400/10 text-amber-100 border border-amber-300/30">
                      <Star className="h-4 w-4 mr-2" />
                      {activePage.slug}
                    </div>
                    <h2 className="text-2xl font-semibold mt-2">{activePage.title}</h2>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <p>Render seguro</p>
                    <p className="flex items-center justify-end gap-1">
                      <ArrowUpRight className="h-3 w-3" />
                      Markdown / HTML
                    </p>
                  </div>
                </div>
                <div className="prose prose-invert max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: renderContent(activePage.content) }} />
                </div>
              </>
            ) : (
              <div className="text-slate-300">Nenhuma página encontrada.</div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
