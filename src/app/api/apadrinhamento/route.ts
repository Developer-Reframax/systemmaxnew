import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Configuração do Supabase com Service Role Key para bypass do RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// GET /api/apadrinhamento - Listar apadrinhamentos com filtros e paginação
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const tipo = searchParams.get('tipo')
    const supervisor = searchParams.get('supervisor')
    const search = searchParams.get('search')

    // Calcular offset para paginação
    const offset = (page - 1) * limit

    // Construir query base
    let query = supabase
      .from('apadrinhamentos')
      .select(`
        *,
        novato:usuarios!apadrinhamentos_matricula_novato_fkey(matricula, nome),
        padrinho:usuarios!apadrinhamentos_matricula_padrinho_fkey(matricula, nome),
        supervisor_info:usuarios!apadrinhamentos_matricula_supervisor_fkey(matricula, nome)
      `, { count: 'exact' })

    // Aplicar filtros
    if (status) {
      query = query.eq('status', status)
    }

    if (tipo) {
      query = query.eq('tipo_apadrinhamento', tipo)
    }

    if (supervisor) {
      query = query.eq('matricula_supervisor', supervisor)
    }

    // Busca por nome do novato ou padrinho
    if (search) {
      query = query.or(`
        novato.nome.ilike.%${search}%,
        padrinho.nome.ilike.%${search}%
      `)
    }

    // Aplicar paginação e ordenação
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Erro ao buscar apadrinhamentos:', error)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

    // Calcular total de páginas
    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      totalPages,
      limit
    })

  } catch (error) {
    console.error('Erro na API de apadrinhamentos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/apadrinhamento - Criar novo apadrinhamento
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      matricula_novato,
      matricula_padrinho,
      matricula_supervisor,
      tipo_apadrinhamento,
      data_inicio,
      observacoes
    } = body

    // Validações obrigatórias
    if (!matricula_novato || !matricula_padrinho || !matricula_supervisor || !tipo_apadrinhamento || !data_inicio) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: matricula_novato, matricula_padrinho, matricula_supervisor, tipo_apadrinhamento, data_inicio' },
        { status: 400 }
      )
    }

    // Validar tipo de apadrinhamento
    const tiposValidos = ['Novo colaborador', 'Novo operador de ponte', 'Novo operador de empilhadeira']
    if (!tiposValidos.includes(tipo_apadrinhamento)) {
      return NextResponse.json(
        { error: 'Tipo de apadrinhamento inválido' },
        { status: 400 }
      )
    }

    // Verificar se o novato já possui apadrinhamento ativo
    const { data: apadrinhamentoExistente } = await supabase
      .from('apadrinhamentos')
      .select('id')
      .eq('matricula_novato', matricula_novato)
      .eq('status', 'Ativo')
      .single()

    if (apadrinhamentoExistente) {
      return NextResponse.json(
        { error: 'Este colaborador já possui um apadrinhamento ativo' },
        { status: 400 }
      )
    }

    // Verificar se as matrículas existem na tabela usuarios
    const { data: usuarios } = await supabase
      .from('usuarios')
      .select('matricula')
      .in('matricula', [matricula_novato, matricula_padrinho, matricula_supervisor])

    const matriculasEncontradas = usuarios?.map(u => u.matricula) || []
    
    if (!matriculasEncontradas.includes(matricula_novato)) {
      return NextResponse.json(
        { error: 'Matrícula do novato não encontrada' },
        { status: 400 }
      )
    }

    if (!matriculasEncontradas.includes(matricula_padrinho)) {
      return NextResponse.json(
        { error: 'Matrícula do padrinho não encontrada' },
        { status: 400 }
      )
    }

    if (!matriculasEncontradas.includes(matricula_supervisor)) {
      return NextResponse.json(
        { error: 'Matrícula do supervisor não encontrada' },
        { status: 400 }
      )
    }

    // Criar apadrinhamento
    const { data, error } = await supabase
      .from('apadrinhamentos')
      .insert({
        matricula_novato,
        matricula_padrinho,
        matricula_supervisor,
        tipo_apadrinhamento,
        data_inicio,
        observacoes: observacoes || null
      })
      .select(`
        *,
        novato:usuarios!apadrinhamentos_matricula_novato_fkey(matricula, nome),
        padrinho:usuarios!apadrinhamentos_matricula_padrinho_fkey(matricula, nome),
        supervisor_info:usuarios!apadrinhamentos_matricula_supervisor_fkey(matricula, nome)
      `)
      .single()

    if (error) {
      console.error('Erro ao criar apadrinhamento:', error)
      return NextResponse.json(
        { error: 'Erro ao criar apadrinhamento' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })

  } catch (error) {
    console.error('Erro na criação de apadrinhamento:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
