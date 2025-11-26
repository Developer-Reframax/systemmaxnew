import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = 'images-evidencia-boas-praticas'

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

      if (!file) return NextResponse.json({ error: 'Arquivo obrigatório' }, { status: 400 })

      const fileName = `${id}/${Date.now()}-${file.name}`
      const { data: uploaded, error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, file)

      if (uploadError) return NextResponse.json({ error: 'Falha no upload' }, { status: 500 })

      const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(uploaded.path).data.publicUrl

      const { data, error } = await supabase
        .from('boaspraticas_evidencias')
        .insert({ pratica_id: id, url: publicUrl, categoria, descricao, is_video: false })
        .select('*')
        .single()

      if (error) return NextResponse.json({ error: 'Erro ao salvar evidência' }, { status: 500 })
      return NextResponse.json({ success: true, data })
    } else {
      const body = await request.json()
      const { url, categoria, descricao, is_video } = body
      if (!url || !is_video) return NextResponse.json({ error: 'URL de vídeo obrigatória' }, { status: 400 })

      const { data, error } = await supabase
        .from('boaspraticas_evidencias')
        .insert({ pratica_id: id, url, categoria: categoria || 'antes', descricao: descricao || null, is_video: true })
        .select('*')
        .single()

      if (error) return NextResponse.json({ error: 'Erro ao salvar evidência' }, { status: 500 })
      return NextResponse.json({ success: true, data })
    }
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
