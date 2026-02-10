import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const AUTH_ERROR = { error: 'Token de acesso requerido'}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
   const token = request.cookies.get('auth_token')?.value
       if (!token) {
         return NextResponse.json(AUTH_ERROR, { status: 401 })
       }
       const user = verifyToken(token)
       if (!user) {
         return NextResponse.json({ error: 'Token invalido ou expirado' }, { status: 401 })
       }

    // Obter dados do formulário
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo não fornecido' },
        { status: 400 }
      )
    }

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Apenas imagens são permitidas' },
        { status: 400 }
      )
    }

    // Validar tamanho do arquivo (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Arquivo muito grande (máx. 5MB)' },
        { status: 400 }
      )
    }

    // Gerar nome único para o arquivo
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    
    // Converter arquivo para buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Upload para Supabase Storage
    const { error } = await supabase.storage
      .from('desvios-images')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Erro no upload:', error)
      return NextResponse.json(
        { error: 'Erro no upload da imagem' },
        { status: 500 }
      )
    }

    // Obter URL pública da imagem
    const { data: { publicUrl } } = supabase.storage
      .from('desvios-images')
      .getPublicUrl(fileName)

    return NextResponse.json({
      success: true,
      data: {
        fileName,
        publicUrl,
        size: file.size,
        type: file.type
      }
    })

  } catch (error) {
    console.error('Erro na API de upload:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
