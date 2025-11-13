import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'
import { validarHierarquiaParaTratativa } from '@/lib/services/alertas'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Listar tratativas
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
    const alertaId = searchParams.get('alerta_id')
    const all = searchParams.get('all') === 'true'
    const nome = searchParams.get('nome')
    const dataInicio = searchParams.get('data_inicio')
    const dataFim = searchParams.get('data_fim')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || (all ? '20' : '10'))
    const offset = (page - 1) * limit

    let query = supabase
      .from('tratativas_emociograma')
      .select(`
        *
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    let countQuery = supabase
      .from('tratativas_emociograma')
      .select('*', { count: 'exact', head: true })

    // Filtrar por alerta específico se fornecido
    if (alertaId) {
      query = query.eq('alerta_id', alertaId)
      countQuery = countQuery.eq('alerta_id', alertaId)
    }

    // Filtros por data se fornecidos
    if (dataInicio) {
      query = query.gte('data_tratativa', dataInicio)
      countQuery = countQuery.gte('data_tratativa', dataInicio)
    }
    if (dataFim) {
      query = query.lte('data_tratativa', dataFim + 'T23:59:59.999Z')
      countQuery = countQuery.lte('data_tratativa', dataFim + 'T23:59:59.999Z')
    }

    // Verificar permissões - apenas líderes, supervisores e admins podem ver tratativas
    const { data: userData } = await supabase
      .from('usuarios')
      .select('role, equipe_id, letra_id')
      .eq('matricula', authResult.user?.matricula)
      .single()

    if (!userData || !['Lider', 'Supervisor', 'Admin', 'Editor'].includes(userData.role)) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado. Apenas líderes e supervisores podem visualizar tratativas.' },
        { status: 403 }
      )
    }

    // Para líderes e supervisores, sempre filtrar por equipe/letra
    // Para admins/editores, só aplicar filtro se all=false
    if (['Lider', 'Supervisor'].includes(userData.role) || (!all && ['Admin', 'Editor'].includes(userData.role))) {
      // Buscar alertas da equipe/letra do usuário
      let alertasPermitidos: string[] = []
      
      if (userData.equipe_id) {
        // Buscar matrículas da equipe primeiro
        const { data: equipeMembros } = await supabase
          .from('usuarios')
          .select('matricula')
          .eq('equipe_id', userData.equipe_id)
        
        const matriculasEquipe = equipeMembros?.map(m => m.matricula) || []
        
        const { data: alertasEquipe } = await supabase
          .from('alertas_emociograma')
          .select('id')
          .in('usuario_matricula', matriculasEquipe)
        
        if (alertasEquipe) {
          alertasPermitidos = [...alertasPermitidos, ...alertasEquipe.map(a => a.id)]
        }
      }
      
      if (userData.letra_id) {
        // Buscar matrículas da letra primeiro
        const { data: letraMembros } = await supabase
          .from('usuarios')
          .select('matricula')
          .eq('letra_id', userData.letra_id)
        
        const matriculasLetra = letraMembros?.map(m => m.matricula) || []
        
        const { data: alertasLetra } = await supabase
          .from('alertas_emociograma')
          .select('id')
          .in('usuario_matricula', matriculasLetra)
        
        if (alertasLetra) {
          alertasPermitidos = [...alertasPermitidos, ...alertasLetra.map(a => a.id)]
        }
      }

      if (alertasPermitidos.length > 0) {
        query = query.in('alerta_id', alertasPermitidos)
        countQuery = countQuery.in('alerta_id', alertasPermitidos)
      } else {
        // Se não tem alertas permitidos, retorna vazio
        return NextResponse.json({
          success: true,
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0
          }
        })
      }
    }

    const [{ data: tratativas, error }, { count, error: countError }] = await Promise.all([
      query,
      countQuery
    ])

    if (error || countError) {
      console.error('Erro ao buscar tratativas:', error || countError)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar tratativas' },
        { status: 500 }
      )
    }

    // Buscar dados dos alertas e usuários separadamente
    const tratativasComDados = await Promise.all(
      (tratativas || []).map(async (tratativa) => {
        // Buscar dados do alerta
        const { data: alerta } = await supabase
          .from('alertas_emociograma')
          .select('id, usuario_matricula, usuario_nome, estado_emocional, observacoes, created_at')
          .eq('id', tratativa.alerta_id)
          .single()

        // Buscar dados do responsável
        const { data: responsavel } = await supabase
          .from('usuarios')
          .select('matricula, nome, email, role')
          .eq('matricula', tratativa.matricula_tratador)
          .single()

        return {
          ...tratativa,
          alerta: alerta ? {
            ...alerta,
            usuario: {
              matricula: alerta.usuario_matricula,
              nome: alerta.usuario_nome,
              email: '' // Não temos email na tabela alertas_emociograma
            }
          } : null,
          responsavel: responsavel || null
        }
      })
    )

    // Filtrar por nome se fornecido
    let tratativasFiltradas = tratativasComDados
    if (nome) {
      tratativasFiltradas = tratativasComDados.filter(tratativa => 
        tratativa.alerta?.usuario?.nome?.toLowerCase().includes(nome.toLowerCase()) ||
        tratativa.responsavel?.nome?.toLowerCase().includes(nome.toLowerCase())
      )
    }

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      success: true,
      data: tratativasFiltradas,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages
      }
    })

  } catch (error) {
    console.error('Tratativas GET API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar tratativa
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
    const { alerta_id, tipo_tratativa, descricao, acao_tomada } = body

    // Validar campos obrigatórios
    if (!alerta_id || !tipo_tratativa || !descricao || !acao_tomada) {
      return NextResponse.json(
        { success: false, message: 'Campos obrigatórios: alerta_id, tipo_tratativa, descricao, acao_tomada' },
        { status: 400 }
      )
    }

    // Validar tipo de tratativa
    const validTipos = ['conversa', 'encaminhamento', 'acompanhamento', 'orientacao']
    if (!validTipos.includes(tipo_tratativa)) {
      return NextResponse.json(
        { success: false, message: 'Tipo de tratativa inválido' },
        { status: 400 }
      )
    }

    // Buscar o alerta para validar permissões
    const { data: alerta, error: alertaError } = await supabase
      .from('alertas_emociograma')
      .select('usuario_matricula, status')
      .eq('id', alerta_id)
      .single()

    if (alertaError || !alerta) {
      return NextResponse.json(
        { success: false, message: 'Alerta não encontrado' },
        { status: 404 }
      )
    }

    // Validar hierarquia - apenas líderes e supervisores podem criar tratativas
    if (!authResult.user?.matricula) {
      return NextResponse.json(
        { success: false, message: 'Usuário não identificado' },
        { status: 401 }
      )
    }

    const podeTratar = await validarHierarquiaParaTratativa(
      Number(authResult.user.matricula),
      alerta.usuario_matricula
    )

    if (!podeTratar) {
      return NextResponse.json(
        { success: false, message: 'Você não tem permissão para tratar este alerta' },
        { status: 403 }
      )
    }

    // Buscar emociograma_id do alerta existente
    const { data: alertaData, error: alertaDataError } = await supabase
      .from('alertas_emociograma')
      .select('emociograma_id')
      .eq('id', alerta_id)
      .single()

    if (alertaDataError || !alertaData || !alertaData.emociograma_id) {
      return NextResponse.json(
        { success: false, message: 'Emociograma associado ao alerta não encontrado' },
        { status: 404 }
      )
    }

    // Criar tratativa usando o emociograma_id existente do alerta
    const { data: tratativa, error } = await supabase
      .from('tratativas_emociograma')
      .insert({
        emociograma_id: alertaData.emociograma_id,
        alerta_id,
        matricula_tratador: Number(authResult.user.matricula),
        tipo_tratativa,
        observacoes_iniciais: descricao,
        descricao_tratativa: acao_tomada,
        descricao,
        acao_tomada
      })
      .select('*')
      .single()

    if (error) {
      console.error('Erro ao criar tratativa:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao criar tratativa' },
        { status: 500 }
      )
    }

    // Buscar dados do alerta
    const { data: alertaCompleto } = await supabase
      .from('alertas_emociograma')
      .select(`
        id,
        usuario_matricula,
        estado_emocional,
        observacoes,
        data_registro,
        usuario:usuario_matricula(matricula, nome, email)
      `)
      .eq('id', alerta_id)
      .single()

    // Buscar dados do responsável
    const { data: responsavelData } = await supabase
      .from('usuarios')
      .select('matricula, nome, email, role')
      .eq('matricula', Number(authResult.user.matricula))
      .single()

    // Atualizar status do alerta para "resolvido"
    await supabase
      .from('alertas_emociograma')
      .update({ 
        status: 'resolvido',
        updated_at: new Date().toISOString()
      })
      .eq('id', alerta_id)

    // Montar resposta com dados completos
    const tratativaCompleta = {
      ...tratativa,
      alerta: alertaCompleto,
      responsavel: responsavelData
    }

    return NextResponse.json({
      success: true,
      message: 'Tratativa criada com sucesso',
      data: tratativaCompleta
    })

  } catch (error) {
    console.error('Tratativas POST API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
