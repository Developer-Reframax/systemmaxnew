import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const jwtSecret = process.env.JWT_SECRET!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Token não fornecido' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const body = await request.json()
    const { matricula_usuario, inicio_sessao, paginas_acessadas, modulos_acessados } = body
    
    // Verificar token JWT
    let decoded: jwt.JwtPayload | string
    try {
      decoded = jwt.verify(token, jwtSecret)
    } catch {
      return NextResponse.json(
        { success: false, message: 'Token inválido' },
        { status: 401 }
      )
    }

    // Verificar se a matrícula do token corresponde à da requisição
    if (typeof decoded === 'object' && decoded !== null && 'matricula' in decoded && decoded.matricula !== matricula_usuario) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Criar nova sessão
    const { data, error } = await supabase
      .from('sessoes')
      .insert({
        matricula_usuario,
        inicio_sessao,
        paginas_acessadas: paginas_acessadas || 1,
        modulos_acessados: modulos_acessados || ['Login']
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar sessão:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao criar sessão' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Sessão criada com sucesso',
      session: data
    })

  } catch (error) {
    console.error('Session API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Token não fornecido' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const body = await request.json()
    const { matricula_usuario, paginas_acessadas, modulos_acessados } = body
    
    // Verificar token JWT
    let decoded: jwt.JwtPayload | string
    try {
      decoded = jwt.verify(token, jwtSecret)
    } catch {
      return NextResponse.json(
        { success: false, message: 'Token inválido' },
        { status: 401 }
      )
    }

    // Verificar se a matrícula do token corresponde à da requisição
    if (typeof decoded === 'object' && decoded !== null && 'matricula' in decoded && decoded.matricula !== matricula_usuario) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Atualizar a sessão mais recente do usuário
    const { data, error } = await supabase
      .from('sessoes')
      .update({
        paginas_acessadas,
        modulos_acessados
      })
      .eq('matricula_usuario', matricula_usuario)
      .is('fim_sessao', null)
      .order('inicio_sessao', { ascending: false })
      .limit(1)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar sessão:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao atualizar sessão' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Sessão atualizada com sucesso',
      session: data
    })

  } catch (error) {
    console.error('Session update API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
