import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const matricula = authResult.user?.matricula
    if (!matricula) {
      return NextResponse.json({ error: 'Usuário inválido' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const prioridade = searchParams.get('prioridade')
    const vencidos = searchParams.get('vencidos') === 'true'
    const q = searchParams.get('q')?.toLowerCase() || ''

    let query = supabase
      .from('planos_acao')
      .select(`*,
        evidencias:evidencias_plano_acao(*),
        pergunta:perguntas_formulario(pergunta),
        execucao:execucoes_inspecao(
          id, status, data_inicio,
          formulario:formularios_inspecao(titulo),
          local:locais(local)
        )
      `)
      .eq('responsavel_matricula', matricula)
      .order('prazo', { ascending: true })

    if (status) query = query.eq('status', status)
    if (prioridade) query = query.eq('prioridade', prioridade)
    if (vencidos) query = query.lt('prazo', new Date().toISOString().split('T')[0])

    const { data, error } = await query
    if (error) {
      console.error('Erro ao listar minhas ações:', error)
      return NextResponse.json({ error: 'Erro ao listar ações' }, { status: 500 })
    }

    interface PlanoAcaoComRelacoes {
      desvio: string
      o_que_fazer: string
      pergunta?: {
        pergunta: string
      }
    }

    const filtrados = (data || []).filter((p) => {
      if (!q) return true
      const plano = p as PlanoAcaoComRelacoes
      const alvo = `${plano.desvio} ${plano.o_que_fazer} ${(plano.pergunta?.pergunta || '')}`.toLowerCase()
      return alvo.includes(q)
    })

    return NextResponse.json({ success: true, data: filtrados })
  } catch (err) {
    console.error('Erro na API de minhas ações:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

