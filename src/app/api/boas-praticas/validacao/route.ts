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
    if (!auth.success) return NextResponse.json({ error: auth.error }, { status: 401 })

    const { data, error } = await supabase
      .from('boaspraticas_praticas')
      .select('id, titulo, status, contrato, created_at')
      .eq('status', 'Aguardando validacao')
      .eq('responsavel_etapa', auth.user?.matricula)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: 'Erro ao listar praticas para validacao' }, { status: 500 })

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    console.error('Erro na lista de validacao:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
