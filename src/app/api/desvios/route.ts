import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Listar desvios
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
    const status = searchParams.get('status')
    const contrato = searchParams.get('contrato')
    const responsavel = searchParams.get('responsavel')
    const matricula_user = searchParams.get('matricula_user')
    const meus = searchParams.get('meus') // Novo parâmetro para filtrar desvios do usuário
    const search = searchParams.get('search') // Parâmetro para busca por título, descrição ou local
    const potencial_local = searchParams.get('potencial_local') // Parâmetro para filtrar por gravidade/potencial local
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    let query = supabase
      .from('desvios')
      .select(`
        *,
        natureza:natureza_id(id, natureza),
        tipo:tipo_id(id, tipo),
        risco_associado:riscoassociado_id(id, risco_associado),
        equipe:equipe_id(id, equipe),
        criador:matricula_user(matricula, nome, email)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    let countQuery = supabase
      .from('desvios')
      .select('*', { count: 'exact', head: true })

    // Aplicar filtros
    if (status) {
      query = query.eq('status', status)
      countQuery = countQuery.eq('status', status)
    }
    if (contrato) {
      query = query.eq('contrato', contrato)
      countQuery = countQuery.eq('contrato', contrato)
    }
    if (responsavel) {
      query = query.eq('responsavel', responsavel)
      countQuery = countQuery.eq('responsavel', responsavel)
    }
    if (matricula_user) {
      query = query.eq('matricula_user', matricula_user)
      countQuery = countQuery.eq('matricula_user', matricula_user)
    }
    // Filtrar apenas desvios do usuário logado quando meus=true
    if (meus === 'true' && authResult.user?.matricula) {
      query = query.eq('matricula_user', authResult.user.matricula)
      countQuery = countQuery.eq('matricula_user', authResult.user.matricula)
    }
    // Filtro de busca por título, descrição ou local
    if (search) {
      query = query.or(`descricao.ilike.%${search}%,local.ilike.%${search}%`)
      countQuery = countQuery.or(`descricao.ilike.%${search}%,local.ilike.%${search}%`)
    }
    // Filtro por potencial local (gravidade)
    if (potencial_local) {
      query = query.eq('potencial_local', potencial_local)
      countQuery = countQuery.eq('potencial_local', potencial_local)
    }

    const [{ data: desvios, error }, { count, error: countError }] = await Promise.all([
      query,
      countQuery
    ])

    if (error || countError) {
      console.error('Erro ao buscar desvios:', error || countError)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar desvios' },
        { status: 500 }
      )
    }

    // Buscar nomes dos responsáveis individualmente
    const desviosComResponsaveis = await Promise.all(
      (desvios || []).map(async (desvio) => {
        if (desvio.responsavel) {
          try {
            const { data: responsavelData, error: responsavelError } = await supabase
              .from('usuarios')
              .select('nome')
              .eq('matricula', desvio.responsavel)
              .single()

            if (!responsavelError && responsavelData) {
              return {
                ...desvio,
                responsavel_nome: responsavelData.nome
              }
            }
          } catch (err) {
            console.error(`Erro ao buscar responsável ${desvio.responsavel}:`, err)
          }
        }
        
        return {
          ...desvio,
          responsavel_nome: null
        }
      })
    )

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      success: true,
      data: desviosComResponsaveis,
      total: count || 0,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages
      }
    })

  } catch (error) {
    console.error('Desvios GET API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar desvio
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    const body = await request.json()
    const {
      descricao,
      natureza_id,
      contrato,
      local,
      riscoassociado_id,
      tipo_id,
      potencial,
      ver_agir = false,
      acao_cliente = false,
      gerou_recusa = false,
      potencial_local
    } = body

    // Validar campos obrigatórios
    if (!descricao || !natureza_id || !contrato || !local || !riscoassociado_id || !tipo_id || !potencial) {
      return NextResponse.json(
        { success: false, message: 'Todos os campos obrigatórios devem ser preenchidos' },
        { status: 400 }
      )
    }

    // Validar potencial
    const validPotenciais = ['Intolerável', 'Substancial', 'Moderado', 'Trivial']
    if (!validPotenciais.includes(potencial)) {
      return NextResponse.json(
        { success: false, message: 'Potencial inválido' },
        { status: 400 }
      )
    }

    // Determinar status inicial baseado em ver_agir
    const status = ver_agir ? 'Concluído' : 'Aguardando Avaliação'
    const data_conclusao = ver_agir ? new Date().toISOString() : null

    //Busca equipe do Usuario logado
    const { data: equipe, error: equipeError } = await supabase
      .from('usuarios')
      .select('equipe_id')
      .eq('matricula', authResult.user?.matricula)
      .single()

    if (equipeError || !equipe) {
      return NextResponse.json(
        { success: false, message: 'Equipe não encontrada' },
        { status: 404 }
      )
    }

    // Criar desvio
    const { data: newDesvio, error } = await supabase
      .from('desvios')
      .insert({
        matricula_user: authResult.user?.matricula,
        descricao,
        natureza_id,
        contrato,
        local,
        riscoassociado_id,
        tipo_id,
        potencial,
        ver_agir,
        acao_cliente,
        gerou_recusa,
        potencial_local,
        status,
        data_conclusao,
        equipe_id: equipe.equipe_id
      })
      .select(`
        *,
        natureza:natureza_id(id, natureza),
        tipo:tipo_id(id, tipo),
        risco_associado:riscoassociado_id(id, risco_associado)
      `)
      .single()

    if (error) {
      console.error('Erro ao criar desvio:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao criar desvio' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Desvio criado com sucesso',
      data: newDesvio
    }, { status: 201 })

  } catch (error) {
    console.error('Desvios POST API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar desvio
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o desvio existe
    const { data: existingDesvio, error: checkError } = await supabase
      .from('desvios')
      .select('*')
      .eq('id', id)
      .single()

    if (checkError || !existingDesvio) {
      return NextResponse.json(
        { success: false, message: 'Desvio não encontrado' },
        { status: 404 }
      )
    }

    // Verificar permissão - usuário pode editar apenas seus próprios desvios ou ser Admin/Editor
    const userRole = authResult.user?.role
    const isOwner = existingDesvio.matricula_user === authResult.user?.matricula
    const hasPermission = ['Admin', 'Editor'].includes(userRole || '') || isOwner

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado - permissão insuficiente' },
        { status: 403 }
      )
    }

    // Atualizar desvio
    const { data: updatedDesvio, error } = await supabase
      .from('desvios')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        natureza:natureza_id(id, natureza),
        tipo:tipo_id(id, tipo),
        risco_associado:riscoassociado_id(id, risco_associado)
      `)
      .single()

    if (error) {
      console.error('Erro ao atualizar desvio:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao atualizar desvio' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Desvio atualizado com sucesso',
      data: updatedDesvio
    })

  } catch (error) {
    console.error('Desvios PUT API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir desvio
export async function DELETE(request: NextRequest) {
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
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o desvio existe
    const { data: existingDesvio, error: checkError } = await supabase
      .from('desvios')
      .select('id')
      .eq('id', id)
      .single()

    if (checkError || !existingDesvio) {
      return NextResponse.json(
        { success: false, message: 'Desvio não encontrado' },
        { status: 404 }
      )
    }

    // Excluir desvio (as imagens serão excluídas automaticamente por CASCADE)
    const { error } = await supabase
      .from('desvios')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao excluir desvio:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao excluir desvio' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Desvio excluído com sucesso'
    })

  } catch (error) {
    console.error('Desvios DELETE API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
