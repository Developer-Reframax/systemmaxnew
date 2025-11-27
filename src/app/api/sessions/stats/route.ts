import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'

interface CountItem {
  nome: string
  sessions: number
}

interface SessionRow {
  matricula_usuario: number
  inicio_sessao: string
  fim_sessao: string | null
  tempo_total_segundos: number | null
  paginas_acessadas: number | null
  modulos_acessados: { type?: string; path?: string; occurred_at?: string }[] | null
  usuario?: { nome?: string; matricula?: number } | { nome?: string; matricula?: number }[]
}

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

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

    let baseQuery = supabase.from('sessoes').select(`
      matricula_usuario,
      inicio_sessao,
      fim_sessao,
      tempo_total_segundos,
      paginas_acessadas,
      modulos_acessados,
      usuario:usuarios(nome, matricula)
    `)

    if (start) baseQuery = baseQuery.gte('inicio_sessao', start)
    if (end) baseQuery = baseQuery.lte('inicio_sessao', end)

    const [sessionsResult, activeResult] = await Promise.all([
      baseQuery,
      supabase
        .from('sessoes')
        .select('*', { head: true, count: 'exact' })
        .is('fim_sessao', null)
    ])

    if (sessionsResult.error) {
      console.error('Erro ao buscar estatísticas de sessões:', sessionsResult.error)
      return NextResponse.json({ success: false, message: 'Erro ao buscar estatísticas' }, { status: 500 })
    }

    const sessions = (sessionsResult.data || []) as SessionRow[]
    const activeSessions = activeResult.count || 0
    const totalSessions = sessions.length || 0

    let averageDuration = 0
    let averagePages = 0
    const userCounts: Record<string, CountItem> = {}
    const pageCounts: Record<string, CountItem> = {}

    sessions.forEach((session: SessionRow) => {
      const durationSeconds = session.fim_sessao
        ? Math.max(
            0,
            Math.floor(
              (new Date(session.fim_sessao).getTime() - new Date(session.inicio_sessao).getTime()) / 1000
            )
          )
        : session.tempo_total_segundos || 0

      averageDuration += durationSeconds
      averagePages += session.paginas_acessadas || 0

      const userName = Array.isArray(session.usuario)
        ? session.usuario[0]?.nome
        : session.usuario?.nome

      const userKey = session.matricula_usuario.toString()
      if (!userCounts[userKey]) {
        userCounts[userKey] = { nome: userName || 'Usuário', sessions: 0 }
      }
      userCounts[userKey].sessions += 1

      const events = Array.isArray(session.modulos_acessados) ? session.modulos_acessados : []
      events
        .filter((evt) => evt.type === 'page_view')
        .forEach((evt) => {
          const path = evt.path || 'desconhecido'
          if (!pageCounts[path]) {
            pageCounts[path] = { nome: path, sessions: 0 }
          }
          pageCounts[path].sessions += 1
        })
    })

    const topUsers = Object.values(userCounts).sort((a, b) => b.sessions - a.sessions).slice(0, 5)
    const topModules = Object.values(pageCounts).sort((a, b) => b.sessions - a.sessions).slice(0, 5)

    return NextResponse.json({
      success: true,
      totalSessions,
      activeSessions,
      averageDuration: totalSessions ? averageDuration / totalSessions / 60 : 0,
      averagePages: totalSessions ? averagePages / totalSessions : 0,
      topUsers,
      topModules
    })
  } catch (error) {
    console.error('Erro na API de estatísticas de sessões:', error)
    return NextResponse.json({ success: false, message: 'Erro interno do servidor' }, { status: 500 })
  }
}
