import type { AuthUser } from './auth'

const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000
const clientTokenCache = new Map<string, { user: AuthUser; exp: number; cachedAt: number }>()
const cleanupClientCache = () => {
  const now = Date.now()
  for (const [key, entry] of clientTokenCache.entries()) {
    const ttlExpired = now - entry.cachedAt >= TOKEN_CACHE_TTL_MS
    const tokenExpired = entry.exp * 1000 <= now
    if (ttlExpired || tokenExpired) {
      clientTokenCache.delete(key)
    }
  }
}

// Client-side token verification using API route
export async function verifyTokenClient(token: string): Promise<AuthUser | null> {
  try {
    cleanupClientCache()

    const cached = clientTokenCache.get(token)
    if (cached) {
      const now = Date.now()
      const ttlValid = now - cached.cachedAt < TOKEN_CACHE_TTL_MS
      const notExpired = cached.exp * 1000 > now
      if (ttlValid && notExpired) {
        return cached.user
      } else {
        clientTokenCache.delete(token)
      }
    }
    
    const response = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Alguns backends esperam Authorization em vez de body
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ token })
    })
    
    const data = await response.json()
    
    if (data.success && data.user) {
      const payload = decodeTokenPayload(token)
      const exp = payload && typeof payload.exp === 'number' ? Number(payload.exp) : Math.floor(Date.now() / 1000) + 300
      clientTokenCache.set(token, { user: data.user as AuthUser, exp, cachedAt: Date.now() })
      return data.user as AuthUser
    } else {
      return null
    }
    
  } catch (error) {
    return null
  }
}

// Decode JWT payload without verification (for client-side info display)
export function decodeTokenPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }
    
    const payload = parts[1]
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return decoded
  } catch (error) {
    return null
  }
}

// Check if token is expired (client-side check)
export function isTokenExpired(token: string): boolean {
  try {
    const payload = decodeTokenPayload(token)
    if (!payload || !payload.exp) {
      return true
    }
    
    const currentTime = Math.floor(Date.now() / 1000)
    return Number(payload.exp) < currentTime
  } catch {
    return true
  }
}





