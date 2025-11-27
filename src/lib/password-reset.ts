import crypto from 'crypto'
import jwt from 'jsonwebtoken'

const resolvedSecret =
  process.env.PASSWORD_RESET_SECRET ||
  process.env.JWT_SECRET ||
  process.env.NEXT_PUBLIC_JWT_SECRET

if (!resolvedSecret) {
  throw new Error('PASSWORD_RESET_SECRET ou JWT_SECRET e obrigatorio para reset de senha')
}

const resetSecret: jwt.Secret = resolvedSecret

const RESET_EXPIRATION = '2m'

export interface VerifiedResetToken {
  matricula: number
  email: string
  exp: number
  jti?: string
}

export function maskPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length <= 4) return digits
  const last4 = digits.slice(-4)
  return `****${last4}`
}

export function generateResetToken(matricula: number, email: string): string {
  const nonce = crypto.randomBytes(16).toString('hex')

  return jwt.sign(
    {
      type: 'password_reset',
      matricula,
      email,
      jti: nonce
    },
    resetSecret,
    { expiresIn: RESET_EXPIRATION }
  )
}

export function verifyResetToken(token: string): VerifiedResetToken | null {
  try {
    const decoded = jwt.verify(token, resetSecret) as jwt.JwtPayload & {
      matricula?: number
      email?: string
      type?: string
      jti?: string
    }

    if (decoded.type !== 'password_reset' || decoded.matricula === undefined || !decoded.email) {
      return null
    }

    if (typeof decoded.exp !== 'number') {
      return null
    }

    return {
      matricula: Number(decoded.matricula),
      email: String(decoded.email),
      exp: decoded.exp,
      jti: decoded.jti
    }
  } catch {
    return null
  }
}

export function buildResetLink(token: string, origin: string): string {
  const baseEnv =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    ''

  const baseUrl = baseEnv || origin
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

  return `${normalizedBase}/reset-password?token=${encodeURIComponent(token)}`
}
