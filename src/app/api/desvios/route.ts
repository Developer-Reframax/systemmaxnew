import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { getUserPermissions } from '@/lib/permissions-server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const SESMT_FUNCTIONALITY_SLUG = 'relatos-sesmt'

function normalizeForeignKey(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    return trimmed
  }

  return null
}

function normalizeContractValue(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

async function userHasSesmtPermission(
  user: NonNullable<Awaited<ReturnType<typeof verifyJWTToken>>['user']>
) {
  try {
    const permissions = await getUserPermissions(user)
    if (!permissions) {
      return false
    }

    return permissions.modulos.some((modulo) =>
      modulo.funcionalidades.some(
        (funcionalidade) => funcionalidade.slug === SESMT_FUNCTIONALITY_SLUG
      )
    )
  } catch (error) {
    console.error('Erro ao verificar permissao relatos-sesmt:', error)
    return false
  }
}

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
    const contratoParam = searchParams.get('contrato')
    const responsavel = searchParams.get('responsavel')
    const matricula_user = searchParams.get('matricula_user')
    const apenasEquipesSupervisionadas =
      searchParams.get('apenas_equipes_supervisionadas') === 'true'
    const meus = searchParams.get('meus') // Novo parâmetro para filtrar desvios do usuário
    const search = searchParams.get('search') // Parâmetro para busca por título, descrição ou local
    const potencial_local = searchParams.get('potencial_local') // Parâmetro para filtrar por gravidade/potencial local
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit
    const userContract = authResult.user?.contrato_raiz

    if (!userContract) {
      return NextResponse.json(
        { success: false, message: 'Contrato raiz do usuario nao encontrado' },
        { status: 400 }
      )
    }

    if (contratoParam && contratoParam !== userContract) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado para contrato diferente do usuario logado' },
        { status: 403 }
      )
    }

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
      .eq('contrato', userContract)
      .range(offset, offset + limit - 1)

    let countQuery = supabase
      .from('desvios')
      .select('*', { count: 'exact', head: true })
      .eq('contrato', userContract)

    if (apenasEquipesSupervisionadas) {
      const matricula = authResult.user?.matricula
      if (!matricula) {
        return NextResponse.json(
          { success: false, message: 'Matricula do usuario nao encontrada' },
          { status: 400 }
        )
      }

      const hasSesmtPermission = authResult.user
        ? await userHasSesmtPermission(authResult.user)
        : false

      // Usuario com relatos-sesmt pode avaliar qualquer desvio do contrato sem filtro por equipe.
      if (!hasSesmtPermission) {
        const { data: equipesSupervisionadas, error: equipesError } = await supabase
          .from('equipes')
          .select('id')
          .eq('codigo_contrato', userContract)
          .in('supervisor', [matricula, String(matricula)])

        if (equipesError) {
          console.error('Erro ao buscar equipes supervisionadas:', equipesError)
          return NextResponse.json(
            { success: false, message: 'Erro ao buscar equipes supervisionadas' },
            { status: 500 }
          )
        }

        const equipeIds = (equipesSupervisionadas || [])
          .map((equipe) => equipe.id)
          .filter(Boolean)

        if (equipeIds.length === 0) {
          return NextResponse.json({
            success: true,
            data: [],
            total: 0,
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0
            }
          })
        }

        query = query.in('equipe_id', equipeIds)
        countQuery = countQuery.in('equipe_id', equipeIds)
      }
    }

    // Aplicar filtros
    if (status) {
      query = query.eq('status', status)
      countQuery = countQuery.eq('status', status)
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
    const descricao = typeof body.descricao === 'string' ? body.descricao.trim() : ''
    const local = typeof body.local === 'string' ? body.local.trim() : ''
    const dataOcorrencia =
      typeof body.data_ocorrencia === 'string' && body.data_ocorrencia
        ? body.data_ocorrencia
        : new Date().toISOString().split('T')[0]
    const acao = typeof body.acao === 'string' ? body.acao.trim() : ''
    const natureza_id = normalizeForeignKey(body.natureza_id)
    const tipo_id = normalizeForeignKey(body.tipo_id)
    const riscoassociado_id = normalizeForeignKey(body.riscoassociado_id)
    const potencial = typeof body.potencial === 'string' ? body.potencial.trim() : ''
    const potencial_local =
      typeof body.potencial_local === 'string' ? body.potencial_local.trim() : null
    const ver_agir = Boolean(body.ver_agir)
    const acao_cliente = Boolean(body.acao_cliente)
    const gerou_recusa = Boolean(body.gerou_recusa)
    const matriculaUsuario = authResult.user?.matricula

    if (!matriculaUsuario) {
      return NextResponse.json(
        { success: false, message: 'Matricula do usuario autenticado nao encontrada' },
        { status: 400 }
      )
    }

    const { data: usuarioContrato, error: usuarioContratoError } = await supabase
      .from('usuarios')
      .select('contrato_raiz')
      .eq('matricula', matriculaUsuario)
      .single()

    if (usuarioContratoError || !usuarioContrato?.contrato_raiz) {
      return NextResponse.json(
        { success: false, message: 'Contrato raiz do usuario nao encontrado' },
        { status: 400 }
      )
    }

    const contratoUsuario = usuarioContrato.contrato_raiz.trim()

    // Validar campos obrigatórios
    if (!descricao || !natureza_id || !local || !riscoassociado_id || !tipo_id || !potencial) {
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

    const parsedDataOcorrencia = new Date(`${dataOcorrencia}T00:00:00`)
    const createdAtOcorrencia = new Date(`${dataOcorrencia}T12:00:00.000Z`)
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    if (
      Number.isNaN(parsedDataOcorrencia.getTime()) ||
      Number.isNaN(createdAtOcorrencia.getTime()) ||
      parsedDataOcorrencia > hoje
    ) {
      return NextResponse.json(
        { success: false, message: 'Data de ocorrencia invalida' },
        { status: 400 }
      )
    }

    const [
      { data: natureza, error: naturezaError },
      { data: risco, error: riscoError }
    ] = await Promise.all([
      supabase
        .from('natureza')
        .select('id, contrato, natureza')
        .eq('id', natureza_id)
        .single(),
      supabase.from('riscos_associados').select('id').eq('id', riscoassociado_id).single()
    ])

    let naturezaValidada = natureza
    let naturezaIdResolvido = natureza_id

    if (
      !naturezaError &&
      natureza &&
      normalizeContractValue(natureza.contrato) !== normalizeContractValue(contratoUsuario) &&
      natureza.natureza
    ) {
      const { data: naturezaFallback } = await supabase
        .from('natureza')
        .select('id, contrato, natureza')
        .eq('natureza', natureza.natureza)
        .eq('contrato', contratoUsuario)
        .maybeSingle()

      if (naturezaFallback) {
        naturezaValidada = naturezaFallback
        naturezaIdResolvido = naturezaFallback.id
      }
    }

    if (
      naturezaError ||
      !naturezaValidada ||
      normalizeContractValue(naturezaValidada.contrato) !== normalizeContractValue(contratoUsuario)
    ) {
      return NextResponse.json(
        { success: false, message: 'Natureza invalida para o contrato do usuario' },
        { status: 400 }
      )
    }

    if (riscoError || !risco) {
      return NextResponse.json(
        { success: false, message: 'Risco associado invalido' },
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
        created_at: createdAtOcorrencia.toISOString(),
        natureza_id: naturezaIdResolvido,
        contrato: contratoUsuario,
        local,
        riscoassociado_id,
        tipo_id,
        potencial,
        ver_agir,
        acao_cliente,
        gerou_recusa,
        potencial_local,
        acao: acao || null,
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

