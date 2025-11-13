import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

    // Verificar se o usuário tem permissão (Admin ou Editor)
    if (!authResult.user || !['Admin', 'Editor'].includes(authResult.user.role)) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado - apenas Admin ou Editor podem avaliar desvios' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const {
      responsavel,
      data_limite,
      acao,
      observacao
    } = body

    // Validar campos obrigatórios
    if (!responsavel) {
      return NextResponse.json(
        { success: false, message: 'Responsável é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o desvio existe e está aguardando avaliação
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

    if (existingDesvio.status !== 'Aguardando Avaliação') {
      return NextResponse.json(
        { success: false, message: 'Este desvio não está aguardando avaliação' },
        { status: 400 }
      )
    }

    // Verificar se o responsável existe na tabela de usuários
    const { data: responsavelUser, error: userError } = await supabase
      .from('usuarios')
      .select('matricula, nome')
      .eq('matricula', responsavel)
      .single()

    if (userError || !responsavelUser) {
      return NextResponse.json(
        { success: false, message: 'Responsável não encontrado no sistema' },
        { status: 400 }
      )
    }

    // Validar data limite (deve ser futura, se fornecida)
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

    // Buscar configurações do contrato para definir prazo padrão se necessário
    const { data: config } = await supabase
      .from('configuracoes_desvios')
      .select('prazo_padrao_dias')
      .eq('contrato', existingDesvio.contrato)
      .single()

    // Se não foi fornecida data limite, usar prazo padrão das configurações
    let finalDataLimite = dataLimite
    if (!finalDataLimite && config?.prazo_padrao_dias) {
      finalDataLimite = new Date()
      finalDataLimite.setDate(finalDataLimite.getDate() + config.prazo_padrao_dias)
    }

    // Atualizar desvio com avaliação
    const updateData = {
      responsavel,
      data_limite: finalDataLimite ? finalDataLimite.toISOString() : null,
      status: 'Em Andamento',
      acao: acao || null,
      observacao: observacao || null,
      updated_at: new Date().toISOString(),
      // Incluir campos de potencial se fornecidos
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

// GET - Obter detalhes do desvio para avaliação
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

    // Verificar se o usuário tem permissão (Admin ou Editor)
    if (!authResult.user || !['Admin', 'Editor'].includes(authResult.user.role)) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado - apenas Admin ou Editor podem acessar' },
        { status: 403 }
      )
    }

    const { id } = await params

    console.log('🔍 [API] Buscando desvio com ID:', id)

    // Buscar desvio com informações relacionadas
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

    console.log('📊 [API] Resultado da query:', { desvio, error })

    if (error || !desvio) {
      console.error('❌ [API] Desvio não encontrado:', { id, error })
      return NextResponse.json(
        { success: false, message: 'Desvio não encontrado' },
        { status: 404 }
      )
    }

    console.log('✅ [API] Desvio encontrado:', desvio.id, desvio.titulo)

    // Buscar informações do usuário que criou o desvio
    console.log('👤 [API] Buscando criador com matrícula:', desvio.matricula_user)
    const { data: criador, error: criadorError } = await supabase
      .from('usuarios')
      .select('matricula, nome, email')
      .eq('matricula', desvio.matricula_user)
      .single()

    console.log('👤 [API] Resultado busca criador:', { criador, criadorError })

    // Buscar informações do responsável se já foi definido
    let responsavelInfo = null
    if (desvio.responsavel) {
      const { data: resp } = await supabase
        .from('usuarios')
        .select('matricula, nome, email')
        .eq('matricula', desvio.responsavel)
        .single()
      responsavelInfo = resp
    }

    // Buscar configurações do contrato
    const { data: config } = await supabase
      .from('configuracoes_desvios')
      .select('*')
      .eq('contrato', desvio.contrato)
      .single()

    const responseData = {
      ...desvio,
      criador_info: criador,
      responsavel_info: responsavelInfo,
      configuracoes: config
    }

    console.log('📤 [API] Retornando dados:', {
      id: responseData.id,
      titulo: responseData.titulo,
      criador_info: responseData.criador_info,
      hasImages: responseData.imagens?.length || 0
    })

    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    console.error('Get desvio para avaliação API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}