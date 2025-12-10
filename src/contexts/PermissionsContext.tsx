'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import type { ModuloDTO, PermissionsResponse } from '@/lib/types/permissions'

interface PermissionsProviderProps {
  children: React.ReactNode
  contractCode?: string
  initialPermissions?: PermissionsResponse | null
}

interface PermissionsContextValue {
  permissions: PermissionsResponse | null
  loading: boolean
  error?: string
  refresh: (contractCodeOverride?: string) => Promise<void>
  canAccessModule: (slugModulo?: string | null) => boolean
  canAccessFuncionalidade: (
    slugModulo?: string | null,
    slugFuncionalidade?: string | null
  ) => boolean
  getModuloComFuncionalidades: (slugModulo: string) => ModuloDTO | undefined
}

const PermissionsContext = createContext<PermissionsContextValue | undefined>(undefined)

export function PermissionsProvider({
  children,
  contractCode,
  initialPermissions = null
}: PermissionsProviderProps) {
  const { user } = useAuth()
  const [permissions, setPermissions] = useState<PermissionsResponse | null>(initialPermissions)
  const [loading, setLoading] = useState(!initialPermissions)
  const [error, setError] = useState<string | undefined>(undefined)

  const fetchPermissions = useCallback(
    async (contractCodeOverride?: string) => {
      if (!user?.matricula) {
        setPermissions(null)
        setLoading(false)
        return
      }

      const effectiveContract = contractCodeOverride || contractCode || user.contrato_raiz
      if (!effectiveContract) {
        setError('Contrato nao encontrado para carregar permissoes visuais')
        setPermissions(null)
        setLoading(false)
        return
      }

      const token =
        typeof window !== 'undefined' ? window.localStorage.getItem('auth_token') : null
      if (!token) {
        setError('Token nao encontrado para carregar permissoes visuais')
        setPermissions(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const params = new URLSearchParams({ contractCode: effectiveContract })
        const response = await fetch(`/api/me/permissions?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        if (!response.ok) {
          const message = `Erro ao carregar permissoes (${response.status})`
          setError(message)
          setPermissions(null)
          return
        }

        const data = (await response.json()) as PermissionsResponse
        setPermissions(data)
        setError(undefined)
      } catch (err) {
        console.error('Erro ao buscar permissoes:', err)
        setError('Erro inesperado ao buscar permissoes')
        setPermissions(null)
      } finally {
        setLoading(false)
      }
    },
    [contractCode, user?.contrato_raiz, user?.matricula]
  )

  useEffect(() => {
    if (user?.matricula) {
      void fetchPermissions()
    } else {
      setPermissions(null)
      setLoading(false)
    }
  }, [fetchPermissions, user?.matricula])

  const canAccessModule = useCallback(
    (slugModulo?: string | null) => {
      if (!slugModulo) {
        // TODO: Informe o slug do modulo para ativar o controle visual de menu.
        return true
      }
      if (loading || !permissions) {
        return true
      }
      return permissions.modulos.some((modulo) => modulo.slug === slugModulo)
    },
    [loading, permissions]
  )

  const getModuloComFuncionalidades = useCallback(
    (slugModulo: string) =>
      permissions?.modulos.find((modulo) => modulo.slug === slugModulo),
    [permissions]
  )

  const canAccessFuncionalidade = useCallback(
    (slugModulo?: string | null, slugFuncionalidade?: string | null) => {
      if (!slugModulo || !slugFuncionalidade) {
        // TODO: Informe o slug do modulo e da funcionalidade para ativar o controle visual.
        return true
      }
      if (loading || !permissions) {
        return true
      }

      const modulo = getModuloComFuncionalidades(slugModulo)
      if (!modulo) {
        return false
      }

      return modulo.funcionalidades.some(
        (funcionalidade) => funcionalidade.slug === slugFuncionalidade
      )
    },
    [getModuloComFuncionalidades, loading, permissions]
  )

  const value = useMemo<PermissionsContextValue>(
    () => ({
      permissions,
      loading,
      error,
      refresh: fetchPermissions,
      canAccessModule,
      canAccessFuncionalidade,
      getModuloComFuncionalidades
    }),
    [
      canAccessFuncionalidade,
      canAccessModule,
      fetchPermissions,
      getModuloComFuncionalidades,
      loading,
      permissions,
      error
    ]
  )

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePermissions() {
  const context = useContext(PermissionsContext)
  if (!context) {
    throw new Error('usePermissions deve ser usado dentro de PermissionsProvider')
  }
  return context
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCanAccessModule(slugModulo: string): boolean {
  const { canAccessModule } = usePermissions()
  return useMemo(() => canAccessModule(slugModulo), [canAccessModule, slugModulo])
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCanAccessFuncionalidade(
  slugModulo: string,
  slugFuncionalidade: string
): boolean {
  const { canAccessFuncionalidade } = usePermissions()
  return useMemo(
    () => canAccessFuncionalidade(slugModulo, slugFuncionalidade),
    [canAccessFuncionalidade, slugFuncionalidade, slugModulo]
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useModuloComFuncionalidades(slugModulo: string): ModuloDTO | undefined {
  const { getModuloComFuncionalidades } = usePermissions()
  return useMemo(
    () => getModuloComFuncionalidades(slugModulo),
    [getModuloComFuncionalidades, slugModulo]
  )
}

interface CanAccessProps {
  moduleSlug?: string
  functionalitySlug?: string
  fallback?: React.ReactNode
  children: React.ReactNode
}

// Componente utilitario para demonstrar o uso dos hooks no JSX sem alterar a arvore atual.
export function CanAccess({
  moduleSlug,
  functionalitySlug,
  fallback = null,
  children
}: CanAccessProps) {
  const resolvedModuleSlug = moduleSlug || ''
  const resolvedFunctionalitySlug = functionalitySlug || ''

  // Hooks precisam ser chamados de forma deterministica; usamos slugs vazios para retornar true.
  const moduleAllowed = useCanAccessModule(resolvedModuleSlug)
  const functionalityAllowed = useCanAccessFuncionalidade(
    resolvedModuleSlug,
    resolvedFunctionalitySlug
  )

  const canSeeModule = moduleSlug ? moduleAllowed : true
  const canSeeFunctionality = functionalitySlug ? functionalityAllowed : true

  if (!canSeeModule || !canSeeFunctionality) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
