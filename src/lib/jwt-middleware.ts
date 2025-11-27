import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { createClient } from '@supabase/supabase-js'

// Verificar se as variáveis de ambiente estão disponíveis
const jwtSecret = process.env.JWT_SECRET || process.env.NEXT_PUBLIC_JWT_SECRET
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY



if (!jwtSecret) {
  throw new Error('JWT_SECRET e obrigatorio')
}

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Configuracoes do Supabase sao obrigatorias')
}

const jwtSecretKey: jwt.Secret = jwtSecret

type DecodedUserPayload = jwt.JwtPayload & {
  matricula: string
  nome: string
  email: string
  role: string
  contrato_raiz?: string
  equipe_id?: string
}


const supabase = createClient(supabaseUrl, supabaseServiceKey)

const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000
const tokenCache = new Map<string, { user: AuthenticatedUser; exp: number; cachedAt: number }>()
const cleanupTokenCache = () => {
  const now = Date.now()
  for (const [key, entry] of tokenCache.entries()) {
    const ttlExpired = now - entry.cachedAt >= TOKEN_CACHE_TTL_MS
    const tokenExpired = entry.exp * 1000 <= now
    if (ttlExpired || tokenExpired) {
      tokenCache.delete(key)
    }
  }
}

export interface AuthenticatedUser {
  matricula: string
  nome: string
  email: string
  role: string
  contrato_raiz?: string
  equipe_id?: string
}

export interface JWTVerificationResult {
  success: boolean
  user?: AuthenticatedUser
  error?: string
  status?: number
}

/**
 * Middleware para verificar JWT token
 */
export async function verifyJWTToken(request: NextRequest): Promise<JWTVerificationResult> {
  try {
    cleanupTokenCache()
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Token de autorização não fornecido',
        status: 401
      }
    }

    const token = authHeader.substring(7)

    const cached = tokenCache.get(token)
    let decoded: DecodedUserPayload | undefined
    if (cached) {
      const now = Date.now()
      const ttlValid = now - cached.cachedAt < TOKEN_CACHE_TTL_MS
      const notExpired = cached.exp * 1000 > now
      if (ttlValid && notExpired) {
        decoded = {
          exp: cached.exp,
          matricula: cached.user.matricula,
          nome: cached.user.nome,
          email: cached.user.email,
          role: cached.user.role,
          contrato_raiz: cached.user.contrato_raiz,
          equipe_id: cached.user.equipe_id
        }
      } else {
        tokenCache.delete(token)
      }
    }
    
    // Verificar e decodificar JWT
    try {
      if (!decoded) {
        const verified = jwt.verify(token, jwtSecretKey)
        if (!verified || typeof verified !== 'object') {
          return {
            success: false,
            error: 'Token invalido ou expirado',
            status: 401
          }
        }

        const payload = verified as jwt.JwtPayload
        if (
          payload.matricula === undefined ||
          payload.nome === undefined ||
          payload.email === undefined ||
          payload.role === undefined
        ) {
          return {
            success: false,
            error: 'Token invalido ou expirado',
            status: 401
          }
        }

        decoded = {
          matricula: String(payload.matricula),
          nome: String(payload.nome),
          email: String(payload.email),
          role: String(payload.role),
          contrato_raiz: payload.contrato_raiz as string | undefined,
          equipe_id: payload.equipe_id as string | undefined,
          exp: payload.exp
        }
      }
    } catch {
      return {
        success: false,
        error: 'Token invalido ou expirado',
        status: 401
      }
    }

    // Verificar se o usuário ainda existe e está ativo
    if (!decoded) {
      return {
        success: false,
        error: 'Falha na verificação do token',
        status: 401
      }
    }

    const { data: user, error } = await supabase
      .from('usuarios')
      .select('matricula, nome, email, role, status, contrato_raiz, equipe_id')
      .eq('matricula', decoded.matricula)
      .eq('status', 'ativo')
      .single()

    if (error || !user) {
      return {
        success: false,
        error: 'Usuário não encontrado ou inativo',
        status: 401
      }
    }

    const result: JWTVerificationResult = {
      success: true,
      user: {
        matricula: user.matricula,
        nome: user.nome,
        email: user.email,
        role: user.role,
        contrato_raiz: user.contrato_raiz,
        equipe_id: user.equipe_id
      }
    }

    const exp = typeof decoded.exp === 'number' ? decoded.exp : Math.floor(Date.now() / 1000) + 300
    tokenCache.set(token, { user: result.user!, exp, cachedAt: Date.now() })

    return result

  } catch {
    return {
      success: false,
      error: 'Erro interno na verificação do token',
      status: 500
    }
  }
}

/**
 * Middleware para verificar se o usuário é administrador
 */
export async function requireAdmin(user: AuthenticatedUser): Promise<{ success: boolean; error?: string; status?: number }> {
  if (user.role !== 'Admin') {
    return {
      success: false,
      error: 'Acesso negado - privilégios de administrador necessários',
      status: 403
    }
  }
  
  return { success: true }
}

/**
 * Middleware para verificar se o usuário pode acessar o recurso
 * (próprio perfil ou é admin)
 */
export function canAccessResource(user: AuthenticatedUser, targetMatricula: string): boolean {
  return user.role === 'Admin' || user.matricula === targetMatricula
}

/**
 * Helper para criar resposta de erro de autenticação
 */
export function createAuthErrorResponse(error: string, status: number = 401): NextResponse {
  return NextResponse.json(
    { success: false, message: error },
    { status }
  )
}

/**
 * Wrapper para rotas protegidas
 */
export function withAuth(handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await verifyJWTToken(request)
    
    if (!authResult.success) {
      return createAuthErrorResponse(authResult.error!, authResult.status!)
    }
    
    return handler(request, authResult.user!)
  }
}

/**
 * Wrapper para rotas que requerem privilégios de admin
 */
export function withAdminAuth(handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await verifyJWTToken(request)
    
    if (!authResult.success) {
      return createAuthErrorResponse(authResult.error!, authResult.status!)
    }
    
    const adminCheck = await requireAdmin(authResult.user!)
    if (!adminCheck.success) {
      return createAuthErrorResponse(adminCheck.error!, adminCheck.status!)
    }
    
    return handler(request, authResult.user!)
  }
}




