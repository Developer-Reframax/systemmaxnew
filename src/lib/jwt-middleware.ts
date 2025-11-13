import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { createClient } from '@supabase/supabase-js'

const isProd = process.env.NODE_ENV === 'production'
const debugLog = (...args: unknown[]) => { if (!isProd) console.log(...args) }
const debugError = (...args: unknown[]) => { if (!isProd) console.error(...args) }

// Verificar se as variáveis de ambiente estão disponíveis
const jwtSecret = process.env.JWT_SECRET || process.env.NEXT_PUBLIC_JWT_SECRET
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY



if (!jwtSecret) {
  // Evitar logs detalhados em produção
  if (!isProd) console.error('JWT_SECRET não encontrado nas variáveis de ambiente!')
  throw new Error('JWT_SECRET é obrigatório')
}

if (!supabaseUrl || !supabaseServiceKey) {
  if (!isProd) console.error('Variáveis do Supabase não encontradas!')
  throw new Error('Configurações do Supabase são obrigatórias')
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
    debugLog('JWT Middleware - Starting verification')
    const authHeader = request.headers.get('authorization')
    debugLog('JWT Middleware - Auth header:', authHeader ? 'present' : 'missing')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      debugLog('JWT Middleware - No valid auth header')
      return {
        success: false,
        error: 'Token de autorização não fornecido',
        status: 401
      }
    }

    const token = authHeader.substring(7)
    debugLog('JWT Middleware - Token extracted, length:', token.length)

    const cached = tokenCache.get(token)
    let decoded: (jwt.JwtPayload & { matricula: string; nome: string; email: string; role: string; contrato_raiz?: string; equipe_id?: string }) | undefined
    if (cached) {
      const now = Date.now()
      const ttlValid = now - cached.cachedAt < TOKEN_CACHE_TTL_MS
      const notExpired = cached.exp * 1000 > now
      if (ttlValid && notExpired) {
        debugLog('JWT Middleware - Cache hit for token (skip jwt.verify, still checking Supabase)')
        decoded = {
          exp: cached.exp,
          matricula: cached.user.matricula,
          nome: cached.user.nome,
          email: cached.user.email,
          role: cached.user.role,
          contrato_raiz: cached.user.contrato_raiz,
          equipe_id: cached.user.equipe_id
        } as jwt.JwtPayload & { matricula: string; nome: string; email: string; role: string; contrato_raiz?: string; equipe_id?: string }
      } else {
        tokenCache.delete(token)
      }
    }
    
    // Verificar e decodificar JWT
    try {
      if (decoded) {
        // Já temos decoded do cache válido
        debugLog('JWT Middleware - Using decoded from cache')
      } else {
      debugLog('JWT Middleware - Verifying token with secret:', !!jwtSecret)
      
      // Verificação adicional para garantir que jwtSecret não seja undefined
      if (!jwtSecret) {
        debugLog('JWT Middleware - JWT Secret not available')
        return {
          success: false,
          error: 'Configuração de segurança não disponível',
          status: 500
        }
      }
      
      decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload & { matricula: string; nome: string; email: string; role: string; contrato_raiz?: string; equipe_id?: string }
      debugLog('JWT Middleware - Token verified successfully, user:', decoded.matricula)
      }
    } catch (jwtError) {
      debugLog('JWT Middleware - Token verification failed:', jwtError)
      return {
        success: false,
        error: 'Token inválido ou expirado',
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

  } catch (error) {
    debugError('JWT verification error:', error)
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
