import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'
import type { AuthUser } from '@/lib/auth'

export type AuthenticatedUser = AuthUser & { equipe_id?: string }

export interface JWTVerificationResult {
  success: boolean
  user?: AuthenticatedUser
  error?: string
  status?: number
}

// Middleware leve para APIs: verifica apenas se existe o cookie auth_token e se o JWT é válido/ativo.
// Não faz controle de navegação nem validação pesada; a navegação é protegida pelo middleware global.
export async function verifyJWTToken(request: NextRequest): Promise<JWTVerificationResult> {
  const token = request.cookies.get('auth_token')?.value
  if (!token) {
    return { success: false, error: 'Token de autenticacao nao encontrado', status: 401 }
  }

  const user = verifyToken(token)
  if (!user) {
    return { success: false, error: 'Token invalido ou expirado', status: 401 }
  }

  return { success: true, user }
}

export function createAuthErrorResponse(error: string, status: number = 401): NextResponse {
  return NextResponse.json({ success: false, message: error }, { status })
}
