import jwt from 'jsonwebtoken'

const FIRST_ACCESS_TOKEN_TTL = '10m'
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'

export interface FirstAccessTokenPayload {
  type: 'first_access'
  matricula: number
}

function collapseSpaces(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

export function normalizeNameForComparison(value: string): string {
  return collapseSpaces(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

export function extractFirstAndLastName(fullName: string) {
  const normalized = normalizeNameForComparison(fullName)
  const parts = normalized.split(' ').filter(Boolean)

  if (parts.length === 0) {
    return { firstName: '', lastName: '' }
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: parts[0] }
  }

  return {
    firstName: parts[0],
    lastName: parts[parts.length - 1]
  }
}

export function isFirstAccessPassword(passwordHash: string | null | undefined): boolean {
  if (passwordHash == null) {
    return true
  }

  return normalizeNameForComparison(passwordHash) === 'SENHA_TEMPORARIA'
}

export function generateFirstAccessToken(matricula: number) {
  return jwt.sign(
    {
      type: 'first_access',
      matricula
    } satisfies FirstAccessTokenPayload,
    JWT_SECRET,
    { expiresIn: FIRST_ACCESS_TOKEN_TTL }
  )
}

export function verifyFirstAccessToken(token: string): FirstAccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & Partial<FirstAccessTokenPayload>

    if (decoded.type !== 'first_access' || typeof decoded.matricula !== 'number') {
      return null
    }

    return {
      type: 'first_access',
      matricula: decoded.matricula
    }
  } catch {
    return null
  }
}
