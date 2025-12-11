import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/auth'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const AUTH_ERROR = { ERROR: 'Token de acesso requerido'}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.cookies.get('auth_token')?.value
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Token não fornecido' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { matricula_usuario, inicio_sessao, paginas_acessadas, modulos_acessados } = body
    
    // Verificar token JWT
    // Verificar autenticação/
        const token = request.cookies.get('auth_token')?.value
        if (!token){
          return NextResponse.json(AUTH_ERROR, { status: 401})
        }
        const user = verifyToken (token)
        if (!user){
          return NextResponse.json ({error: 'Token invalido ou expirado'}, { status: 401 })
        }
    // Verificar se a matrícula do token corresponde à da requisição
    if (user.matricula !== matricula_usuario) {
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
    const body = await request.json()
    const { matricula_usuario, paginas_acessadas, modulos_acessados } = body
    
    // Verificar token JWT
   // Verificar autenticação/
       const token = request.cookies.get('auth_token')?.value
       if (!token){
         return NextResponse.json(AUTH_ERROR, { status: 401})
       }
       const user = verifyToken (token)
       if (!user){
         return NextResponse.json ({error: 'Token invalido ou expirado'}, { status: 401 })
       }

    // Verificar se a matrícula do token corresponde à da requisição
    if (user.matricula !== matricula_usuario) {
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
