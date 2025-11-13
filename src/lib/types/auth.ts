import type { AuthUser } from '@/lib/auth'

export interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (identifier: string, password: string) => Promise<{ success: boolean; message?: string }>
  logout: () => void
  isAuthenticated: boolean
  hasRole: (roles: string | string[]) => boolean
  isVerificationComplete: boolean
}

export interface AuthProviderProps {
  children: React.ReactNode
}
