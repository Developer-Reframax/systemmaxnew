import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'

const BUCKET = 'images-evidencia-boas-praticas'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; evidenciaId: string }> }
) {
  try {
    const auth = await verifyJWTToken(request)
    if (!auth.success) return NextResponse.json({ error: auth.error }, { status: 401 })

    const { id, evidenciaId } = await context.params

    const { data: evid } = await supabase
      .from('boaspraticas_evidencias')
      .select('id, url')
      .eq('id', evidenciaId)
      .eq('pratica_id', id)
      .single()

    if (!evid) return NextResponse.json({ error: 'Evidência não encontrada' }, { status: 404 })

    const path = evid.url.split('/').slice(-2).join('/')
    await supabase.storage.from(BUCKET).remove([path])

    const { error } = await supabase
      .from('boaspraticas_evidencias')
      .delete()
      .eq('id', evidenciaId)
      .eq('pratica_id', id)

    if (error) return NextResponse.json({ error: 'Erro ao remover evidência' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

