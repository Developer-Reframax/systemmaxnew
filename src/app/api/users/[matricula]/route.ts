import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

// Campos permitidos para atualização
const ALLOWED_FIELDS = ['email', 'telefone', 'phone', 'avatar_url'] as const

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matricula: string }> }
) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status || 401 })
    }

    const { matricula: matriculaParam } = await params

    const isSelf = String(authResult.user.matricula) === matriculaParam
    const isPrivileged = ['Admin', 'Editor'].includes(authResult.user.role)
    if (!isSelf && !isPrivileged) {
      return NextResponse.json({ success: false, message: 'Acesso negado' }, { status: 403 })
    }

    // Tenta buscar usando string e, se não retornar, tenta com número
    const matriculaNumber = Number(matriculaParam)

    const tryFetch = async (value: string | number) =>
      supabase
        .from('usuarios')
        .select('matricula, nome, email, phone, role, status, funcao')
        .eq('matricula', value)
        .maybeSingle()

    let { data, error } = await tryFetch(matriculaParam)
    if ((!data || error) && !Number.isNaN(matriculaNumber)) {
      const second = await tryFetch(matriculaNumber)
      data = second.data
      error = second.error
    }

    if (error || !data) {
      console.error('Erro ao buscar usuário:', error)
      return NextResponse.json({ success: false, message: 'Usuário não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true, user: data })
  } catch (error) {
    console.error('Erro no GET /api/users/[matricula]:', error)
    return NextResponse.json({ success: false, message: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ matricula: string }> }
) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status || 401 })
    }

    const { matricula: matriculaParam } = await params
    const matriculaNumber = Number(matriculaParam)
    if (Number.isNaN(matriculaNumber)) {
      return NextResponse.json({ success: false, message: 'Matrícula inválida' }, { status: 400 })
    }

    const isSelf = String(authResult.user.matricula) === matriculaParam
    const isPrivileged = ['Admin', 'Editor'].includes(authResult.user.role)
    if (!isSelf && !isPrivileged) {
      return NextResponse.json({ success: false, message: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const updatePayload: Record<string, unknown> = {}
    ALLOWED_FIELDS.forEach((field) => {
      if (body[field] !== undefined) updatePayload[field] = body[field]
    })

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ success: false, message: 'Nenhum dado válido para atualizar' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('usuarios')
      .update(updatePayload)
      .eq('matricula', matriculaNumber)
      .select('matricula, nome, email, telefone, phone, avatar_url, role, status, funcao')
      .single()

    if (error || !data) {
      return NextResponse.json({ success: false, message: 'Erro ao atualizar usuário' }, { status: 500 })
    }

    return NextResponse.json({ success: true, user: data })
  } catch (error) {
    console.error('Erro no PUT /api/users/[matricula]:', error)
    return NextResponse.json({ success: false, message: 'Erro interno do servidor' }, { status: 500 })
  }
}
