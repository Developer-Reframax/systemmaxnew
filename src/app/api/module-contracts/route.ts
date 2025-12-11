import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Token de acesso requerido' }, { status: 401 })
    }
    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Token invalido ou expirado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const codigoContrato = searchParams.get('codigo_contrato')
    if (!codigoContrato) {
      return NextResponse.json({ error: 'codigo_contrato é obrigatório' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('modulo_contratos')
      .select('id, modulo_id, codigo_contrato')
      .eq('codigo_contrato', codigoContrato)

    if (error) {
      console.error('Erro ao buscar modulo_contratos:', error)
      return NextResponse.json({ error: 'Erro ao buscar relacionamentos' }, { status: 500 })
    }

    return NextResponse.json({ success: true, moduleContracts: data || [] })
  } catch (error) {
    console.error('Erro interno module-contracts GET:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Token de acesso requerido' }, { status: 401 })
    }
    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Token invalido ou expirado' }, { status: 401 })
    }

    const { modulo_id, codigo_contrato } = await request.json()
    if (!modulo_id || !codigo_contrato) {
      return NextResponse.json({ error: 'modulo_id e codigo_contrato são obrigatórios' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('modulo_contratos')
      .insert({ modulo_id, codigo_contrato })
      .select()
      .single()

    if (error) {
      console.error('Erro ao vincular modulo ao contrato:', error)
      return NextResponse.json({ error: 'Erro ao vincular modulo' }, { status: 500 })
    }

    return NextResponse.json({ success: true, moduleContract: data })
  } catch (error) {
    console.error('Erro interno module-contracts POST:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Token de acesso requerido' }, { status: 401 })
    }
    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Token invalido ou expirado' }, { status: 401 })
    }

    const { modulo_id, codigo_contrato } = await request.json()
    if (!modulo_id || !codigo_contrato) {
      return NextResponse.json({ error: 'modulo_id e codigo_contrato são obrigatórios' }, { status: 400 })
    }

    const { error } = await supabase
      .from('modulo_contratos')
      .delete()
      .eq('modulo_id', modulo_id)
      .eq('codigo_contrato', codigo_contrato)

    if (error) {
      console.error('Erro ao desvincular modulo do contrato:', error)
      return NextResponse.json({ error: 'Erro ao remover vinculo' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro interno module-contracts DELETE:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
