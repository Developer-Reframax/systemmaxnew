import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Buscar sessões
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    // Verificar se é admin ou editor
    if (decoded.role !== 'Admin' && decoded.role !== 'Editor') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    let query = supabase
      .from('sessoes')
      .select(`
        *,
        usuario:usuarios(
          id,
          nome,
          email,
          matricula
        ),
        modulo:modulos(
          id,
          nome,
          icone,
          cor
        )
      `)
      .order('inicio', { ascending: false })
      .limit(100)

    if (start) {
      query = query.gte('inicio', start)
    }
    if (end) {
      query = query.lte('inicio', end)
    }

    const { data: sessions, error } = await query

    if (error) {
      console.error('Erro ao buscar sessões:', error)
      return NextResponse.json({ error: 'Erro ao buscar sessões' }, { status: 500 })
    }

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Erro na API de sessões:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
