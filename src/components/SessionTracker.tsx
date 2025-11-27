'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { endUserSession, getActiveSessionId, logSessionEvent } from '@/lib/session-tracker'

export default function SessionTracker() {
  const { user } = useAuth()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Registrar visualização de página
  useEffect(() => {
    if (!user) return
    const sessionId = getActiveSessionId()
    if (!sessionId) return

    const search = searchParams?.toString()
    const basePath = pathname || ''
    const fullPath = basePath ? (search ? `${basePath}?${search}` : basePath) : undefined
    if (!fullPath) return

    logSessionEvent({
      type: 'page_view',
      path: fullPath,
      occurred_at: new Date().toISOString()
    })
  }, [pathname, searchParams, user])

  // Heartbeat para manter a sessão atualizada
  useEffect(() => {
    if (!user) return

    const interval = window.setInterval(() => {
      const sessionId = getActiveSessionId()
      if (!sessionId) return

      logSessionEvent({
        type: 'heartbeat',
        occurred_at: new Date().toISOString()
      })
    }, 1000 * 60 * 5) // 5 minutos

    return () => window.clearInterval(interval)
  }, [user])

  // Encerrar sessão ao fechar a aba/navegador
  useEffect(() => {
    if (!user) return

    const handlePageHide = () => {
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
      if (navEntry?.type === 'reload') {
        return
      }

      const sessionId = getActiveSessionId()
      if (!sessionId) return
      // keepalive para ter chance de registrar o fim
      void endUserSession('tab_closed', true)
    }

    window.addEventListener('pagehide', handlePageHide)
    return () => window.removeEventListener('pagehide', handlePageHide)
  }, [user])

  return null
}
