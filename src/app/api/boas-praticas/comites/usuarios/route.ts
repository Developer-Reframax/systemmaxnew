import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyJWTToken(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const contrato = searchParams.get('contrato')
    const search = searchParams.get('search')?.toLowerCase().trim()

    let query = supabase
      .from('usuarios')
      .select('matricula, nome, email, contrato_raiz, status')
      .eq('status', 'ativo')
      .order('nome', { ascending: true })

    if (contrato) {
      query = query.eq('contrato_raiz', contrato)
    }

    const { data, error } = await query
    if (error) {
      console.error('Erro ao buscar usuarios para comites:', error)
      return NextResponse.json({ error: 'Erro ao buscar usuarios' }, { status: 500 })
    }

    let usuarios = data || []
    if (search) {
      usuarios = usuarios.filter(
        (u) =>
          (u.nome || '').toLowerCase().includes(search) || String(u.matricula).includes(search)
      )
    }

    return NextResponse.json({ success: true, data: usuarios })
  } catch (error) {
    console.error('Erro na API de usuarios de comites:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
