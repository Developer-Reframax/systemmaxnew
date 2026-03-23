import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { getUserPermissions } from '@/lib/permissions-server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const SESMT_FUNCTIONALITY_SLUG = 'relatos-sesmt'

async function userHasSesmtPermission(
  user: NonNullable<Awaited<ReturnType<typeof verifyJWTToken>>['user']>
) {
  try {
    const permissions = await getUserPermissions(user)
    if (!permissions) return false

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

async function userIsSupervisorOfTeam(userMatricula: number, equipeId?: string | null) {
  if (!equipeId) return false

  const { data: equipe, error } = await supabase
    .from('equipes')
    .select('id')
    .eq('id', equipeId)
    .in('supervisor', [userMatricula, String(userMatricula)])
    .maybeSingle()

  if (error) {
    console.error('Erro ao validar supervisor da equipe:', error)
    return false
  }

  return !!equipe
}

async function canEvaluateDesvio(
  user: NonNullable<Awaited<ReturnType<typeof verifyJWTToken>>['user']>,
  equipeId?: string | null
) {
  const isAdminOrEditor = ['Admin', 'Editor'].includes(user.role)
  if (isAdminOrEditor) return true

  const hasSesmtPermission = await userHasSesmtPermission(user)
  if (hasSesmtPermission) return true

  return userIsSupervisorOfTeam(user.matricula, equipeId)
}

// PUT - Avaliar desvio
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    if (!authResult.user) {
      return NextResponse.json(
        { success: false, message: 'Usuario nao autenticado' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { responsavel, data_limite, acao, observacao } = body

    if (!responsavel) {
      return NextResponse.json(
        { success: false, message: 'Responsavel e obrigatorio' },
        { status: 400 }
      )
    }

    const { data: existingDesvio, error: checkError } = await supabase
      .from('desvios')
      .select('*')
      .eq('id', id)
      .single()

    if (checkError || !existingDesvio) {
      return NextResponse.json(
        { success: false, message: 'Desvio nao encontrado' },
        { status: 404 }
      )
    }

    if (existingDesvio.status !== 'Aguardando Avaliação') {
      return NextResponse.json(
        { success: false, message: 'Este desvio nao esta aguardando avaliacao' },
        { status: 400 }
      )
    }

    const canEvaluate = await canEvaluateDesvio(authResult.user, existingDesvio.equipe_id)
    if (!canEvaluate) {
      return NextResponse.json(
        {
          success: false,
          message: 'Acesso negado - apenas Admin/Editor, supervisor da equipe ou SESMT podem avaliar desvios'
        },
        { status: 403 }
      )
    }

    const { data: responsavelUser, error: userError } = await supabase
      .from('usuarios')
      .select('matricula, nome')
      .eq('matricula', responsavel)
      .single()

    if (userError || !responsavelUser) {
      return NextResponse.json(
        { success: false, message: 'Responsavel nao encontrado no sistema' },
        { status: 400 }
      )
    }

    let dataLimite = null
    if (data_limite) {
      dataLimite = new Date(data_limite)
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)

      if (dataLimite < hoje) {
        return NextResponse.json(
          { success: false, message: 'Data limite deve ser futura' },
          { status: 400 }
        )
      }
    }

    const { data: config } = await supabase
      .from('configuracoes_desvios')
      .select('prazo_padrao_dias')
      .eq('contrato', existingDesvio.contrato)
      .single()

    let finalDataLimite = dataLimite
    if (!finalDataLimite && config?.prazo_padrao_dias) {
      finalDataLimite = new Date()
      finalDataLimite.setDate(finalDataLimite.getDate() + config.prazo_padrao_dias)
    }

    const updateData = {
      responsavel,
      data_limite: finalDataLimite ? finalDataLimite.toISOString() : null,
      status: 'Em Andamento',
      acao: acao || null,
      observacao: observacao || null,
      updated_at: new Date().toISOString(),
      ...(body.potencial && { potencial: body.potencial }),
      ...(body.potencial_local && { potencial_local: body.potencial_local })
    }

    const { data: updatedDesvio, error } = await supabase
      .from('desvios')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        natureza:natureza_id(id, natureza),
        tipo:tipo_id(id, tipo),
        risco_associado:riscoassociado_id(id, risco_associado),
        equipe:equipe_id(id, equipe)
      `)
      .single()

    if (error) {
      console.error('Erro ao avaliar desvio:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao avaliar desvio' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Desvio avaliado com sucesso',
      data: {
        ...updatedDesvio,
        responsavel_info: responsavelUser
      }
    })
  } catch (error) {
    console.error('Avaliar desvio API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// GET - Obter detalhes do desvio para avaliacao
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    if (!authResult.user) {
      return NextResponse.json(
        { success: false, message: 'Usuario nao autenticado' },
        { status: 401 }
      )
    }

    const { id } = await params

    const { data: desvio, error } = await supabase
      .from('desvios')
      .select(`
        *,
        natureza:natureza_id(id, natureza),
        tipo:tipo_id(id, tipo),
        risco_associado:riscoassociado_id(id, risco_associado),
        equipe:equipe_id(id, equipe),
        imagens:imagens_desvios(id, categoria, nome_arquivo, url_storage, created_at)
      `)
      .eq('id', id)
      .single()

    if (error || !desvio) {
      return NextResponse.json(
        { success: false, message: 'Desvio nao encontrado' },
        { status: 404 }
      )
    }

    const canEvaluate = await canEvaluateDesvio(authResult.user, desvio.equipe_id)
    if (!canEvaluate) {
      return NextResponse.json(
        {
          success: false,
          message: 'Acesso negado - apenas Admin/Editor, supervisor da equipe ou SESMT podem acessar'
        },
        { status: 403 }
      )
    }

    const { data: criador } = await supabase
      .from('usuarios')
      .select('matricula, nome, email')
      .eq('matricula', desvio.matricula_user)
      .single()

    let responsavelInfo = null
    if (desvio.responsavel) {
      const { data: resp } = await supabase
        .from('usuarios')
        .select('matricula, nome, email')
        .eq('matricula', desvio.responsavel)
        .single()
      responsavelInfo = resp
    }

    const { data: config } = await supabase
      .from('configuracoes_desvios')
      .select('*')
      .eq('contrato', desvio.contrato)
      .single()

    return NextResponse.json({
      success: true,
      data: {
        ...desvio,
        criador_info: criador,
        responsavel_info: responsavelInfo,
        configuracoes: config
      }
    })
  } catch (error) {
    console.error('Get desvio para avaliacao API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
