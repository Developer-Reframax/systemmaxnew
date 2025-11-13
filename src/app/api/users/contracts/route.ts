import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const jwtSecret = process.env.JWT_SECRET!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, message: 'Token não fornecido' }, { status: 401 })
    }

    try {
      jwt.verify(token, jwtSecret)
    } catch {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 })
    }

    // Buscar contratos ativos
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
