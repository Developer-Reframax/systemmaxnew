import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

type SessionEventType = 'login' | 'page_view' | 'action' | 'heartbeat' | 'logout' | 'end'

interface SessionEventPayload {
  type: SessionEventType
  path?: string
  label?: string
  metadata?: Record<string, unknown>
  occurred_at?: string
}

interface SessionRecord {
  id: string
  matricula_usuario: number
  inicio_sessao: string
  fim_sessao: string | null
  paginas_acessadas: number | null
  modulos_acessados: SessionEventPayload[] | null
  tempo_total_segundos: number | null
}

const mapSession = (session: SessionRecord & { usuarios?: unknown[] }) => ({
  ...session,
  paginas_acessadas: session.paginas_acessadas ?? 0,
  modulos_acessados: Array.isArray(session.modulos_acessados) ? session.modulos_acessados : [],
  tempo_total_segundos: session.tempo_total_segundos ?? 0
})

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status || 401 }
      )
    }

    if (!['Admin', 'Editor'].includes(authResult.user.role)) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const matricula = searchParams.get('matricula')

    let query = supabase
      .from('sessoes')
      .select(`
        *,
        usuario:usuarios (
          matricula,
          nome,
          email,
          role,
          funcao
        )
      `)
      .order('inicio_sessao', { ascending: false })
      .limit(200)

    if (start) query = query.gte('inicio_sessao', start)
    if (end) query = query.lte('inicio_sessao', end)
    if (matricula) query = query.eq('matricula_usuario', matricula)

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar sessões:', error)
      return NextResponse.json({ success: false, message: 'Erro ao buscar sessões' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      sessions: (data || []).map(mapSession)
    })
  } catch (error) {
    console.error('Erro na rota de sessões (GET):', error)
    return NextResponse.json({ success: false, message: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status || 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const startedAt = typeof body.started_at === 'string' ? body.started_at : new Date().toISOString()
    const initialPath = typeof body.path === 'string' ? body.path : '/'
    const userAgent = request.headers.get('user-agent') || body.user_agent

    const initialEvent: SessionEventPayload = {
      type: 'login',
      path: initialPath,
      label: body.label || 'login',
      occurred_at: startedAt,
      metadata: userAgent ? { user_agent: userAgent } : undefined
    }

    const { data, error } = await supabase
      .from('sessoes')
      .insert({
        matricula_usuario: Number(authResult.user.matricula),
        inicio_sessao: startedAt,
        paginas_acessadas: 1,
        modulos_acessados: [initialEvent],
        tempo_total_segundos: 0
      })
      .select('*')
      .single()

    if (error || !data) {
      console.error('Erro ao criar sessão:', error)
      return NextResponse.json({ success: false, message: 'Erro ao criar sessão' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      sessionId: data.id,
      session: mapSession(data as SessionRecord)
    })
  } catch (error) {
    console.error('Erro na rota de sessões (POST):', error)
    return NextResponse.json({ success: false, message: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status || 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const sessionId = body.sessionId || body.session_id || body.id
    const event = body.event as SessionEventPayload | undefined
    const endSession: boolean = Boolean(body.endSession || body.end_session)

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: 'ID da sessão não informado' },
        { status: 400 }
      )
    }

    const { data: currentSession, error: fetchError } = await supabase
      .from('sessoes')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (fetchError || !currentSession) {
      return NextResponse.json(
        { success: false, message: 'Sessão não encontrada' },
        { status: 404 }
      )
    }

    if (Number(currentSession.matricula_usuario) !== Number(authResult.user.matricula)) {
      return NextResponse.json(
        { success: false, message: 'Sessão não pertence ao usuário autenticado' },
        { status: 403 }
      )
    }

    const session = mapSession(currentSession as SessionRecord)
    const events = [...session.modulos_acessados]
    const now = new Date().toISOString()

    if (event && event.type) {
      events.push({
        ...event,
        occurred_at: event.occurred_at || now
      })
    }

    const updateData: Partial<SessionRecord> = {
      modulos_acessados: events,
      paginas_acessadas: event?.type === 'page_view'
        ? (session.paginas_acessadas || 0) + 1
        : session.paginas_acessadas
    }

    if (endSession) {
      const endTime = event?.occurred_at || now
      const durationSeconds = Math.max(
        0,
        Math.floor(
          (new Date(endTime).getTime() - new Date(session.inicio_sessao).getTime()) / 1000
        )
      )

      updateData.fim_sessao = endTime
      updateData.tempo_total_segundos = durationSeconds
    }

    const { data: updated, error } = await supabase
      .from('sessoes')
      .update(updateData)
      .eq('id', sessionId)
      .select('*')
      .single()

    if (error || !updated) {
      console.error('Erro ao atualizar sessão:', error)
      return NextResponse.json({ success: false, message: 'Erro ao atualizar sessão' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      session: mapSession(updated as SessionRecord)
    })
  } catch (error) {
    console.error('Erro na rota de sessões (PATCH):', error)
    return NextResponse.json({ success: false, message: 'Erro interno do servidor' }, { status: 500 })
  }
}
