import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function PUT(request: NextRequest) {
  try {
    // Verificar token de autenticação
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Token de acesso requerido' }, { status: 401 })
    }
    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Token invalido ou expirado' }, { status: 401 })
    }


    const matricula = user.matricula

    // Obter dados da requisição
    const body = await request.json()
    const { phone, letra_id, equipe_id } = body

    // Validar se pelo menos um campo foi fornecido
    if (!phone && !letra_id && !equipe_id) {
      return NextResponse.json(
        { success: false, message: 'Pelo menos um campo deve ser fornecido para atualização' },
        { status: 400 }
      )
    }

    // Preparar dados para atualização
    const updateData: {
      updated_at: string
      phone?: string
      letra_id?: number
      equipe_id?: number
    } = {
      updated_at: new Date().toISOString()
    }

    if (phone !== undefined) {
      // Validar formato do telefone (básico)
      if (phone && typeof phone !== 'string') {
        return NextResponse.json(
          { success: false, message: 'Telefone deve ser uma string' },
          { status: 400 }
        )
      }
      updateData.phone = phone
    }

    if (letra_id !== undefined) {
      updateData.letra_id = letra_id
    }

    if (equipe_id !== undefined) {
      updateData.equipe_id = equipe_id
    }

    // Atualizar dados do usuário
    const { data: updatedUser, error } = await supabase
      .from('usuarios')
      .update(updateData)
      .eq('matricula', matricula)
      .select('matricula, nome, email, phone, letra_id, equipe_id, termos')
      .single()

    if (error) {
      console.error('Erro ao atualizar dados do usuário:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao atualizar dados do usuário' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Dados atualizados com sucesso',
      user: {
        id: updatedUser.matricula.toString(),
        nome: updatedUser.nome,
        email: updatedUser.email,
        phone: updatedUser.phone,
        letra_id: updatedUser.letra_id,
        equipe_id: updatedUser.equipe_id,
        termos: updatedUser.termos
      }
    })

  } catch (error) {
    console.error('Erro na atualização do perfil:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
