import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { calculateReadinessMetrics } from '@/lib/services/readiness'
import type { ReadinessEventInput, ReadinessDeviation, ReadinessSession } from '@/lib/types/readiness'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface FinalizeSessionBody {
  session_id: string
  events: ReadinessEventInput[]
  ended_at?: string
}

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
    const matricula = searchParams.get('matricula')
    const periodo = parseInt(searchParams.get('periodo') || '0', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    let query = supabase
      .from('readiness_sessions')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit)

    if (matricula) {
      query = query.eq('matricula', matricula)
    }

    if (periodo > 0) {
      const startDate = new Date(Date.now() - periodo * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('started_at', startDate)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao listar sessões de prontidão:', error)
      return NextResponse.json({ success: false, message: 'Erro ao buscar sessões' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Erro inesperado em GET /prontidao/sessions:', error)
    return NextResponse.json({ success: false, message: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    const body = await request.json().catch(() => ({}))
    const matriculaInput = body?.matricula ?? authResult.user?.matricula
    if (!matriculaInput) {
      return NextResponse.json(
        { success: false, message: 'Matrícula é obrigatória' },
        { status: 400 }
      )
    }

    const started_at = new Date().toISOString()
    const { data, error } = await supabase
      .from('readiness_sessions')
      .insert({
        matricula: String(matriculaInput),
        started_at
      })
      .select()
      .single()

    if (error || !data) {
      console.error('Erro ao iniciar sessão de prontidão:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao iniciar sessão' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Erro inesperado em POST /prontidao/sessions:', error)
    return NextResponse.json({ success: false, message: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    const body: FinalizeSessionBody = await request.json()
    const { session_id, events, ended_at } = body

    if (!session_id) {
      return NextResponse.json(
        { success: false, message: 'session_id é obrigatório' },
        { status: 400 }
      )
    }

    const { data: session, error: sessionError } = await supabase
      .from('readiness_sessions')
      .select('*')
      .eq('id', session_id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, message: 'Sessão não encontrada' },
        { status: 404 }
      )
    }

    const normalizedEvents: ReadinessEventInput[] = (events || []).map((event) => ({
      ...event,
      session_id,
      timestamp: event.timestamp || new Date().toISOString()
    }))

    if (normalizedEvents.length > 0) {
      const { error: eventsError } = await supabase
        .from('readiness_events')
        .insert(normalizedEvents)

      if (eventsError) {
        console.error('Erro ao registrar eventos de prontidão:', eventsError)
        return NextResponse.json(
          { success: false, message: 'Erro ao salvar eventos' },
          { status: 500 }
        )
      }
    }

    const finishedAt = ended_at || new Date().toISOString()
    const metrics = calculateReadinessMetrics(normalizedEvents, session.started_at, finishedAt)

    const updatePayload = {
      ended_at: finishedAt,
      total_duration_ms: metrics.total_duration_ms,
      reaction_time_avg: metrics.reaction_time_avg,
      omission_rate: metrics.omission_rate,
      commission_rate: metrics.commission_rate,
      stroop_error_rate: metrics.stroop_error_rate,
      fatigue_index: metrics.fatigue_index,
      readiness_score: metrics.readiness_score,
      risk_level: metrics.risk_level
    }

    const { data: updatedSession, error: updateError } = await supabase
      .from('readiness_sessions')
      .update(updatePayload)
      .eq('id', session_id)
      .select()
      .single()

    if (updateError || !updatedSession) {
      console.error('Erro ao finalizar sessão:', updateError)
      return NextResponse.json(
        { success: false, message: 'Erro ao finalizar sessão' },
        { status: 500 }
      )
    }

    let deviation: ReadinessDeviation | null = null

    if (metrics.risk_level === 'ALTO_RISCO') {
      const { data: existingDeviation } = await supabase
        .from('readiness_deviations')
        .select('*')
        .eq('session_id', session_id)
        .limit(1)

      if (!existingDeviation || existingDeviation.length === 0) {
        const { data: deviationInserted, error: deviationError } = await supabase
          .from('readiness_deviations')
          .insert({
            session_id,
            matricula: String(session.matricula),
            risk_level: metrics.risk_level,
            description: 'Risco alto detectado no teste de prontidão cognitiva',
            status: 'ABERTO'
          })
          .select()
          .single()

        if (!deviationError && deviationInserted) {
          deviation = deviationInserted as ReadinessDeviation
        } else if (deviationError) {
          console.error('Erro ao criar desvio automático:', deviationError)
        }
      } else {
        deviation = existingDeviation[0] as ReadinessDeviation
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedSession as ReadinessSession,
      deviation
    })
  } catch (error) {
    console.error('Erro inesperado em PUT /prontidao/sessions:', error)
    return NextResponse.json({ success: false, message: 'Erro interno do servidor' }, { status: 500 })
  }
}
