import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getUserPermissions } from '@/lib/permissions-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Token nao fornecido' }, { status: 401 })
    }

    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json({ error: 'Token invalido' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const contractFromParams =
      searchParams.get('contractCode') ||
      searchParams.get('contract_code') ||
      searchParams.get('codigo_contrato') ||
      undefined

    const permissions = await getUserPermissions(decoded, contractFromParams || undefined)
    if (!permissions) {
      return NextResponse.json(
        { error: 'Contrato nao informado e nao encontrado no token' },
        { status: 400 }
      )
    }

    return NextResponse.json(permissions)
  } catch (error) {
    console.error('Erro na rota de permissoes:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
