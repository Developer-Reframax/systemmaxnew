import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Estatísticas do emociograma
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
    const periodo = searchParams.get('periodo') as '7d' | '30d' | '90d' | null
    const escopo = searchParams.get('escopo') as 'individual' | 'equipe' | 'geral' | null

    // Definir período
    const now = new Date()
    let startDate: Date
    
    switch (periodo) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    let matriculasPermitidas: number[] = []

    // Definir escopo baseado nas permissões do usuário
    if (escopo === 'individual' || !escopo) {
      matriculasPermitidas = authResult.user?.matricula ? [Number(authResult.user.matricula)] : []
    } else {
      // Buscar dados do usuário para verificar permissões
      const { data: userData } = await supabase
        .from('usuarios')
        .select('role, equipe_id, letra_id')
        .eq('matricula', authResult.user?.matricula)
        .single()

      if (!userData) {
        return NextResponse.json(
          { success: false, message: 'Usuário não encontrado' },
          { status: 404 }
        )
      }

      if (escopo === 'equipe') {
        // Para líderes e supervisores, mostrar dados da equipe/letra
        if (['Lider', 'Supervisor'].includes(userData.role)) {
          let equipeMatriculas: number[] = []
          
          if (userData.equipe_id) {
            const { data: equipeUsers } = await supabase
              .from('usuarios')
              .select('matricula')
              .eq('equipe_id', userData.equipe_id)
            
            if (equipeUsers) {
              equipeMatriculas = [...equipeMatriculas, ...equipeUsers.map(u => u.matricula)]
            }
          }
          
          if (userData.letra_id) {
            const { data: letraUsers } = await supabase
              .from('usuarios')
              .select('matricula')
              .eq('letra_id', userData.letra_id)
            
            if (letraUsers) {
              equipeMatriculas = [...equipeMatriculas, ...letraUsers.map(u => u.matricula)]
            }
          }

          matriculasPermitidas = equipeMatriculas
        } else {
          // Usuários comuns só podem ver seus próprios dados
          matriculasPermitidas = authResult.user?.matricula
            ? [Number(authResult.user.matricula)]
            : []
        }
      } else if (escopo === 'geral') {
        // Apenas admins e editores podem ver dados gerais
        if (['Admin', 'Editor'].includes(userData.role)) {
          // Buscar todas as matrículas (sem filtro)
          const { data: allUsers } = await supabase
            .from('usuarios')
            .select('matricula')
          
          if (allUsers) {
            matriculasPermitidas = allUsers.map(u => u.matricula)
          }
        } else {
          return NextResponse.json(
            { success: false, message: 'Acesso negado para visualizar dados gerais' },
            { status: 403 }
          )
        }
      }
    }

    if (matriculasPermitidas.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          resumo: {
            total_registros: 0,
            bem: 0,
            regular: 0,
            pessimo: 0
          },
          tendencia: [],
          alertas: {
            ativos: 0,
            resolvidos: 0,
            em_tratamento: 0
          },
          tratativas: {
            total: 0,
            por_tipo: {}
          }
        }
      })
    }

    // 1. Resumo geral dos estados emocionais
    const { data: resumoData } = await supabase
      .from('emociogramas')
      .select('estado_emocional')
      .in('matricula_usuario', matriculasPermitidas)
      .gte('data_registro', startDate.toISOString())

    const resumo = {
      total_registros: resumoData?.length || 0,
      bem: resumoData?.filter(r => r.estado_emocional === 'bem').length || 0,
      regular: resumoData?.filter(r => r.estado_emocional === 'regular').length || 0,
      pessimo: resumoData?.filter(r => r.estado_emocional === 'pessimo').length || 0
    }

    // 2. Tendência por dia (últimos 7 dias)
    const tendenciaPromises = []
    for (let i = 6; i >= 0; i--) {
      const dia = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const inicioDia = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate())
      const fimDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000)

      tendenciaPromises.push(
        supabase
          .from('emociogramas')
          .select('estado_emocional')
          .in('matricula_usuario', matriculasPermitidas)
          .gte('data_registro', inicioDia.toISOString())
          .lt('data_registro', fimDia.toISOString())
      )
    }

    const tendenciaResults = await Promise.all(tendenciaPromises)
    const tendencia = tendenciaResults.map((result, index) => {
      const dia = new Date(now.getTime() - (6 - index) * 24 * 60 * 60 * 1000)
      const data = result.data || []
      
      return {
        data: dia.toISOString().split('T')[0],
        bem: data.filter(r => r.estado_emocional === 'bem').length,
        regular: data.filter(r => r.estado_emocional === 'regular').length,
        pessimo: data.filter(r => r.estado_emocional === 'pessimo').length,
        total: data.length
      }
    })

    // 3. Estatísticas de alertas
    const { data: alertasData } = await supabase
      .from('alertas_emociograma')
      .select('status')
      .in('usuario_matricula', matriculasPermitidas)
      .gte('data_criacao', startDate.toISOString())

    const alertas = {
      ativos: alertasData?.filter(a => a.status === 'ativo').length || 0,
      resolvidos: alertasData?.filter(a => a.status === 'resolvido').length || 0,
      em_tratamento: alertasData?.filter(a => a.status === 'em_tratamento').length || 0
    }

    // 4. Estatísticas de tratativas
    const { data: tratativasData } = await supabase
      .from('tratativas_emociograma')
      .select(`
        tipo_tratativa,
        alerta:alerta_id!inner(usuario_matricula)
      `)
      .in('alerta.usuario_matricula', matriculasPermitidas)
      .gte('data_tratativa', startDate.toISOString())

    const tratativasPorTipo = tratativasData?.reduce((acc, t) => {
      acc[t.tipo_tratativa] = (acc[t.tipo_tratativa] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    const tratativas = {
      total: tratativasData?.length || 0,
      por_tipo: tratativasPorTipo
    }

    return NextResponse.json({
      success: true,
      data: {
        resumo,
        tendencia,
        alertas,
        tratativas,
        periodo: periodo || '30d',
        escopo: escopo || 'individual'
      }
    })

  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
