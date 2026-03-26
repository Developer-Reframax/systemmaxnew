import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const REGISTRO_3P_SELECT = `
  *,
  area:locais(id, local, contrato),
  criador:usuarios!registros_3ps_matricula_criador_fkey(matricula, nome, email, funcao),
  participantes:participantes_3ps(
    id,
    matricula_participante,
    participante:usuarios!participantes_3ps_matricula_participante_fkey(matricula, nome, email, funcao)
  )
`

interface Registro3PFiltros {
  data_inicio?: string
  data_fim?: string
  area_id?: string
  matricula_criador?: number
  atividade_segura?: boolean
  search?: string
  meus?: boolean
  page: number
  limit: number
}

function parseFiltros(searchParams: URLSearchParams): Registro3PFiltros {
  return {
    data_inicio: searchParams.get('data_inicio') || undefined,
    data_fim: searchParams.get('data_fim') || undefined,
    area_id: searchParams.get('area_id') || undefined,
    matricula_criador: searchParams.get('matricula_criador')
      ? Number.parseInt(searchParams.get('matricula_criador') as string, 10)
      : undefined,
    atividade_segura:
      searchParams.get('atividade_segura') === 'true'
        ? true
        : searchParams.get('atividade_segura') === 'false'
          ? false
          : undefined,
    search: searchParams.get('search') || undefined,
    meus: searchParams.get('meus') === 'true',
    page: Number.parseInt(searchParams.get('page') || '1', 10),
    limit: Number.parseInt(searchParams.get('limit') || '10', 10)
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filtros = parseFiltros(searchParams)
    const page = Number.isFinite(filtros.page) && filtros.page > 0 ? filtros.page : 1
    const limit = Number.isFinite(filtros.limit) && filtros.limit > 0 ? filtros.limit : 10

    if (filtros.meus && authResult.user?.matricula) {
      const matricula = authResult.user.matricula

      const [{ data: registrosCriados, error: errorCriados }, { data: participacoes, error: errorParticipacoes }] =
        await Promise.all([
          supabase.from('registros_3ps').select('id').eq('matricula_criador', matricula),
          supabase
            .from('participantes_3ps')
            .select('registro_3p_id')
            .eq('matricula_participante', matricula)
        ])

      if (errorCriados || errorParticipacoes) {
        console.error("Erro ao buscar registros 3P do usuario:", errorCriados || errorParticipacoes)
        return NextResponse.json({ error: "Erro ao buscar registros 3P's" }, { status: 500 })
      }

      const idsPermitidos = Array.from(
        new Set([
          ...(registrosCriados || []).map((item) => item.id),
          ...(participacoes || []).map((item) => item.registro_3p_id).filter(Boolean)
        ])
      )

      if (idsPermitidos.length === 0) {
        return NextResponse.json({
          success: true,
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            currentPage: page,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: limit,
            hasNextPage: false,
            hasPrevPage: false
          }
        })
      }

      filtros.matricula_criador = undefined

      let query = supabase
        .from('registros_3ps')
        .select(REGISTRO_3P_SELECT, { count: 'exact' })
        .in('id', idsPermitidos)

      if (filtros.data_inicio) {
        query = query.gte('created_at', filtros.data_inicio)
      }

      if (filtros.data_fim) {
        query = query.lte('created_at', filtros.data_fim)
      }

      if (filtros.area_id) {
        query = query.eq('area_id', filtros.area_id)
      }

      if (filtros.atividade_segura !== undefined) {
        query = query.eq('atividade_segura', filtros.atividade_segura)
      }

      if (filtros.search) {
        query = query.ilike('atividade', `%${filtros.search}%`)
      }

      const from = (page - 1) * limit
      const to = from + limit - 1

      const { data: registros3ps, error, count } = await query
        .range(from, to)
        .order('created_at', { ascending: false })

      if (error) {
        console.error("Erro ao buscar registros 3P's:", error)
        return NextResponse.json({ error: "Erro ao buscar registros 3P's" }, { status: 500 })
      }

      const total = count || 0
      const totalPages = Math.ceil(total / limit)

      return NextResponse.json({
        success: true,
        data: registros3ps || [],
        pagination: {
          page,
          limit,
          total,
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      })
    }

    let query = supabase
      .from('registros_3ps')
      .select(REGISTRO_3P_SELECT, { count: 'exact' })

    if (filtros.data_inicio) {
      query = query.gte('created_at', filtros.data_inicio)
    }

    if (filtros.data_fim) {
      query = query.lte('created_at', filtros.data_fim)
    }

    if (filtros.area_id) {
      query = query.eq('area_id', filtros.area_id)
    }

    if (filtros.matricula_criador) {
      query = query.eq('matricula_criador', filtros.matricula_criador)
    }

    if (filtros.atividade_segura !== undefined) {
      query = query.eq('atividade_segura', filtros.atividade_segura)
    }

    if (filtros.search) {
      query = query.ilike('atividade', `%${filtros.search}%`)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data: registros3ps, error, count } = await query
      .range(from, to)
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Erro ao buscar registros 3P's:", error)
      return NextResponse.json({ error: "Erro ao buscar registros 3P's" }, { status: 500 })
    }

    const total = count || 0
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      success: true,
      data: registros3ps || [],
      pagination: {
        page,
        limit,
        total,
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    })
  } catch (error) {
    console.error("Erro na API de registros 3P's:", error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const registro3pData = await request.json()

    const camposObrigatorios = [
      'area_id',
      'atividade',
      'paralisacao_realizada',
      'riscos_avaliados',
      'ambiente_avaliado',
      'passo_descrito',
      'hipoteses_levantadas',
      'atividade_segura',
      'tipo'
    ]

    for (const campo of camposObrigatorios) {
      if (registro3pData[campo] === undefined || registro3pData[campo] === null) {
        return NextResponse.json(
          { error: `Campo obrigatorio nao informado: ${campo}` },
          { status: 400 }
        )
      }
    }

    const camposBoolean = [
      'paralisacao_realizada',
      'riscos_avaliados',
      'ambiente_avaliado',
      'passo_descrito',
      'hipoteses_levantadas',
      'atividade_segura'
    ]

    for (const campo of camposBoolean) {
      if (typeof registro3pData[campo] !== 'boolean') {
        return NextResponse.json(
          { error: `Campo ${campo} deve ser verdadeiro ou falso` },
          { status: 400 }
        )
      }
    }

    const tiposValidos = ['Melhoria', 'Aprendizado']
    if (!tiposValidos.includes(registro3pData.tipo)) {
      return NextResponse.json(
        { error: 'Campo tipo deve ser Melhoria ou Aprendizado' },
        { status: 400 }
      )
    }

    if (!Array.isArray(registro3pData.participantes)) {
      return NextResponse.json({ error: 'Participantes deve ser uma lista' }, { status: 400 })
    }

    registro3pData.matricula_criador = authResult.user?.matricula

    const participantes = registro3pData.participantes
    delete registro3pData.participantes

    const { data: novoRegistro, error: errorRegistro } = await supabase
      .from('registros_3ps')
      .insert(registro3pData)
      .select(`
        *,
        area:locais(id, local, contrato),
        criador:usuarios!registros_3ps_matricula_criador_fkey(matricula, nome, email, funcao)
      `)
      .single()

    if (errorRegistro) {
      console.error('Erro ao criar registro 3P:', errorRegistro)
      return NextResponse.json({ error: 'Erro ao criar registro 3P' }, { status: 500 })
    }

    if (participantes.length > 0) {
      const participantesData = participantes.map((matricula: number) => ({
        registro_3p_id: novoRegistro.id,
        matricula_participante: matricula
      }))

      const { error: errorParticipantes } = await supabase
        .from('participantes_3ps')
        .insert(participantesData)

      if (errorParticipantes) {
        console.error('Erro ao adicionar participantes:', errorParticipantes)
      }
    }

    const { data: registroCompleto, error: errorCompleto } = await supabase
      .from('registros_3ps')
      .select(REGISTRO_3P_SELECT)
      .eq('id', novoRegistro.id)
      .single()

    if (errorCompleto) {
      console.error('Erro ao buscar registro completo:', errorCompleto)
      return NextResponse.json({
        success: true,
        data: novoRegistro,
        message: 'Registro 3P criado com sucesso'
      })
    }

    return NextResponse.json({
      success: true,
      data: registroCompleto,
      message: 'Registro 3P criado com sucesso'
    })
  } catch (error) {
    console.error('Erro na criacao do registro 3P:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
