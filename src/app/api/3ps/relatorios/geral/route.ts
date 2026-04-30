import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { verifyJWTToken } from '@/lib/jwt-middleware'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const PAGE_SIZE = 1000

type UsuarioInfo = {
  contrato_raiz?: string | null
  email?: string | null
  funcao?: string | null
  matricula?: number | null
  nome?: string | null
}

type AreaInfo = {
  contrato?: string | null
  id?: number | string | null
  local?: string | null
}

type ParticipanteInfo = {
  id?: number | string | null
  matricula_participante?: number | null
  participante?: UsuarioInfo | UsuarioInfo[] | null
}

type Registro3PRow = {
  atividade?: string | null
  atividade_segura?: boolean | null
  ambiente_avaliado?: boolean | null
  area?: AreaInfo | AreaInfo[] | null
  area_id?: number | string | null
  created_at?: string | null
  criador?: UsuarioInfo | UsuarioInfo[] | null
  hipoteses_levantadas?: boolean | null
  id: number | string
  matricula_criador?: number | null
  oportunidades?: string | null
  paralisacao_realizada?: boolean | null
  participantes?: ParticipanteInfo[] | null
  passo_descrito?: boolean | null
  riscos_avaliados?: boolean | null
  tipo?: string | null
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 401 },
      )
    }

    const contrato = authResult.user.contrato_raiz
    if (!contrato) {
      return NextResponse.json(
        { success: false, error: 'Contrato do usuario nao informado' },
        { status: 400 },
      )
    }

    const { searchParams } = new URL(request.url)
    const dataInicio = normalizeDateParam(searchParams.get('data_inicio'))
    const dataFim = normalizeDateParam(searchParams.get('data_fim'))

    const registros = await fetchAllRegistros3Ps(contrato, {
      dataFim,
      dataInicio,
    })
    const rows = registros.map((registro) => {
      const area = firstItem(registro.area)
      const criador = firstItem(registro.criador)
      const criadorMatricula = registro.matricula_criador || criador?.matricula || null

      return {
        atividade: registro.atividade || '',
        atividade_segura: registro.atividade_segura ?? null,
        ambiente_avaliado: registro.ambiente_avaliado ?? null,
        area: area?.local || 'Sem area',
        areaId: area?.id ?? registro.area_id ?? null,
        contrato: area?.contrato || contrato,
        createdAt: registro.created_at || null,
        criadorMatricula,
        criadorNome: criador?.nome || String(criadorMatricula || 'Criador nao informado'),
        hipoteses_levantadas: registro.hipoteses_levantadas ?? null,
        id: String(registro.id),
        oportunidades: registro.oportunidades || '',
        paralisacao_realizada: registro.paralisacao_realizada ?? null,
        participantes: normalizeParticipantes(registro.participantes),
        passo_descrito: registro.passo_descrito ?? null,
        riscos_avaliados: registro.riscos_avaliados ?? null,
        tipo: registro.tipo || 'Nao informado',
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        rows,
      },
    })
  } catch (error) {
    console.error('Erro ao gerar relatorio geral de 3Ps:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno ao gerar relatorio de 3Ps' },
      { status: 500 },
    )
  }
}

async function fetchAllRegistros3Ps(
  contrato: string,
  filters: { dataFim?: string; dataInicio?: string },
) {
  const rows: Registro3PRow[] = []
  let page = 0

  while (true) {
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = supabase
      .from('registros_3ps')
      .select(
        `
          id,
          area_id,
          atividade,
          paralisacao_realizada,
          riscos_avaliados,
          ambiente_avaliado,
          passo_descrito,
          hipoteses_levantadas,
          atividade_segura,
          oportunidades,
          tipo,
          created_at,
          matricula_criador,
          area:locais!inner(id, local, contrato),
          criador:usuarios!registros_3ps_matricula_criador_fkey(matricula, nome, email, funcao, contrato_raiz),
          participantes:participantes_3ps(
            id,
            matricula_participante,
            participante:usuarios!participantes_3ps_matricula_participante_fkey(matricula, nome, email, funcao)
          )
        `,
      )
      .eq('area.contrato', contrato)

    if (filters.dataInicio) {
      query = query.gte('created_at', `${filters.dataInicio}T00:00:00`)
    }

    if (filters.dataFim) {
      query = query.lte('created_at', `${filters.dataFim}T23:59:59.999`)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to)
      .returns<Registro3PRow[]>()

    if (error) {
      throw error
    }

    rows.push(...(data || []))

    if (!data || data.length < PAGE_SIZE) {
      break
    }

    page += 1
  }

  return rows
}

function normalizeDateParam(value?: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined
  }

  return value
}

function normalizeParticipantes(participantes?: ParticipanteInfo[] | null) {
  const processed = new Set<number>()

  return (participantes || [])
    .map((participanteRegistro) => {
      const participante = firstItem(participanteRegistro.participante)
      const matricula =
        participanteRegistro.matricula_participante || participante?.matricula || null

      if (!matricula || processed.has(matricula)) {
        return null
      }

      processed.add(matricula)

      return {
        matricula,
        nome: participante?.nome || String(matricula),
      }
    })
    .filter((participante): participante is { matricula: number; nome: string } => Boolean(participante))
}

function firstItem<T>(value?: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] || null
  }

  return value || null
}
