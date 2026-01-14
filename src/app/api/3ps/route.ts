import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface Registro3PFiltros {
  data_inicio?: string
  data_fim?: string
  area_id?: string
  matricula_criador?: number
  atividade_segura?: boolean
  page?: number
  limit?: number
}

// GET - Buscar registros 3P's com filtros e paginação
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    // Extrair parâmetros de filtro
    const filtros: Registro3PFiltros = {
      data_inicio: searchParams.get('data_inicio') || undefined,
      data_fim: searchParams.get('data_fim') || undefined,
      area_id: searchParams.get('area_id') || undefined,
      matricula_criador: searchParams.get('matricula_criador') ? 
        parseInt(searchParams.get('matricula_criador')!) : undefined,
      atividade_segura: searchParams.get('atividade_segura') === 'true' ? true : 
        searchParams.get('atividade_segura') === 'false' ? false : undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10')
    }

    // Construir query base
    let query = supabase
      .from('registros_3ps')
      .select(`
        *,
        area:locais(id, local, contrato),
        criador:usuarios!registros_3ps_matricula_criador_fkey(matricula, nome, email, funcao),
        participantes:participantes_3ps(
          id,
          matricula_participante,
          participante:usuarios!participantes_3ps_matricula_participante_fkey(matricula, nome, email, funcao)
        )
      `, { count: 'exact' })

    // Aplicar filtros
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

    // Aplicar paginação
    const from = ((filtros.page || 1) - 1) * (filtros.limit || 10)
    const to = from + (filtros.limit || 10) - 1

    // Executar query com paginação
    const { data: registros3ps, error, count } = await query
      .range(from, to)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar registros 3P\'s:', error)
      return NextResponse.json({ error: 'Erro ao buscar registros 3P\'s' }, { status: 500 })
    }

    // Calcular informações de paginação
    const totalPages = Math.ceil((count || 0) / (filtros.limit || 10))
    const hasNextPage = (filtros.page || 1) < totalPages
    const hasPrevPage = (filtros.page || 1) > 1

    return NextResponse.json({
      success: true,
      data: registros3ps,
      pagination: {
        currentPage: filtros.page || 1,
        totalPages,
        totalItems: count || 0,
        itemsPerPage: filtros.limit || 10,
        hasNextPage,
        hasPrevPage
      }
    })
  } catch (error) {
    console.error('Erro na API de registros 3P\'s:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST - Criar novo registro 3P
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const registro3pData = await request.json()

    // Validar campos obrigatórios
    const camposObrigatorios = [
      'area_id', 'atividade', 'paralisacao_realizada', 'riscos_avaliados',
      'ambiente_avaliado', 'passo_descrito', 'hipoteses_levantadas', 'atividade_segura', 'tipo'
    ]

    for (const campo of camposObrigatorios) {
      if (registro3pData[campo] === undefined || registro3pData[campo] === null) {
        return NextResponse.json({ 
          error: `Campo obrigatório não informado: ${campo}` 
        }, { status: 400 })
      }
    }

    // Validar que os campos boolean são realmente boolean
    const camposBoolean = [
      'paralisacao_realizada', 'riscos_avaliados', 'ambiente_avaliado',
      'passo_descrito', 'hipoteses_levantadas', 'atividade_segura'
    ]

    for (const campo of camposBoolean) {
      if (typeof registro3pData[campo] !== 'boolean') {
        return NextResponse.json({ 
          error: `Campo ${campo} deve ser verdadeiro ou falso` 
        }, { status: 400 })
      }
    }

    const tiposValidos = ['Melhoria', 'Aprendizado']
    if (!tiposValidos.includes(registro3pData.tipo)) {
      return NextResponse.json({ 
        error: 'Campo tipo deve ser Melhoria ou Aprendizado' 
      }, { status: 400 })
    }

    // Validar que participantes é um array
    if (!Array.isArray(registro3pData.participantes)) {
      return NextResponse.json({ 
        error: 'Participantes deve ser uma lista' 
      }, { status: 400 })
    }

    // Adicionar matricula do criador automaticamente
    registro3pData.matricula_criador = authResult.user?.matricula

    // Extrair participantes para inserir separadamente
    const participantes = registro3pData.participantes
    delete registro3pData.participantes

    // Inserir registro 3P
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

    // Inserir participantes se houver
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
        // Não falhar a operação, apenas logar o erro
      }
    }

    // Buscar registro completo com participantes
    const { data: registroCompleto, error: errorCompleto } = await supabase
      .from('registros_3ps')
      .select(`
        *,
        area:locais(id, local, contrato),
        criador:usuarios!registros_3ps_matricula_criador_fkey(matricula, nome, email, funcao),
        participantes:participantes_3ps(
          id,
          matricula_participante,
          participante:usuarios!participantes_3ps_matricula_participante_fkey(matricula, nome, email, funcao)
        )
      `)
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
    console.error('Erro na criação do registro 3P:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
