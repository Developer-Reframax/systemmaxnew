import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Função para verificar o token JWT
function verifyToken(token: string): { contrato_raiz: string; matricula: string } | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as { contrato_raiz: string; matricula: string }
  } catch {
    return null
  }
}

// PUT - Atualizar tipo de interação
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: 'Token de autorização necessário' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { tipo } = body

    if (!tipo) {
      return NextResponse.json({ success: false, message: 'Tipo é obrigatório' }, { status: 400 })
    }

    // Verificar se o tipo existe
    const { data: existing } = await supabase
      .from('interacao_tipos')
      .select('contrato_id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Tipo não encontrado' }, { status: 404 })
    }

    // Verificar se já existe outro tipo com o mesmo nome para o contrato
    const { data: duplicate } = await supabase
      .from('interacao_tipos')
      .select('id')
      .eq('tipo', tipo)
      .eq('contrato_id', existing.contrato_id)
      .neq('id', id)
      .single()

    if (duplicate) {
      return NextResponse.json({ success: false, message: 'Já existe um tipo com este nome para este contrato' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('interacao_tipos')
      .update({ tipo })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar tipo:', error)
      return NextResponse.json({ success: false, message: 'Erro ao atualizar tipo' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json({ success: false, message: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE - Excluir tipo de interação
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: 'Token de autorização necessário' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 })
    }

    const { id } = await params

    // Verificar se o tipo existe
    const { data: existing } = await supabase
      .from('interacao_tipos')
      .select('id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Tipo não encontrado' }, { status: 404 })
    }

    // Verificar se há interações usando este tipo
    const { data: interacoes } = await supabase
      .from('interacoes')
      .select('id')
      .eq('tipo_id', id)
      .limit(1)

    if (interacoes && interacoes.length > 0) {
      return NextResponse.json({ success: false, message: 'Não é possível excluir este tipo pois há interações associadas' }, { status: 400 })
    }

    const { error } = await supabase
      .from('interacao_tipos')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao excluir tipo:', error)
      return NextResponse.json({ success: false, message: 'Erro ao excluir tipo' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Tipo excluído com sucesso' })
  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json({ success: false, message: 'Erro interno do servidor' }, { status: 500 })
  }
}