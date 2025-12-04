import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import type { ReadinessEvent, ReadinessEventInput } from '@/lib/types/readiness'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface EventsBody {
  events: ReadinessEventInput | ReadinessEventInput[]
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
    const sessionId = searchParams.get('session_id')

    let query = supabase
      .from('readiness_events')
      .select('*')
      .order('timestamp', { ascending: true })

    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao listar eventos de prontidão:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar eventos' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: data as ReadinessEvent[] })
  } catch (error) {
    console.error('Erro inesperado em GET /prontidao/events:', error)
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

    const body: EventsBody = await request.json()
    const payload = Array.isArray(body.events) ? body.events : [body.events]

    if (!payload || payload.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Nenhum evento informado' },
        { status: 400 }
      )
    }

    const { error, data } = await supabase
      .from('readiness_events')
      .insert(payload)
      .select()

    if (error) {
      console.error('Erro ao registrar eventos:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao salvar eventos' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Erro inesperado em POST /prontidao/events:', error)
    return NextResponse.json({ success: false, message: 'Erro interno do servidor' }, { status: 500 })
  }
}
