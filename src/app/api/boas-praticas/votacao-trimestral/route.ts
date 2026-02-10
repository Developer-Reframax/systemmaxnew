import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'

type VotoRow = { pratica_id: string }
type PraticaRow = {
  id: string
  titulo: string
  contrato?: string | null
  status: string
  created_at?: string
}

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

    if (!auth.user?.contrato_raiz) {
      return NextResponse.json({ error: 'Contrato do usuario nao informado' }, { status: 400 })
    }

    const { data: votos } = await supabase
      .from('boaspraticas_votos')
      .select('pratica_id')
      .eq('matricula', auth.user.matricula)
      .eq('tipo', 'trimestral')

    const votosData = (votos ?? []) as unknown as VotoRow[]
    const jaVotadas = new Set<string>(votosData.map((v) => String(v.pratica_id)))

    const { data, error } = await supabase
      .from('boaspraticas_praticas')
      .select('id, titulo, contrato, status, created_at')
      .eq('status', 'Aguardando votacao trimestral')
      .eq('contrato', auth.user.contrato_raiz)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Erro ao listar praticas para votacao' }, { status: 500 })
    }

    const praticasData = (data ?? []) as unknown as PraticaRow[]
    const filtradas = praticasData.filter((p) => !jaVotadas.has(String(p.id)))

    return NextResponse.json({ success: true, data: filtradas })
  } catch (error) {
    console.error('Erro na lista de votacao trimestral:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
