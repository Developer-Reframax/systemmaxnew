import type { AuthUser } from '@/lib/auth'

// Função para verificar se o usuário tem uma ou mais roles específicas
export function hasRole(user: AuthUser | null, roles: string | string[]): boolean {
  if (!user) return false
  
  const roleArray = Array.isArray(roles) ? roles : [roles]
  return roleArray.includes(user.role)
}

// Função para verificar se o usuário está autenticado
export function isAuthenticated(user: AuthUser | null): boolean {
  return !!user
}

// Função para verificar se a verificação está completa
export function checkVerificationComplete(
  user: AuthUser | null,
  verificationComplete: boolean
): boolean {
  return !!user && verificationComplete
}
