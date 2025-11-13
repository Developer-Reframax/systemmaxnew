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

    // Obter parâmetro de contrato da query string
    const { searchParams } = new URL(request.url)
    const contratoId = searchParams.get('contrato')

    if (!contratoId) {
      return NextResponse.json({ success: false, message: 'Código do contrato é obrigatório' }, { status: 400 })
    }

    // Buscar equipes do contrato específico
    const { data: equipes, error } = await supabase
      .from('equipes')
      .select(`
        id,
        equipe,
        codigo_contrato,
        supervisor,
        usuarios:usuarios!equipes_supervisor_fkey(nome)
      `)
      .eq('codigo_contrato', contratoId)
      .order('equipe')

    if (error) {
      console.error('Erro ao buscar equipes:', error)
      return NextResponse.json({ success: false, message: 'Erro ao buscar equipes' }, { status: 500 })
    }

    return NextResponse.json({ success: true, teams: equipes })
  } catch (error) {
    console.error('Erro na API de equipes:', error)
    return NextResponse.json({ success: false, message: 'Erro interno do servidor' }, { status: 500 })
  }
}
