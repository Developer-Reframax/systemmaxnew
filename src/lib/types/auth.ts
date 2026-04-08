import type { ReactNode } from 'react'
import type { AuthUser } from '@/lib/auth'

export interface LoginResult {
  success: boolean
  user?: AuthUser
  message?: string
  requiresFirstAccess?: boolean
  matricula?: number
}

export interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (identifier: string, password: string) => Promise<LoginResult>
  completeFirstAccess: (
    verificationToken: string,
    newPassword: string,
    confirmPassword: string
  ) => Promise<LoginResult>
  logout: () => Promise<void>
  isAuthenticated: boolean
  hasRole: (roles: string | string[]) => boolean
  isVerificationComplete: boolean
}

export interface AuthProviderProps {
  children: ReactNode
  initialUser?: AuthUser | null
}
