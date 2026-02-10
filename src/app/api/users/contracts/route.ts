import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/auth'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ success: false, message: 'Token nao fornecido' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token invalido ou expirado' }, { status: 401 })
    }

    const { data: contratos, error } = await supabase
      .from('contratos')
      .select('codigo, nome, status')
      .eq('status', 'ativo')
      .order('nome')

    if (error) {
      console.error('Erro ao buscar contratos:', error)
      return NextResponse.json({ success: false, message: 'Erro ao buscar contratos' }, { status: 500 })
    }

    return NextResponse.json({ success: true, contracts: contratos })
  } catch (error) {
    console.error('Erro na API de contratos:', error)
    return NextResponse.json({ success: false, message: 'Erro interno do servidor' }, { status: 500 })
  }
}

