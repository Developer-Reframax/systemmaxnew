import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const STATUS_MAP: Record<string, string> = {
  'Aguardando Avaliacao': 'Aguardando Avaliação',
  'Concluido': 'Concluído'
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
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    const statusParam = searchParams.get('status')

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

    let query = supabase
      .from('desvios')
      .select(
        `
          id,
          contrato,
          matricula_user,
          descricao,
          local,
          potencial,
          acao,
          observacao,
          data_conclusao,
          ver_agir,
          data_limite,
          status,
          potencial_local,
          acao_cliente,
          gerou_recusa,
          created_at,
          natureza:natureza_id(natureza),
          tipo:tipo_id(tipo),
          risco_associado:riscoassociado_id(risco_associado),
          equipe:equipe_id(equipe),
          criador:matricula_user(matricula, nome)
        `
      )
      .eq('contrato', userData.contrato_raiz)
      .order('created_at', { ascending: false })

    if (month || year) {
      const yearNum = year ? parseInt(year, 10) : new Date().getFullYear()
      if (!Number.isFinite(yearNum)) {
        return NextResponse.json(
          { success: false, message: 'Ano invalido' },
          { status: 400 }
        )
      }

      if (month) {
        const monthNum = Math.min(Math.max(parseInt(month, 10), 1), 12)
        const inicio = new Date(yearNum, monthNum - 1, 1, 0, 0, 0, 0)
        const fim = new Date(yearNum, monthNum, 0, 23, 59, 59, 999)
        query = query.gte('created_at', inicio.toISOString()).lte('created_at', fim.toISOString())
      } else {
        const inicio = new Date(yearNum, 0, 1, 0, 0, 0, 0)
        const fim = new Date(yearNum, 11, 31, 23, 59, 59, 999)
        query = query.gte('created_at', inicio.toISOString()).lte('created_at', fim.toISOString())
      }
    }

    if (statusParam) {
      const normalizedStatus = STATUS_MAP[statusParam] || statusParam
      query = query.eq('status', normalizedStatus)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao exportar desvios:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao exportar desvios' },
        { status: 500 }
      )
    }

    type ExportRow = {
      id: string
      contrato: string
      matricula_user: number
      descricao: string
      local: string
      potencial: string | null
      acao: string | null
      observacao: string | null
      data_conclusao: string | null
      ver_agir: boolean | null
      data_limite: string | null
      status: string
      potencial_local: string | null
      acao_cliente: boolean | null
      gerou_recusa: boolean | null
      created_at: string
      equipe?: { equipe?: string | null } | { equipe?: string | null }[]
      natureza?: { natureza?: string | null } | { natureza?: string | null }[]
      tipo?: { tipo?: string | null } | { tipo?: string | null }[]
      risco_associado?: { risco_associado?: string | null } | { risco_associado?: string | null }[]
      criador?: { matricula?: number; nome?: string | null } | { matricula?: number; nome?: string | null }[]
    }

    const rows = ((data as ExportRow[] | null) || []).map((item) => {
      const equipeInfo = Array.isArray(item.equipe) ? item.equipe[0] : item.equipe
      const naturezaInfo = Array.isArray(item.natureza) ? item.natureza[0] : item.natureza
      const tipoInfo = Array.isArray(item.tipo) ? item.tipo[0] : item.tipo
      const riscoInfo = Array.isArray(item.risco_associado) ? item.risco_associado[0] : item.risco_associado
      const criadorInfo = Array.isArray(item.criador) ? item.criador[0] : item.criador
      return {
        matricula: criadorInfo?.matricula || item.matricula_user,
        nome: criadorInfo?.nome || null,
        natureza: naturezaInfo?.natureza || null,
        contrato: item.contrato,
        local: item.local,
        risco_associado: riscoInfo?.risco_associado || null,
        tipo: tipoInfo?.tipo || null,
        equipe: equipeInfo?.equipe || null,
        potencial: item.potencial,
        acao: item.acao,
        observacao: item.observacao,
        data_conclusao: item.data_conclusao,
        ver_agir: item.ver_agir,
        data_limite: item.data_limite,
        status: item.status,
        potencial_local: item.potencial_local,
        acao_cliente: item.acao_cliente,
        gerou_recusa: item.gerou_recusa,
        data: item.created_at
      }
    })

    return NextResponse.json({
      success: true,
      data: rows
    })
  } catch (error) {
    console.error('Export API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
