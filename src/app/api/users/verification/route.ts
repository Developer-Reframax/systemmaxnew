import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    // Verificar token de autenticação
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Token de autenticação não encontrado' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    let decoded: jwt.JwtPayload | string

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!)
    } catch  {
      return NextResponse.json(
        { success: false, message: 'Token inválido' },
        { status: 401 }
      )
    }

    const matricula = typeof decoded === 'object' && decoded !== null ? (decoded as jwt.JwtPayload).matricula : null

    // Buscar dados do usuário
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('matricula, nome, email, phone, letra_id, equipe_id, termos')
      .eq('matricula', matricula)
      .single()

    if (error || !usuario) {
      return NextResponse.json(
        { success: false, message: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se termos foram aceitos
    const termsAccepted = usuario.termos === true

    // Verificar campos obrigatórios
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
    console.error('Erro na verificação do usuário:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
