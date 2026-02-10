import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  const user = verifyToken(token)
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  return NextResponse.json(
    {
      authenticated: true,
      user
    },
    { status: 200 }
  )
}
