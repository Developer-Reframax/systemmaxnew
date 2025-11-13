import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Listar todos os locais
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const contrato = searchParams.get('contrato')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    let query = supabase
      .from('locais')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Filtrar por contrato se especificado
    if (contrato) {
      query = query.eq('contrato', contrato)
    }

    // Filtrar por busca se especificado
    if (search) {
      query = query.ilike('local', `%${search}%`)
    }

    // Aplicar paginação
    query = query.range(offset, offset + limit - 1)

    const { data: locais, error, count } = await query

    if (error) {
      console.error('Erro ao buscar locais:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar locais' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: locais,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit)
    })

  } catch (error) {
    console.error('Locations GET API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar novo local
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    // Verificar se o usuário tem permissão (Admin ou Editor)
    if (!authResult.user || !['Admin', 'Editor'].includes(authResult.user.role)) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado - permissão insuficiente' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { local, contrato } = body

    // Validar campos obrigatórios
    if (!local || !contrato) {
      return NextResponse.json(
        { success: false, message: 'Local e contrato são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar tamanho do campo local
    if (local.length > 100) {
      return NextResponse.json(
        { success: false, message: 'Nome do local deve ter no máximo 100 caracteres' },
        { status: 400 }
      )
    }

    // Verificar se já existe um local com o mesmo nome no mesmo contrato
    const { data: existing} = await supabase
      .from('locais')
      .select('id')
      .eq('local', local)
      .eq('contrato', contrato)
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Já existe um local com este nome neste contrato' },
        { status: 409 }
      )
    }

    // Criar novo local
    const { data: newLocal, error } = await supabase
      .from('locais')
      .insert({
        local,
        contrato,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar local:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao criar local' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Local criado com sucesso',
      data: newLocal
    }, { status: 201 })

  } catch (error) {
    console.error('Locations POST API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
