import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Listar usuários filtrados por contrato_raiz
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    // Verificar se o usuário está autenticado
    if (!authResult.user) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      )
    }

    // Buscar usuários do mesmo contrato_raiz do usuário autenticado
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('matricula, nome, email, funcao')
      .eq('contrato_raiz', authResult.user.contrato_raiz)
      .eq('status', 'ativo')
      .order('nome', { ascending: true })

    if (error) {
      console.error('Erro ao buscar usuários:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar usuários' },
        { status: 500 }
      )
    }

    return NextResponse.json(usuarios || [])

  } catch (error) {
    console.error('Usuarios GET API error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
