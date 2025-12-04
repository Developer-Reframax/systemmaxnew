import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import type { ReadinessDeviation } from '@/lib/types/readiness'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface UpdateDeviationBody {
  id: string
  status?: ReadinessDeviation['status']
  responsible_matricula?: string | null
  immediate_action?: string | null
  root_cause?: string | null
  action_plan?: string | null
  due_date?: string | null
  resolved_at?: string | null
}

interface CreateDeviationBody {
  session_id?: string | null
  matricula: string
  risk_level: ReadinessDeviation['risk_level']
  description: string
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
    const status = searchParams.get('status')
    const matricula = searchParams.get('matricula')
    const responsavel = searchParams.get('responsavel')

    let query = supabase
      .from('readiness_deviations')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (matricula) {
      query = query.eq('matricula', matricula)
    }

    if (responsavel) {
      query = query.eq('responsible_matricula', responsavel)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao listar desvios de prontidão:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar desvios' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: data as ReadinessDeviation[] })
  } catch (error) {
    console.error('Erro inesperado em GET /prontidao/deviations:', error)
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

    const body: CreateDeviationBody = await request.json()
    const { session_id, matricula, risk_level, description } = body

    if (!matricula || !risk_level || !description) {
      return NextResponse.json(
        { success: false, message: 'Campos obrigatórios ausentes' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('readiness_deviations')
      .insert({
        session_id: session_id || null,
        matricula: String(matricula),
        risk_level,
        description,
        status: 'ABERTO'
      })
      .select()
      .single()

    if (error || !data) {
      console.error('Erro ao criar desvio de prontidão:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao criar desvio' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: data as ReadinessDeviation })
  } catch (error) {
    console.error('Erro inesperado em POST /prontidao/deviations:', error)
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

    const body: UpdateDeviationBody = await request.json()
    const { id, ...fields } = body

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID do desvio é obrigatório' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('readiness_deviations')
      .update(fields)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      console.error('Erro ao atualizar desvio de prontidão:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao atualizar desvio' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: data as ReadinessDeviation })
  } catch (error) {
    console.error('Erro inesperado em PUT /prontidao/deviations:', error)
    return NextResponse.json({ success: false, message: 'Erro interno do servidor' }, { status: 500 })
  }
}
