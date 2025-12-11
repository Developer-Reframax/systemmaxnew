import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth'
import type { AuthUser } from '@/lib/auth'

const AUTH_COOKIE = 'auth_token'

export async function getCurrentUserOrNull(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE)?.value
  if (!token) {
    return null
  }

  const user = verifyToken(token)
  return user ?? null
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUserOrNull()
  if (!user) {
    redirect('/login')
  }

  return user
}
