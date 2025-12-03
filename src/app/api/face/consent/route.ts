import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success || !authResult.user?.matricula) {
      return NextResponse.json(
        { success: false, message: authResult.error || 'Token inválido' },
        { status: authResult.status || 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const consentFlag: boolean = body?.consent ?? true

    const { error, data } = await supabase
      .from('usuarios')
      .update({ termos_reconhecimento_facial: consentFlag })
      .eq('matricula', authResult.user.matricula)
      .select('matricula, termos_reconhecimento_facial')
      .single()

    if (error) {
      console.error('Erro ao registrar consentimento facial:', error)
      return NextResponse.json(
        { success: false, message: 'Não foi possível salvar o consentimento' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Consentimento atualizado',
      consent: data?.termos_reconhecimento_facial ?? consentFlag
    })
  } catch (error) {
    console.error('Consent API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
