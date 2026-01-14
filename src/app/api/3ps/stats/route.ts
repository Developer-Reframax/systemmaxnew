import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface Participante3P {
  matricula_participante: number
  participante: {
    nome: string
    matricula: number
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const periodo = searchParams.get('periodo') || '30' // dias
    const contrato_id = searchParams.get('contrato_id')
    const usuario_id = searchParams.get('usuario_id')

    const dataInicio = new Date()
    dataInicio.setDate(dataInicio.getDate() - parseInt(periodo))

    let baseQuery = supabase
      .from('registros_3ps')
      .select(`
        *,
        area:locais(local, contrato),
        criador:usuarios!registros_3ps_matricula_criador_fkey(nome, matricula),
        participantes:participantes_3ps(
          matricula_participante,
          participante:usuarios!participantes_3ps_matricula_participante_fkey(nome, matricula)
        )
      `)
      .gte('created_at', dataInicio.toISOString())

    if (contrato_id) {
      baseQuery = baseQuery.eq('area.contrato', contrato_id)
    }

    if (usuario_id) {
      // Para usuários não-admin, filtrar apenas registros onde é criador ou participante
      baseQuery = baseQuery.or(`matricula_criador.eq.${usuario_id},participantes.matricula_participante.eq.${usuario_id}`)
    }

    const { data: registros3ps, error } = await baseQuery

    if (error) {
      console.error('Erro ao buscar estatísticas 3P\'s:', error)
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }

    // Estatísticas gerais
    const total3ps = registros3ps?.length || 0
    const registros3psHoje = registros3ps?.filter(r => 
      new Date(r.created_at).toDateString() === new Date().toDateString()
    ).length || 0

    // Taxa de aprovação (atividades consideradas seguras)
    const atividadesSeguras = registros3ps?.filter(r => r.atividade_segura).length || 0
    const taxaAprovacao = total3ps > 0 
      ? Math.round((atividadesSeguras / total3ps) * 100)
      : 0

    // Áreas ativas (com pelo menos um registro)
    const areasAtivas = new Set(registros3ps?.map(r => r.area?.local).filter(Boolean)).size

    // Registros 3P's por área
    const registros3psPorArea = registros3ps?.reduce((acc: Record<string, number>, registro) => {
      const area = registro.area?.local || 'Não informado'
      acc[area] = (acc[area] || 0) + 1
      return acc
    }, {}) || {}

    // Registros 3P's por tipo
    const registros3psPorTipo = registros3ps?.reduce((acc: Record<string, number>, registro) => {
      const tipo = registro.tipo || 'Nao informado'
      acc[tipo] = (acc[tipo] || 0) + 1
      return acc
    }, {}) || {}

    // Registros 3P's por dia (últimos dias do período)
    const registros3psPorDia = []
    for (let i = parseInt(periodo) - 1; i >= 0; i--) {
      const data = new Date()
      data.setDate(data.getDate() - i)
      const dataStr = data.toISOString().split('T')[0]
      const count = registros3ps?.filter(registro => 
        registro.created_at.split('T')[0] === dataStr
      ).length || 0
      
      registros3psPorDia.push({
        data: dataStr,
        count
      })
    }

    // Análise das etapas do processo 3P's
    const etapasAnalise = {
      paralisacaoRealizada: registros3ps?.filter(r => r.paralisacao_realizada).length || 0,
      riscosAvaliados: registros3ps?.filter(r => r.riscos_avaliados).length || 0,
      ambienteAvaliado: registros3ps?.filter(r => r.ambiente_avaliado).length || 0,
      passoDescrito: registros3ps?.filter(r => r.passo_descrito).length || 0,
      hipotesesLevantadas: registros3ps?.filter(r => r.hipoteses_levantadas).length || 0,
      atividadeSegura: registros3ps?.filter(r => r.atividade_segura).length || 0
    }

    // Top 5 usuários com mais participações (criador + participante)
    const usuariosParticipacoes: Record<string, number> = {}
    
    registros3ps?.forEach(registro => {
      // Contar como criador
      const criador = registro.criador
      if (criador) {
        const keyCriador = `${criador.nome} (${criador.matricula})`
        usuariosParticipacoes[keyCriador] = (usuariosParticipacoes[keyCriador] || 0) + 1
      }
      
      // Contar como participante
      registro.participantes?.forEach((p: Participante3P) => {
        if (p.participante && p.matricula_participante !== registro.matricula_criador) {
          const keyParticipante = `${p.participante.nome} (${p.participante.matricula})`
          usuariosParticipacoes[keyParticipante] = (usuariosParticipacoes[keyParticipante] || 0) + 1
        }
      })
    })

    const topUsuarios = Object.entries(usuariosParticipacoes)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([usuario, count]) => ({ usuario, count }))

    // Registros com oportunidades identificadas
    const registrosComOportunidades = registros3ps?.filter(r => r.oportunidades && r.oportunidades.trim().length > 0).length || 0

    // Média de participantes por registro
    const totalParticipantes = registros3ps?.reduce((acc, registro) => {
      return acc + (registro.participantes?.length || 0) + 1 // +1 para o criador
    }, 0) || 0
    const mediaParticipantes = total3ps > 0 ? Math.round(totalParticipantes / total3ps) : 0

    return NextResponse.json({
      success: true,
      data: {
        resumo: {
          total3ps,
          registros3psHoje,
          taxaAprovacao,
          areasAtivas,
          registrosComOportunidades,
          mediaParticipantes
        },
        registros3psPorArea,
        registros3psPorTipo,
        registros3psPorDia,
        etapasAnalise,
        topUsuarios,
        periodo: parseInt(periodo)
      }
    })
  } catch (error) {
    console.error('Erro ao buscar estatísticas 3P\'s:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}