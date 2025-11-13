import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// POST - Upload de imagem para desvio
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    const { id } = await params
    const formData = await request.formData()
    const file = formData.get('file') as File
    const categoria = formData.get('categoria') as string

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Arquivo não fornecido' },
        { status: 400 }
      )
    }

    if (!categoria || !['desvio', 'evidencia'].includes(categoria)) {
      return NextResponse.json(
        { success: false, message: 'Categoria inválida. Use: antes, durante, depois ou evidencia' },
        { status: 400 }
      )
    }

    // Verificar se o desvio existe
    const { data: desvio, error: desvioError } = await supabase
      .from('desvios')
      .select('id, matricula_user, status')
      .eq('id', id)
      .single()

    if (desvioError || !desvio) {
      return NextResponse.json(
        { success: false, message: 'Desvio não encontrado' },
        { status: 404 }
      )
    }

    // Verificar permissões: usuário criador ou Admin/Editor
    const isOwner = desvio.matricula_user === authResult.user?.matricula
    const isAdminOrEditor = ['Admin', 'Editor'].includes(authResult.user?.role || '')
    
    if (!isOwner && !isAdminOrEditor) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado - você não pode adicionar imagens a este desvio' },
        { status: 403 }
      )
    }

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'Tipo de arquivo não permitido. Use: JPEG, PNG ou WebP' },
        { status: 400 }
      )
    }

    // Validar tamanho do arquivo (máximo 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: 'Arquivo muito grande. Tamanho máximo: 5MB' },
        { status: 400 }
      )
    }

    // Verificar limite de imagens por categoria (máximo 5 por categoria)
    const { count } = await supabase
      .from('imagens_desvios')
      .select('*', { count: 'exact', head: true })
      .eq('desvio_id', id)
      .eq('categoria', categoria)

    if (count && count >= 5) {
      return NextResponse.json(
        { success: false, message: `Limite de 5 imagens por categoria atingido para '${categoria}'` },
        { status: 400 }
      )
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const fileName = `desvio_${id}_${categoria}_${timestamp}_${randomString}.${fileExtension}`
    const filePath = `desvios/${id}/${fileName}`

    // Converter File para ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)

    // Upload para Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('desvios-images')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Erro no upload:', uploadError)
      return NextResponse.json(
        { success: false, message: 'Erro ao fazer upload da imagem' },
        { status: 500 }
      )
    }

    // Obter URL pública da imagem
    const { data: urlData } = supabase.storage
      .from('desvios-images')
      .getPublicUrl(filePath)

    // Salvar informações da imagem no banco
    const { data: imagemData, error: dbError } = await supabase
      .from('imagens_desvios')
      .insert({
        desvio_id: id,
        categoria: 'evidencia',
        nome_arquivo: file.name,
        url_storage: urlData.publicUrl,
        tamanho: file.size,
        tipo_mime: file.type
      })
      .select()
      .single()

    if (dbError) {
      // Se falhou ao salvar no banco, remover arquivo do storage
      await supabase.storage
        .from('desvios-images')
        .remove([filePath])
      
      console.error('Erro ao salvar imagem no banco:', dbError)
      return NextResponse.json(
        { success: false, message: 'Erro ao salvar informações da imagem' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Imagem enviada com sucesso',
      data: imagemData
    })

  } catch (error) {
    console.error('Upload imagem API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// GET - Listar imagens do desvio
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const categoria = searchParams.get('categoria')

    // Verificar se o desvio existe
    const { data: desvio, error: desvioError } = await supabase
      .from('desvios')
      .select('id, matricula_user')
      .eq('id', id)
      .single()

    if (desvioError || !desvio) {
      return NextResponse.json(
        { success: false, message: 'Desvio não encontrado' },
        { status: 404 }
      )
    }

    // Verificar permissões: usuário criador ou Admin/Editor
    const isOwner = desvio.matricula_user === authResult.user?.matricula
    const isAdminOrEditor = ['Admin', 'Editor'].includes(authResult.user?.role || '')
    
    if (!isOwner && !isAdminOrEditor) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado - você não pode visualizar imagens deste desvio' },
        { status: 403 }
      )
    }

    // Construir query
    let query = supabase
      .from('imagens_desvios')
      .select('*')
      .eq('desvio_id', id)
      .order('created_at', { ascending: false })

    // Filtrar por categoria se especificada
    if (categoria && ['antes', 'durante', 'depois', 'evidencia'].includes(categoria)) {
      query = query.eq('categoria', categoria)
    }

    const { data: imagens, error } = await query

    if (error) {
      console.error('Erro ao buscar imagens:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar imagens' },
        { status: 500 }
      )
    }

    // Agrupar por categoria
    const imagensPorCategoria = {
      antes: imagens?.filter(img => img.categoria === 'antes') || [],
      durante: imagens?.filter(img => img.categoria === 'durante') || [],
      depois: imagens?.filter(img => img.categoria === 'depois') || [],
      evidencia: imagens?.filter(img => img.categoria === 'evidencia') || []
    }

    return NextResponse.json({
      success: true,
      data: {
        total: imagens?.length || 0,
        imagens: imagens || [],
        por_categoria: imagensPorCategoria
      }
    })

  } catch (error) {
    console.error('Listar imagens API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Remover imagem
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const imagemId = searchParams.get('imagem_id')

    if (!imagemId) {
      return NextResponse.json(
        { success: false, message: 'ID da imagem não fornecido' },
        { status: 400 }
      )
    }

    // Buscar informações da imagem e do desvio
    const { data: imagem, error: imagemError } = await supabase
      .from('imagens_desvios')
      .select(`
        *,
        desvio:desvios(id, matricula_user, status)
      `)
      .eq('id', imagemId)
      .eq('desvio_id', id)
      .single()

    if (imagemError || !imagem) {
      return NextResponse.json(
        { success: false, message: 'Imagem não encontrada' },
        { status: 404 }
      )
    }

    // Verificar permissões: usuário criador ou Admin/Editor
    const isOwner = imagem.desvio.matricula_user === authResult.user?.matricula
    const isAdminOrEditor = ['Admin', 'Editor'].includes(authResult.user?.role || '')
    
    if (!isOwner && !isAdminOrEditor) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado - você não pode remover esta imagem' },
        { status: 403 }
      )
    }

    // Remover arquivo do storage
    const { error: storageError } = await supabase.storage
      .from('desvios-images')
      .remove([imagem.url_storage])

    if (storageError) {
      console.error('Erro ao remover do storage:', storageError)
      // Continuar mesmo com erro no storage para limpar o banco
    }

    // Remover registro do banco
    const { error: dbError } = await supabase
      .from('imagens_desvios')
      .delete()
      .eq('id', imagemId)

    if (dbError) {
      console.error('Erro ao remover do banco:', dbError)
      return NextResponse.json(
        { success: false, message: 'Erro ao remover imagem' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Imagem removida com sucesso'
    })

  } catch (error) {
    console.error('Remover imagem API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}