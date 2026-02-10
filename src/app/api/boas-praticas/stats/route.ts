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

    const contrato = auth.user?.contrato_raiz || null

    const makeBase = () => {
      const base = supabase.from('boaspraticas_praticas').select('id', { count: 'exact', head: true })
      return contrato ? base.eq('contrato', contrato) : base
    }

    const totalPromise = makeBase()
    const emAnalisePromise = makeBase().neq('status', 'Concluído')
    // Contagem de registros marcados como eliminados ou invalidados (validacao = false)
    const invalEliminadaPromise = makeBase().or('eliminada.eq.true,validacao.eq.false')

    const [{ count: total }, { count: emAnalise }, { count: invalEliminada }] = await Promise.all([
      totalPromise,
      emAnalisePromise,
      invalEliminadaPromise
    ])

    return NextResponse.json({
      success: true,
      data: {
        total: total || 0,
        emAnalise: emAnalise || 0,
        invalEliminada: invalEliminada || 0
      }
    })
  } catch (err) {
    console.error('Erro ao obter stats de boas praticas:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
