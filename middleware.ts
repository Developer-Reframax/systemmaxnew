import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const AUTH_COOKIE = 'auth_token'
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/me',
  '/api/auth/logout',
  '/api/auth/password-reset',
  '/api/auth/password-reset/request',
  '/api/auth/verify',
  '/api/auth/register'
]

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  const isPublicPath = PUBLIC_PATHS.some((publicPath) => pathname.startsWith(publicPath))
  if (isPublicPath) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  const hasAuthCookie = Boolean(request.cookies.get(AUTH_COOKIE))

  if (!hasAuthCookie) {
    const loginUrl = new URL('/login', request.url)
    const callback = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
    if (callback) {
      loginUrl.searchParams.set('callbackUrl', callback)
    }
    return NextResponse.redirect(loginUrl)
  }

  if (pathname === '/login' && hasAuthCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/data|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
}
