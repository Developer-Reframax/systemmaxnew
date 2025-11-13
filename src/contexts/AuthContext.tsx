'use client'

import React, { useState, useEffect } from 'react'
import { verifyTokenClient, isTokenExpired, decodeTokenPayload } from '@/lib/auth-client'
import type { AuthUser } from '@/lib/auth'
import type { AuthContextType, AuthProviderProps } from '@/lib/types/auth'
import { hasRole, isAuthenticated, checkVerificationComplete } from '@/lib/auth-utils'
import { useVerification } from '@/hooks/useVerification'
import TermsModal from '@/components/TermsModal'
import { AuthContext } from './AuthContextDefinition'

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const {
    isLoading: verificationLoading,
    showTermsModal,
    startVerification,
    acceptTerms,
    declineTerms,
    isVerificationComplete
  } = useVerification()

  // Initialize authentication on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        setUser(null)
        setLoading(false)
        return
      }

      // Verificações em paralelo: expiração local, verificação no servidor e decodificação
      const [expired, userData] = await Promise.all([
        Promise.resolve(isTokenExpired(token)),
        verifyTokenClient(token)
      ])

      if (expired) {
        localStorage.removeItem('auth_token')
        setUser(null)
        setLoading(false)
        return
      }

      if (userData) {
        setUser(userData)
        // Iniciar verificação de termos imediatamente sem setTimeout
        startVerification()
      } else {
        // Fallback: se a verificação falhar mas o token ainda tiver exp futuro, podemos decodificar para UX mínima
        const payload = decodeTokenPayload(token)
        if (payload && typeof payload.exp === 'number' && payload.exp > Math.floor(Date.now() / 1000)) {
          setUser({
            matricula: payload.matricula as number,
            nome: payload.nome as string,
            email: payload.email as string,
            role: payload.role as 'Admin' | 'Editor' | 'Usuario',
            funcao: payload.funcao as string | undefined,
            contrato_raiz: payload.contrato_raiz as string | undefined,
            tipo: payload.tipo as string | undefined
          })
          startVerification()
        } else {
          localStorage.removeItem('auth_token')
          setUser(null)
        }
      }

      setLoading(false)
    }

    initAuth()
  }, [startVerification])

  // Função para forçar logout e relogin (para debug)
  useEffect(() => {
    const forceRelogin = () => {
      const shouldForceRelogin = typeof window !== 'undefined' ? localStorage.getItem('force_relogin') : null
      if (shouldForceRelogin === 'true') {
        localStorage.removeItem('force_relogin')
        localStorage.removeItem('auth_token')
        setUser(null)
        window.location.reload()
      }
    }
    forceRelogin()
  }, [])

  const login = async (identifier: string, password: string) => {
    try {
      setLoading(true)

      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: identifier, password })
      })
      
      const data = await response.json()
      
      if (data.success && data.user && data.token) {

        setUser(data.user)
        localStorage.setItem('auth_token', data.token)
        
        // Create session record
        try {
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.token}`
            },
            body: JSON.stringify({
              matricula_usuario: data.user.matricula,
              inicio_sessao: new Date().toISOString(),
              paginas_acessadas: 1,
              modulos_acessados: ['Login']
            })
          })
        } catch (sessionError) {
          console.warn('Erro ao criar sessão:', sessionError)
        }
        
        // Iniciar verificação de termos após login bem-sucedido
        setTimeout(() => {
          startVerification()
        }, 500)
        
        return { success: true, message: data.message }
      } else {

        return { success: false, message: data.message || 'Erro no login' }
      }
    } catch (error) {
      console.error('Erro no login:', error)
      return { success: false, message: 'Erro interno do servidor' }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {

    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (user && token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            matricula_usuario: user.matricula,
            fim_sessao: new Date().toISOString()
          })
        })
      }
    } catch (error) {
      console.error('Erro no logout:', error)
    }

    setUser(null)
    localStorage.removeItem('auth_token')

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

  return (
    <AuthContext.Provider value={value}>
      {children}
      
      {/* Modal de Termos de Uso */}
      {showTermsModal && (
        <TermsModal
          isOpen={showTermsModal}
          onAccept={acceptTerms}
          onDecline={declineTerms}
        />
      )}
      
      {/* Modal de Dados Obrigatórios - DESABILITADO */}
      {/* {showDataModal && (
        <UserDataModal
          isOpen={showDataModal}
          missingFields={verificationStatus?.missingFields || []}
          onComplete={updateUserData}
          userContractCode={user?.contrato_raiz || ''}
        />
      )} */}
    </AuthContext.Provider>
  )
}
