import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/auth'

type CountResult = { count: number | null; error: Error | null }

interface SessionEvent {
  type?: string
  path?: string
  occurred_at?: string
}

interface SessionRow {
  id: string
  matricula_usuario: number
  inicio_sessao: string
  fim_sessao: string | null
  modulos_acessados: SessionEvent[] | null
  usuario?: { matricula?: number; nome?: string; contrato_raiz?: string } | { matricula?: number; nome?: string; contrato_raiz?: string }[]
}

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

// Conta registros de uma tabela, opcionalmente filtrando por contrato
async function countByContract(table: string, contrato?: string | null): Promise<CountResult> {
  let query = supabase.from(table).select('id', { count: 'exact', head: true })
  if (contrato) {
    query = query.eq('contrato', contrato)
  }
  const { count, error } = await query
  return { count, error }
}

// Conta usuários, com opção de filtrar por status (usando coluna existente: matricula)
async function countUsers(status?: string): Promise<CountResult> {
  let query = supabase.from('usuarios').select('matricula', { count: 'exact', head: true })
  if (status) {
    query = query.eq('status', status)
  }
  const { count, error } = await query
  return { count, error }
}

function mapSessionToActivity(session: SessionRow) {
  const events = Array.isArray(session.modulos_acessados) ? session.modulos_acessados : []
  const lastEvent = [...events].reverse().find((evt) => evt.type)
  const lastPage = [...events].reverse().find((evt) => evt.type === 'page_view')?.path

  const usuario = Array.isArray(session.usuario) ? session.usuario[0] : session.usuario
  const name = usuario?.nome || `Matrícula ${session.matricula_usuario}`

  const description = lastEvent?.type === 'page_view'
    ? `Visualizou ${lastPage || 'uma página'}`
    : lastEvent?.type === 'logout'
      ? 'Encerrou a sessão'
      : 'Iniciou/atualizou a sessão'

  const type: 'login' | 'logout' | 'module_access' | 'session' =
    lastEvent?.type === 'logout' ? 'logout'
    : lastEvent?.type === 'page_view' ? 'module_access'
    : 'session'

  return {
    id: session.id,
    type,
    user_name: name,
    description,
    timestamp: lastEvent?.occurred_at || session.inicio_sessao
  }
}

export async function GET(request: NextRequest) {
  try {
    // Autenticação leve: apenas garante que há cookie e que o JWT é válido/ativo.
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token de autenticacao nao encontrado' },
        { status: 401 }
      )
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Token invalido ou expirado' },
        { status: 401 }
      )
    }

    const contrato = user.contrato_raiz || null

    // Contagens com filtro de contrato quando aplicável
    const [
      totalUsers,
      activeUsers,
      desvios,
      emociogramas,
      boasPraticas
    ] = await Promise.all<CountResult>([
      countUsers(),
      countUsers('ativo'),
      countByContract('desvios', contrato),
      countByContract('emociogramas', contrato),
      countByContract('boaspraticas_praticas', contrato)
    ])

    const stats = {
      totalUsers: totalUsers.count || 0,
      activeUsers: activeUsers.count || 0,
      totalDesvios: desvios.count || 0,
      totalEmociogramas: emociogramas.count || 0,
      totalBoasPraticas: boasPraticas.count || 0
    }

    // Atividade recente baseada em sessões, limitada e filtrada por contrato
    const sessionsResp = await supabase
      .from('sessoes')
      .select(`
        id,
        matricula_usuario,
        inicio_sessao,
        fim_sessao,
        modulos_acessados,
        usuario:usuarios(matricula, nome, contrato_raiz)
      `)
      .order('inicio_sessao', { ascending: false })
      .limit(40)

    const recentActivity = (sessionsResp.data || [])
      .filter((session) => {
        if (!contrato) return true
        const usuario = Array.isArray(session.usuario) ? session.usuario[0] : session.usuario
        return usuario?.contrato_raiz === contrato
      })
      .map((session) => mapSessionToActivity(session as SessionRow))
      .slice(0, 10)

    return NextResponse.json({
      success: true,
      stats,
      recentActivity
    })
  } catch (error) {
    console.error('Erro na rota de dashboard/stats:', error)
    return NextResponse.json({ success: false, message: 'Erro interno do servidor' }, { status: 500 })
  }
}
