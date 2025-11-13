import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// GET - Buscar todas as funcionalidades de módulos exclusivos
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Token de acesso requerido' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    let decoded: jwt.JwtPayload | string
    
    try {
      decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload
    } catch {
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 401 }
      )
    }

    // Verificar se o usuário tem permissão (Admin ou Editor)
    if (decoded.role !== 'Admin' && decoded.role !== 'Editor') {
      return NextResponse.json(
        { success: false, error: 'Acesso negado. Apenas Admin e Editor podem gerenciar funcionalidades.' },
        { status: 403 }
      )
    }

    // Buscar funcionalidades de módulos exclusivos
    const { data: functionalities, error } = await supabase
      .from('modulo_funcionalidades')
      .select(`
        *,
        modulos(
          id,
          nome,
          tipo
        )
      `)
      .eq('ativa', true)
      .order('nome')

    // Filtrar por tipo exclusivo
    const exclusiveFunctionalities = functionalities?.filter(
      (func: { modulos?: { tipo?: string } }) => func.modulos?.tipo === 'exclusivo'
    ) || []

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      functionalities: exclusiveFunctionalities
    })

  } catch (error) {
    console.error('Erro na API de funcionalidades:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
