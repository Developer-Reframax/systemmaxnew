'use client'

import React, { useEffect, useState } from 'react'
import type { AuthUser } from '@/lib/auth'
import type { AuthContextType, AuthProviderProps } from '@/lib/types/auth'
import { hasRole, isAuthenticated, checkVerificationComplete } from '@/lib/auth-utils'
import { useVerification } from '@/hooks/useVerification'
import TermsModal from '@/components/TermsModal'
import VerificationOverlay from '@/components/Loading/VerificationOverlay'
import {
  clearStoredSession,
  endSpecificSession,
  endUserSession,
  startUserSession,
  SESSION_STORAGE_KEY,
  LAST_SESSION_KEY
} from '@/lib/session-tracker'
import { AuthContext } from './AuthContextDefinition'

export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(initialUser ?? null)
  const [loading, setLoading] = useState(!initialUser)
  const {
    isLoading: verificationLoading,
    showTermsModal,
    startVerification,
    acceptTerms,
    declineTerms,
    isVerificationComplete
  } = useVerification()

  useEffect(() => {
    const initAuth = async () => {
      if (initialUser) {
        setUser(initialUser)
        startVerification()
        setLoading(false)
        return
      }

      try {
        const hasSession =
          typeof window !== 'undefined' ? sessionStorage.getItem(SESSION_STORAGE_KEY) : null
        if (!hasSession) {
          const staleSessionId =
            typeof window !== 'undefined' ? localStorage.getItem(LAST_SESSION_KEY) : null
          if (staleSessionId) {
            await endSpecificSession(staleSessionId, 'stale')
          }
          clearStoredSession()
        }

        const response = await fetch('/api/auth/me', { method: 'GET' })
        if (response.ok) {
          const data = await response.json()
          if (data.authenticated && data.user) {
            setUser(data.user)
            startVerification()
          } else {
            setUser(null)
          }
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Erro ao inicializar autenticaÇõÇœo:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    void initAuth()
  }, [initialUser, startVerification])

  const login = async (identifier: string, password: string) => {
    try {
      setLoading(true)

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: identifier, password })
      })

      const data = await response.json()

      if (response.ok && data.success && data.user) {
        setUser(data.user)

        const currentPath =
          typeof window !== 'undefined'
            ? window.location.pathname + window.location.search
            : '/'
        await startUserSession(currentPath)

        startVerification()
        return { success: true, message: data.message }
      }

      return { success: false, message: data.message || 'Erro no login' }
    } catch (error) {
      console.error('Erro no login:', error)
      return { success: false, message: 'Erro interno do servidor' }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      await endUserSession('logout')
    } catch (error) {
      console.error('Erro ao finalizar sessÇœo:', error)
    }

    setUser(null)
    clearStoredSession()
  }

  const value: AuthContextType = {
    user,
    loading: loading || verificationLoading,
    login,
    logout,
    isAuthenticated: isAuthenticated(user),
    hasRole: (roles: string | string[]) => hasRole(user, roles),
    isVerificationComplete: checkVerificationComplete(user, isVerificationComplete())
  }

  const showVerificationOverlay =
    !!user && (loading || verificationLoading) && !showTermsModal

  return (
    <AuthContext.Provider value={value}>
      {children}

      {showVerificationOverlay && <VerificationOverlay />}
      {showTermsModal && (
        <TermsModal isOpen={showTermsModal} onAccept={acceptTerms} onDecline={declineTerms} />
      )}
    </AuthContext.Provider>
  )
}
