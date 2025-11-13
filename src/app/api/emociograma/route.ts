import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'
import { criarAlertaEmociograma } from '@/lib/services/alertas'
import { 
  RegistroEmociogramaRequest, 
} from '@/lib/types/emociograma'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Listar emociogramas
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
    const meus = searchParams.get('meus') === 'true'
    const equipe = searchParams.get('equipe') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    let query = supabase
      .from('emociogramas')
      .select(`
        *,
        usuario:matricula_usuario(matricula, nome, email)
      `)
      .order('data_registro', { ascending: false })
      .range(offset, offset + limit - 1)

    let countQuery = supabase
      .from('emociogramas')
      .select('*', { count: 'exact', head: true })

    // Aplicar filtros de período
    if (periodo) {
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
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      }
      
      query = query.gte('data_registro', startDate.toISOString())
      countQuery = countQuery.gte('data_registro', startDate.toISOString())
    }

    // Filtrar apenas registros do usuário logado
    if (meus && authResult.user?.matricula) {
      query = query.eq('matricula_usuario', authResult.user.matricula)
      countQuery = countQuery.eq('matricula_usuario', authResult.user.matricula)
    }

    // Filtrar por equipe (para líderes e supervisores)
    if (equipe && authResult.user?.matricula) {
      // Buscar usuários da mesma equipe ou letra do usuário logado
      const { data: userData } = await supabase
        .from('usuarios')
        .select('equipe_id, letra_id, role')
        .eq('matricula', authResult.user.matricula)
        .single()

      if (userData && (userData.equipe_id || userData.letra_id)) {
        let equipeMatriculas: number[] = []
        
        if (userData.equipe_id) {
          const { data: equipeUsers } = await supabase
            .from('usuarios')
            .select('matricula')
            .eq('equipe_id', userData.equipe_id)
          
          if (equipeUsers) {
            equipeMatriculas = equipeUsers.map(u => u.matricula)
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

        if (equipeMatriculas.length > 0) {
          query = query.in('matricula_usuario', equipeMatriculas)
          countQuery = countQuery.in('matricula_usuario', equipeMatriculas)
        }
      }
    }

    const [{ data: emociogramas, error }, { count, error: countError }] = await Promise.all([
      query,
      countQuery
    ])

    if (error || countError) {
      console.error('Erro ao buscar emociogramas:', error || countError)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar emociogramas' },
        { status: 500 }
      )
    }

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      success: true,
      data: emociogramas,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages
      }
    })

  } catch (error) {
    console.error('Emociograma GET API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Registrar emociograma
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    const body: RegistroEmociogramaRequest = await request.json()
    const { estado_emocional, observacoes } = body

    // Validar campos obrigatórios
    if (!estado_emocional) {
      return NextResponse.json(
        { success: false, message: 'Estado emocional é obrigatório' },
        { status: 400 }
      )
    }

    // Validar estado emocional
    const validEstados = ['bem', 'regular', 'pessimo']
    if (!validEstados.includes(estado_emocional)) {
      return NextResponse.json(
        { success: false, message: 'Estado emocional inválido' },
        { status: 400 }
      )
    }

    // Verificar se o usuário pode registrar (8 horas)
    const { data: canRegister, error: checkError } = await supabase
      .rpc('check_last_emociograma', { user_matricula: authResult.user?.matricula })

    if (checkError) {
      console.error('Erro ao verificar último registro:', checkError)
      return NextResponse.json(
        { success: false, message: 'Erro ao verificar último registro' },
        { status: 500 }
      )
    }

    if (!canRegister) {
      return NextResponse.json(
        { success: false, message: 'Você só pode registrar um emociograma a cada 8 horas' },
        { status: 400 }
      )
    }

    // Criar registro de emociograma
    const { data: emociograma, error } = await supabase
      .from('emociogramas')
      .insert({
        matricula_usuario: authResult.user?.matricula,
        estado_emocional,
        observacoes: observacoes || null
      })
      .select(`
        *,
        usuario:matricula_usuario(matricula, nome, email)
      `)
      .single()

    if (error) {
      console.error('Erro ao criar emociograma:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao registrar emociograma' },
        { status: 500 }
      )
    }

    // Verificar se precisa de alerta para estados irregulares
    const precisaAlerta = ['regular', 'pessimo'].includes(estado_emocional)
    let alertaCriado = null
    
    if (precisaAlerta && authResult.user?.matricula) {
      try {
        alertaCriado = await criarAlertaEmociograma(
          Number(authResult.user.matricula),
          estado_emocional as 'regular' | 'pessimo',
          observacoes || undefined
        )
      } catch (alertError) {
        console.error('Erro ao criar alerta:', alertError)
        // Não falha o registro se o alerta falhar
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Emociograma registrado com sucesso',
      data: emociograma,
      alerta: precisaAlerta ? {
        tipo: estado_emocional === 'pessimo' ? 'critico' : 'atencao',
        mensagem: estado_emocional === 'pessimo' 
          ? 'Estado crítico detectado. É importante conversar com sua liderança antes de iniciar atividades.'
          : 'Estado de atenção detectado. Considere conversar com sua liderança se necessário.',
        alertaCriado: alertaCriado ? true : false
      } : null
    })

  } catch (error) {
    console.error('Emociograma POST API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
