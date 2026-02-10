import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Lista praticas pendentes para avaliacao do responsavel_etapa
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyJWTToken(request)
    if (!auth.success) return NextResponse.json({ error: auth.error }, { status: 401 })

    const { data, error } = await supabase
      .from('boaspraticas_praticas')
      .select('id, titulo, status, contrato, responsavel_etapa, created_at')
      .eq('status', 'Aguardando avaliacao do sesmt')
      .eq('responsavel_etapa', auth.user?.matricula)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: 'Erro ao listar avaliacoes' }, { status: 500 })
    return NextResponse.json({ success: true, data })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
