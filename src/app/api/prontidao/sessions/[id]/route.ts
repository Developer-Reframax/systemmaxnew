import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import type { ReadinessDeviation, ReadinessEvent, ReadinessSession } from '@/lib/types/readiness'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

    const { id: sessionId } = await params
    const { data: session, error: sessionError } = await supabase
      .from('readiness_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, message: 'Sessão não encontrada' },
        { status: 404 }
      )
    }

    const [{ data: events, error: eventsError }, { data: deviationData, error: deviationError }] =
      await Promise.all([
        supabase
          .from('readiness_events')
          .select('*')
          .eq('session_id', sessionId)
          .order('timestamp', { ascending: true }),
        supabase
          .from('readiness_deviations')
          .select('*')
          .eq('session_id', sessionId)
          .limit(1)
      ])

    if (eventsError || deviationError) {
      console.error('Erro ao buscar detalhes da sessão de prontidão:', eventsError || deviationError)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar detalhes da sessão' },
        { status: 500 }
      )
    }

    const deviation = deviationData && deviationData.length > 0 ? deviationData[0] : null

    return NextResponse.json({
      success: true,
      data: {
        session: session as ReadinessSession,
        events: (events || []) as ReadinessEvent[],
        deviation: deviation as ReadinessDeviation | null
      }
    })
  } catch (error) {
    console.error('Erro inesperado em GET /prontidao/sessions/[id]:', error)
    return NextResponse.json({ success: false, message: 'Erro interno do servidor' }, { status: 500 })
  }
}
