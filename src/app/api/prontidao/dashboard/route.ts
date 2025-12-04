import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import type { ReadinessDashboardData, ReadinessRiskLevel } from '@/lib/types/readiness'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const normalizeRisk = (value: string | null): ReadinessRiskLevel | null => {
  if (!value) return null
  if (['APTO', 'ALERTA', 'ALTO_RISCO'].includes(value)) {
    return value as ReadinessRiskLevel
  }
  return null
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
    const periodo = parseInt(searchParams.get('periodo') || '30', 10)

    const startDate = new Date(Date.now() - periodo * 24 * 60 * 60 * 1000).toISOString()

    let sessionsQuery = supabase
      .from('readiness_sessions')
      .select('*')
      .gte('started_at', startDate)
      .order('started_at', { ascending: false })

    if (matricula) {
      sessionsQuery = sessionsQuery.eq('matricula', matricula)
    }

    const { data: sessions, error: sessionsError } = await sessionsQuery

    if (sessionsError) {
      console.error('Erro ao carregar sessões para dashboard:', sessionsError)
      return NextResponse.json(
        { success: false, message: 'Erro ao carregar sessões' },
        { status: 500 }
      )
    }

    const totalSessions = sessions?.length || 0
    const distribution = {
      apto: sessions?.filter((session) => session.risk_level === 'APTO').length || 0,
      alerta: sessions?.filter((session) => session.risk_level === 'ALERTA').length || 0,
      alto_risco: sessions?.filter((session) => session.risk_level === 'ALTO_RISCO').length || 0
    }

    let deviationsQuery = supabase
      .from('readiness_deviations')
      .select('status')
      .eq('status', 'ABERTO')

    if (matricula) {
      deviationsQuery = deviationsQuery.eq('matricula', matricula)
    }

    const { data: deviations, error: deviationError } = await deviationsQuery

    if (deviationError) {
      console.error('Erro ao buscar desvios de prontidão:', deviationError)
      return NextResponse.json(
        { success: false, message: 'Erro ao carregar desvios' },
        { status: 500 }
      )
    }

    const latest_sessions = (sessions || []).slice(0, 8).map((session) => ({
      id: session.id,
      matricula: session.matricula,
      started_at: session.started_at,
      readiness_score: session.readiness_score,
      risk_level: normalizeRisk(session.risk_level),
      omission_rate: session.omission_rate,
      commission_rate: session.commission_rate,
      fatigue_index: session.fatigue_index
    }))

    const score_history = (sessions || []).map((session) => ({
      started_at: session.started_at,
      readiness_score: session.readiness_score,
      risk_level: normalizeRisk(session.risk_level)
    }))

    const response: ReadinessDashboardData = {
      total_sessions: totalSessions,
      distribution,
      open_deviations: deviations?.length || 0,
      latest_sessions,
      score_history
    }

    return NextResponse.json({ success: true, data: response })
  } catch (error) {
    console.error('Erro inesperado em GET /prontidao/dashboard:', error)
    return NextResponse.json({ success: false, message: 'Erro interno do servidor' }, { status: 500 })
  }
}
