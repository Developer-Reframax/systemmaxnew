import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyJWTToken(request)
    if (!auth.success) return NextResponse.json({ error: auth.error }, { status: 401 })

    const { id } = await context.params
    const body = await request.json()
    const envolvidos: number[] = Array.isArray(body.envolvidos) ? body.envolvidos : []

    const { data: pratica } = await supabase
      .from('boaspraticas_praticas')
      .select('matricula_cadastrante')
      .eq('id', id)
      .single()

    const canEdit = pratica && (pratica.matricula_cadastrante === auth.user?.matricula || ['Admin', 'Editor'].includes(String(auth.user?.role)))
    if (!canEdit) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    await supabase
      .from('boaspraticas_envolvidos')
      .delete()
      .eq('pratica_id', id)

    if (envolvidos.length > 0) {
      const rows = envolvidos.map(m => ({ pratica_id: id, matricula_envolvido: m }))
      const { error: insErr } = await supabase.from('boaspraticas_envolvidos').insert(rows)
      if (insErr) return NextResponse.json({ error: 'Erro ao salvar envolvidos' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}