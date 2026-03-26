import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success || !authResult.user?.matricula) {
      return NextResponse.json(
        { success: false, message: authResult.error || 'Usuario nao autenticado' },
        { status: authResult.status || 401 }
      )
    }

    let contratoRaiz = authResult.user.contrato_raiz

    if (!contratoRaiz) {
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

      contratoRaiz = userData.contrato_raiz
    }

    const { data: responsaveis, error } = await supabase
      .from('usuarios')
      .select('matricula, nome, email, contrato_raiz')
      .eq('contrato_raiz', contratoRaiz)
      .order('nome', { ascending: true })

    if (error) {
      console.error('Erro ao buscar responsaveis de desvios:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar responsaveis' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      users: responsaveis ?? []
    })
  } catch (error) {
    console.error('Desvios responsaveis API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
