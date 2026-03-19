import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateToken, verifyToken } from '@/lib/auth'
import type { AuthUser } from '@/lib/auth'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type ContractResponseItem = {
  codigo: string
  nome: string | null
  status: string | null
}

type UserContractRow = {
  codigo_contrato: string | null
  contratos:
    | {
        codigo: string | null
        nome: string | null
        status: string | null
      }
    | {
        codigo: string | null
        nome: string | null
        status: string | null
      }[]
    | null
}

function getAuthenticatedUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
  if (!token) {
    return {
      user: null,
      response: NextResponse.json({ success: false, message: 'Token nao fornecido' }, { status: 401 })
    }
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return {
      user: null,
      response: NextResponse.json({ success: false, message: 'Token invalido ou expirado' }, { status: 401 })
    }
  }

  return { user: decoded, response: null as NextResponse | null }
}

function normalizeContractRows(rows: UserContractRow[] | null | undefined): ContractResponseItem[] {
  const contractsMap = new Map<string, ContractResponseItem>()

  for (const row of rows || []) {
    if (!row?.codigo_contrato) continue

    const contrato = Array.isArray(row.contratos) ? row.contratos[0] : row.contratos
    contractsMap.set(row.codigo_contrato, {
      codigo: row.codigo_contrato,
      nome: contrato?.nome ?? null,
      status: contrato?.status ?? null
    })
  }

  return Array.from(contractsMap.values()).sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR'))
}

export async function GET(request: NextRequest) {
  try {
    const { user, response } = getAuthenticatedUser(request)
    if (!user) return response!

    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('contrato_raiz')
      .eq('matricula', user.matricula)
      .single()

    if (userError || !userData) {
      console.error('Erro ao buscar usuario em /api/me/contracts (GET):', userError)
      return NextResponse.json(
        { success: false, message: 'Usuario nao encontrado' },
        { status: 404 }
      )
    }

    const { data: linksData, error: linksError } = await supabase
      .from('usuario_contratos')
      .select('codigo_contrato, contratos(codigo, nome, status)')
      .eq('matricula_usuario', user.matricula)
      .returns<UserContractRow[]>()

    if (linksError) {
      console.error('Erro ao buscar contratos do usuario em /api/me/contracts (GET):', linksError)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar contratos do usuario' },
        { status: 500 }
      )
    }

    const contracts = normalizeContractRows(linksData)
    const currentContract = userData.contrato_raiz ?? null

    if (currentContract && !contracts.some((contract) => contract.codigo === currentContract)) {
      const { data: currentContractData } = await supabase
        .from('contratos')
        .select('codigo, nome, status')
        .eq('codigo', currentContract)
        .maybeSingle()

      if (currentContractData?.codigo) {
        contracts.push({
          codigo: currentContractData.codigo,
          nome: currentContractData.nome ?? null,
          status: currentContractData.status ?? null
        })
      }
    }

    return NextResponse.json({
      success: true,
      currentContract,
      contracts: contracts.sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR'))
    })
  } catch (error) {
    console.error('Erro inesperado em /api/me/contracts (GET):', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user, response } = getAuthenticatedUser(request)
    if (!user) return response!

    const body = await request.json().catch(() => null)
    const requestedContract =
      typeof body?.codigo_contrato === 'string' ? body.codigo_contrato.trim() : ''

    if (!requestedContract) {
      return NextResponse.json(
        { success: false, message: 'codigo_contrato e obrigatorio' },
        { status: 400 }
      )
    }

    const { data: contractAccess, error: accessError } = await supabase
      .from('usuario_contratos')
      .select('id')
      .eq('matricula_usuario', user.matricula)
      .eq('codigo_contrato', requestedContract)
      .maybeSingle()

    if (accessError) {
      console.error('Erro ao validar acesso ao contrato em /api/me/contracts (PUT):', accessError)
      return NextResponse.json(
        { success: false, message: 'Erro ao validar acesso ao contrato' },
        { status: 500 }
      )
    }

    if (!contractAccess) {
      return NextResponse.json(
        { success: false, message: 'Contrato nao permitido para este usuario' },
        { status: 403 }
      )
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from('usuarios')
      .update({
        contrato_raiz: requestedContract,
        updated_at: new Date().toISOString()
      })
      .eq('matricula', user.matricula)
      .select('matricula, nome, email, role, funcao, contrato_raiz')
      .single()

    if (updateError || !updatedUser) {
      console.error('Erro ao atualizar contrato_raiz em /api/me/contracts (PUT):', updateError)
      return NextResponse.json(
        { success: false, message: 'Erro ao atualizar contrato do usuario' },
        { status: 500 }
      )
    }

    const authUser: AuthUser = {
      matricula: updatedUser.matricula,
      nome: updatedUser.nome,
      email: updatedUser.email,
      role: updatedUser.role as AuthUser['role'],
      funcao: updatedUser.funcao ?? undefined,
      contrato_raiz: updatedUser.contrato_raiz ?? undefined,
      tipo: user.tipo ?? undefined
    }

    const refreshedToken = generateToken(authUser)
    const apiResponse = NextResponse.json({
      success: true,
      message: 'Contrato alterado com sucesso',
      user: authUser
    })

    apiResponse.cookies.set('auth_token', refreshedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8
    })

    return apiResponse
  } catch (error) {
    console.error('Erro inesperado em /api/me/contracts (PUT):', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
