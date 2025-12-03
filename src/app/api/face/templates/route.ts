import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, message: authResult.error || 'Nao autorizado' },
        { status: authResult.status || 401 }
      )
    }

    const { user } = authResult
    let query = supabase
      .from('usuarios')
      .select(
        'matricula, nome, email, funcao, role, contrato_raiz, face_descriptors, face_enrollment_status, face_last_enrolled_at, face_model_version'
      )
      .eq('status', 'ativo')
      .not('face_descriptors', 'is', null)
      .neq('face_enrollment_status', 'inativo')
      .limit(200)

    if (user.role !== 'Admin' && user.contrato_raiz) {
      query = query.eq('contrato_raiz', user.contrato_raiz)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar templates faciais:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar templates faciais' },
        { status: 500 }
      )
    }

    const templates =
      data
        ?.filter((row) => row.face_descriptors)
        .map((row) => ({
          matricula: row.matricula,
          nome: row.nome,
          email: row.email,
          funcao: row.funcao,
          role: row.role,
          contrato_raiz: row.contrato_raiz,
          descriptors: row.face_descriptors,
          status: row.face_enrollment_status || 'pendente',
          lastEnrolledAt: row.face_last_enrolled_at,
          modelVersion: row.face_model_version
        })) || []

    return NextResponse.json({
      success: true,
      total: templates.length,
      templates
    })
  } catch (error) {
    console.error('Erro no GET /api/face/templates:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
