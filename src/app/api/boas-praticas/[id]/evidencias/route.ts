import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = 'images-evidencia-boas-praticas'
const MAX_SIZE = 10 * 1024 * 1024
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyJWTToken(request)
    if (!auth.success) return NextResponse.json({ error: auth.error }, { status: 401 })

    const { id } = await context.params
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const file = form.get('file') as File | null
      const categoria = String(form.get('categoria') || 'antes')
      const descricao = String(form.get('descricao') || '')

      if (!file) return NextResponse.json({ error: 'Arquivo obrigatorio' }, { status: 400 })
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: 'Cada imagem deve ter no maximo 10MB' }, { status: 400 })
      }
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: 'Formato nao suportado. Use JPEG, PNG, GIF ou WEBP' },
          { status: 400 }
        )
      }

      const fileName = `${id}/${Date.now()}-${file.name}`
      const { data: uploaded, error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, file)

      if (uploadError) {
        console.error('Erro upload evidencia boa pratica:', uploadError)
        const uploadMessage = uploadError.message || 'Falha no upload'
        const isClientError =
          uploadMessage.toLowerCase().includes('mime type') ||
          uploadMessage.toLowerCase().includes('not supported')

        return NextResponse.json(
          { error: uploadMessage },
          { status: isClientError ? 400 : 500 }
        )
      }

      const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(uploaded.path).data.publicUrl

      const { data, error } = await supabase
        .from('boaspraticas_evidencias')
        .insert({ pratica_id: id, url: publicUrl, categoria, descricao, is_video: false })
        .select('*')
        .single()

      if (error) return NextResponse.json({ error: 'Erro ao salvar evidencia' }, { status: 500 })
      return NextResponse.json({ success: true, data })
    }

    const body = await request.json()
    const { url, categoria, descricao, is_video } = body
    if (!url || !is_video) {
      return NextResponse.json({ error: 'URL de video obrigatoria' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('boaspraticas_evidencias')
      .insert({
        pratica_id: id,
        url,
        categoria: categoria || 'antes',
        descricao: descricao || null,
        is_video: true
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: 'Erro ao salvar evidencia' }, { status: 500 })
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Erro interno upload evidencia boa pratica:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
