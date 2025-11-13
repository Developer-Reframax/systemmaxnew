import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Interfaces para tipagem
interface UserSession {
  usuario_id: string
  usuario: { nome: string } | { nome: string }[]
}

interface ModuleSession {
  modulo_id: string
  modulo: { nome: string } | { nome: string }[]
}

interface UserCount {
  nome: string
  sessions: number
}

interface ModuleCount {
  nome: string
  sessions: number
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Buscar estatísticas de sessões
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    // Verificar se é admin ou editor
    if (decoded.role !== 'Admin' && decoded.role !== 'Editor') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    // Total sessions
    let totalQuery = supabase
      .from('sessoes')
      .select('*', { count: 'exact', head: true })
    
    if (start) totalQuery = totalQuery.gte('inicio', start)
    if (end) totalQuery = totalQuery.lte('inicio', end)
    
    const { count: totalSessions } = await totalQuery

    // Active sessions (no end time)
    const { count: activeSessions } = await supabase
      .from('sessoes')
      .select('*', { count: 'exact', head: true })
      .is('fim', null)

    // Sessions with duration for average calculation
    let completedQuery = supabase
      .from('sessoes')
      .select('inicio, fim')
      .not('fim', 'is', null)
    
    if (start) completedQuery = completedQuery.gte('inicio', start)
    if (end) completedQuery = completedQuery.lte('inicio', end)
    
    const { data: completedSessions } = await completedQuery

    let averageDuration = 0
    if (completedSessions && completedSessions.length > 0) {
      const totalDuration = completedSessions.reduce((acc, session) => {
        const startTime = new Date(session.inicio).getTime()
        const endTime = new Date(session.fim).getTime()
        return acc + (endTime - startTime)
      }, 0)
      averageDuration = totalDuration / completedSessions.length / (1000 * 60) // Convert to minutes
    }

    // Top users
    let userStatsQuery = supabase
      .from('sessoes')
      .select(`
        usuario_id,
        usuario:usuarios(nome)
      `)
    
    if (start) userStatsQuery = userStatsQuery.gte('inicio', start)
    if (end) userStatsQuery = userStatsQuery.lte('inicio', end)
    
    const { data: userStats } = await userStatsQuery

    const userCounts = userStats?.reduce((acc: Record<string, UserCount>, session: UserSession) => {
      const userId = session.usuario_id
      const userName = Array.isArray(session.usuario) ? session.usuario[0]?.nome : session.usuario?.nome || 'Usuário Desconhecido'
      acc[userId] = acc[userId] || { nome: userName, sessions: 0 }
      acc[userId].sessions++
      return acc
    }, {}) || {}

    const topUsers = Object.values(userCounts)
      .sort((a: UserCount, b: UserCount) => b.sessions - a.sessions)
      .slice(0, 5)

    // Top modules
    let moduleStatsQuery = supabase
      .from('sessoes')
      .select(`
        modulo_id,
        modulo:modulos(nome)
      `)
    
    if (start) moduleStatsQuery = moduleStatsQuery.gte('inicio', start)
    if (end) moduleStatsQuery = moduleStatsQuery.lte('inicio', end)
    
    const { data: moduleStats } = await moduleStatsQuery

    const moduleCounts = moduleStats?.reduce((acc: Record<string, ModuleCount>, session: ModuleSession) => {
      const moduleId = session.modulo_id
      const moduleName = Array.isArray(session.modulo) ? session.modulo[0]?.nome : session.modulo?.nome || 'Módulo Desconhecido'
      acc[moduleId] = acc[moduleId] || { nome: moduleName, sessions: 0 }
      acc[moduleId].sessions++
      return acc
    }, {}) || {}

    const topModules = Object.values(moduleCounts)
      .sort((a: ModuleCount, b: ModuleCount) => b.sessions - a.sessions)
      .slice(0, 5)

    const stats = {
      totalSessions: totalSessions || 0,
      activeSessions: activeSessions || 0,
      averageDuration,
      topUsers: topUsers as UserCount[],
      topModules: topModules as ModuleCount[]
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Erro na API de estatísticas de sessões:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
