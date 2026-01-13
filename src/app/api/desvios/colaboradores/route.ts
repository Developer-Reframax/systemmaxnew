import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

type UserRow = {
  matricula: number
  nome: string
  funcao?: string | null
  equipe_id?: string | null
  equipe?: { id?: string | null; equipe?: string | null }[] | { equipe?: string | null } | null
}

type DesvioRow = {
  matricula_user: number
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success || !authResult.user?.matricula) {
      return NextResponse.json(
        { success: false, message: authResult.error || 'Usuario nao autenticado' },
        { status: authResult.status || 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month')
    const yearParam = searchParams.get('year')
    const equipeId = searchParams.get('equipe_id')

    const now = new Date()
    const month = Math.min(Math.max(parseInt(monthParam || `${now.getMonth() + 1}`, 10), 1), 12)
    const year = parseInt(yearParam || `${now.getFullYear()}`, 10)
    if (!Number.isFinite(year)) {
      return NextResponse.json(
        { success: false, message: 'Ano invalido' },
        { status: 400 }
      )
    }

    const dataInicio = new Date(year, month - 1, 1, 0, 0, 0, 0)
    const dataFim = new Date(year, month, 0, 23, 59, 59, 999)

    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('contrato_raiz')
      .eq('matricula', authResult.user.matricula)
      .single()

    if (userError || !userData?.contrato_raiz) {
      return NextResponse.json(
        { success: false, message: 'Contrato do usuario nao encontrado' },
        { status: 404 }
      )
    }

    let usersQuery = supabase
      .from('usuarios')
      .select(
        `
          matricula,
          nome,
          funcao,
          equipe_id,
          equipe:equipes!usuarios_equipe_id_fkey(id, equipe)
        `
      )
      .eq('contrato_raiz', userData.contrato_raiz)
      .order('nome', { ascending: true })

    if (equipeId) {
      usersQuery = usersQuery.eq('equipe_id', equipeId)
    }

    let desviosQuery = supabase
      .from('desvios')
      .select('matricula_user')
      .eq('contrato', userData.contrato_raiz)
      .gte('created_at', dataInicio.toISOString())
      .lte('created_at', dataFim.toISOString())

    if (equipeId) {
      desviosQuery = desviosQuery.eq('equipe_id', equipeId)
    }

    const [{ data: users, error: usersError }, { data: desvios, error: desviosError }] =
      await Promise.all([usersQuery, desviosQuery])

    if (usersError || desviosError) {
      console.error('Erro ao buscar colaboradores/desvios:', usersError || desviosError)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar dados' },
        { status: 500 }
      )
    }

    const contador = new Map<number, number>()
    ;(desvios || []).forEach((item: DesvioRow) => {
      const atual = contador.get(item.matricula_user) || 0
      contador.set(item.matricula_user, atual + 1)
    })

    const data = (users || []).map((user: UserRow) => {
      const total = contador.get(user.matricula) || 0
      const equipeInfo = Array.isArray(user.equipe) ? user.equipe[0] : user.equipe
      return {
        matricula: user.matricula,
        nome: user.nome,
        funcao: user.funcao || null,
        equipe_id: user.equipe_id || null,
        equipe: equipeInfo?.equipe || null,
        total_desvios: total,
        registrou: total > 0
      }
    })

    return NextResponse.json({
      success: true,
      data,
      periodo: {
        month,
        year,
        inicio: dataInicio.toISOString(),
        fim: dataFim.toISOString()
      }
    })
  } catch (error) {
    console.error('Desvios colaboradores API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
