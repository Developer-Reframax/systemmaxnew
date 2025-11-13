import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token não fornecido' },
        { status: 400 }
      )
    }
    
    const user = verifyToken(token)
    
    if (user) {
      return NextResponse.json({
        success: true,
        user
      })
    } else {
      return NextResponse.json(
        { success: false, message: 'Token inválido ou expirado' },
        { status: 401 }
      )
    }
    
  } catch (error) {
    console.error('Verify token error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
