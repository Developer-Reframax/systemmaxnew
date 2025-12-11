import type { ReactNode } from 'react'
import type { AuthUser } from '@/lib/auth'

export interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (identifier: string, password: string) => Promise<{ success: boolean; message?: string }>
  logout: () => Promise<void>
  isAuthenticated: boolean
  hasRole: (roles: string | string[]) => boolean
  isVerificationComplete: boolean
}

export interface AuthProviderProps {
  children: ReactNode
  initialUser?: AuthUser | null
}
