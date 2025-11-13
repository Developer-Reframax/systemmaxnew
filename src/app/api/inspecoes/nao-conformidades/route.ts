import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'

type PlanoAcaoStatus = 'pendente' | 'em_andamento' | 'concluido' | 'cancelado'
type PlanoAcaoPrioridade = 'baixa' | 'media' | 'alta' | 'urgente'

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

    const role = authResult.user?.role
    const allowed = role === 'Admin' || role === 'Editor' || role === 'Gestor'
    if (!allowed) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as PlanoAcaoStatus | null
    const prioridade = searchParams.get('prioridade') as PlanoAcaoPrioridade | null
    const responsavel = searchParams.get('responsavel')
    const vencidos = searchParams.get('vencidos') === 'true'
    const periodoInicio = searchParams.get('inicio')
    const periodoFim = searchParams.get('fim')
    const q = searchParams.get('q')?.toLowerCase() || ''

    const matricula = authResult.user?.matricula
    if (!matricula) {
      return NextResponse.json({ error: 'Usuário inválido' }, { status: 400 })
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('matricula, contrato_raiz')
      .eq('matricula', matricula)
      .single()

    if (!usuario?.contrato_raiz) {
      return NextResponse.json({ error: 'Contrato do usuário não encontrado' }, { status: 400 })
    }

    const { data: execucoesIds, error: execErr } = await supabase
      .from('execucoes_inspecao')
      .select('id, matricula_executor, formulario_id, local_id, status, data_inicio')
      .in(
        'matricula_executor',
        (
          await supabase
            .from('usuarios')
            .select('matricula')
            .eq('contrato_raiz', usuario.contrato_raiz)
        ).data?.map((u) => u.matricula) || []
      )

    if (execErr) {
      return NextResponse.json({ error: 'Erro ao buscar execuções' }, { status: 500 })
    }

    const execIds = (execucoesIds || []).map((e) => e.id)
    if (execIds.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    let query = supabase
      .from('planos_acao')
      .select(
        `*,
         evidencias:evidencias_plano_acao(*),
         pergunta:perguntas_formulario(pergunta),
         execucao:execucoes_inspecao(
           id, status, data_inicio,
           formulario:formularios_inspecao(titulo),
           local:locais(local),
           executor:usuarios(matricula, nome, contrato_raiz)
         )
        `
      )
      .in('execucao_inspecao_id', execIds)
      .order('prazo', { ascending: true })

    if (status) query = query.eq('status', status)
    if (prioridade) query = query.eq('prioridade', prioridade)
    if (responsavel) query = query.eq('responsavel_matricula', Number(responsavel))
    if (vencidos) query = query.lt('prazo', new Date().toISOString().split('T')[0])

    if (periodoInicio) {
      query = query.gte('created_at', new Date(periodoInicio).toISOString())
    }
    if (periodoFim) {
      query = query.lte('created_at', new Date(periodoFim).toISOString())
    }

    const { data: planos, error } = await query
    if (error) {
      console.error('Erro ao listar não conformidades:', error)
      return NextResponse.json({ error: 'Erro ao listar não conformidades' }, { status: 500 })
    }

    interface PlanoAcaoComRelacoes {
      desvio: string
      o_que_fazer: string
      pergunta?: {
        pergunta: string
      }
    }

    const filtrados = (planos || []).filter((p) => {
      if (!q) return true
      const plano = p as PlanoAcaoComRelacoes
      const alvo = `${plano.desvio} ${plano.o_que_fazer} ${(plano.pergunta?.pergunta || '')}`.toLowerCase()
      return alvo.includes(q)
    })

    return NextResponse.json({ success: true, data: filtrados })
  } catch (err) {
    console.error('Erro na API de não conformidades:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

