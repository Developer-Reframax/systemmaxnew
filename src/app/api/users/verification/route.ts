import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token de autenticacao nao encontrado' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Token invalido ou expirado' },
        { status: 401 }
      )
    }

    const matricula = decoded.matricula

    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('matricula, nome, email, phone, letra_id, equipe_id, termos')
      .eq('matricula', matricula)
      .single()

    if (error || !usuario) {
      return NextResponse.json(
        { success: false, message: 'Usuario nao encontrado' },
        { status: 404 }
      )
    }

    const termsAccepted = usuario.termos === true

    const missingFields: string[] = []
    if (!usuario.phone) missingFields.push('phone')
    if (!usuario.letra_id) missingFields.push('letra_id')
    if (!usuario.equipe_id) missingFields.push('equipe_id')

    const hasRequiredData = missingFields.length === 0

    return NextResponse.json({
      success: true,
      termsAccepted,
      hasRequiredData,
      missingFields,
      userData: {
        id: usuario.matricula.toString(),
        nome: usuario.nome,
        email: usuario.email,
        phone: usuario.phone,
        letra_id: usuario.letra_id,
        equipe_id: usuario.equipe_id,
        termos: usuario.termos
      }
    })
  } catch (error) {
    console.error('Erro na verificacao do usuario:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

