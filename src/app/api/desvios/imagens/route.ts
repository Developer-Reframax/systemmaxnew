import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// POST - Salvar URL da imagem na tabela imagens_desvios
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    const body = await request.json()
    const { desvio_id, url, categoria, nome_arquivo, tamanho, tipo_mime } = body

    // Validar campos obrigatórios
    if (!desvio_id || !url) {
      return NextResponse.json(
        { success: false, message: 'desvio_id e url são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se o desvio existe
    const { data: desvio, error: desvioError } = await supabase
      .from('desvios')
      .select('id')
      .eq('id', desvio_id)
      .single()

    if (desvioError || !desvio) {
      return NextResponse.json(
        { success: false, message: 'Desvio não encontrado' },
        { status: 404 }
      )
    }

    // Inserir imagem na tabela
    const { data: novaImagem, error } = await supabase
      .from('imagens_desvios')
      .insert({
        desvio_id,
        url_storage: url,
        categoria: categoria || 'desvio',
        nome_arquivo: nome_arquivo || 'imagem',
        tamanho: tamanho || 0,
        tipo_mime: tipo_mime || 'image/jpeg'
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao salvar imagem:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao salvar imagem' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Imagem salva com sucesso',
      data: novaImagem
    }, { status: 201 })

  } catch (error) {
    console.error('Images POST API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// GET - Listar imagens de um desvio
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const desvio_id = searchParams.get('desvio_id')

    if (!desvio_id) {
      return NextResponse.json(
        { success: false, message: 'desvio_id é obrigatório' },
        { status: 400 }
      )
    }

    const { data: imagens, error } = await supabase
      .from('imagens_desvios')
      .select('*')
      .eq('desvio_id', desvio_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar imagens:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar imagens' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: imagens
    })

  } catch (error) {
    console.error('Images GET API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
