import { NextRequest, NextResponse } from 'next/server'
import { verifyResetToken } from '@/lib/password-reset'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Token de redefinicao nao informado' },
        { status: 400 }
      )
    }

    const verified = verifyResetToken(token)

    if (!verified) {
      return NextResponse.json(
        { success: false, message: 'Token invalido ou expirado' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        matricula: verified.matricula,
        email: verified.email,
        expiresAt: new Date(verified.exp * 1000).toISOString()
      }
    })
  } catch (error) {
    console.error('Erro ao verificar token de redefinicao:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno ao verificar token' },
      { status: 500 }
    )
  }
}
