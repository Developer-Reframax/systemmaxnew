import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = 'projetos-boas-praticas'
const MAX_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_EXT = ['pdf', 'doc', 'docx', 'xls', 'xlsx']

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyJWTToken(request)
    if (!auth.success) return NextResponse.json({ error: auth.error }, { status: 401 })

    const { id } = await context.params
    const contentType = request.headers.get('content-type') || ''

    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Envie o arquivo via multipart/form-data' }, { status: 400 })
    }

    const form = await request.formData()
    const file = form.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'Arquivo obrigatorio' }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'Arquivo excede 50MB' }, { status: 400 })

    const ext = (file.name.split('.').pop() || '').toLowerCase()
    const isImage = (file.type || '').startsWith('image/')
    const allowed = isImage || ALLOWED_EXT.includes(ext)
    if (!allowed) return NextResponse.json({ error: 'Formato de arquivo nao permitido' }, { status: 400 })

    const fileName = `${id}/${Date.now()}-${file.name}`
    const { data: uploaded, error: uploadError } = await supabase.storage.from(BUCKET).upload(fileName, file)
    if (uploadError) {
      console.error('Erro upload projeto:', uploadError)
      return NextResponse.json({ error: 'Falha no upload' }, { status: 500 })
    }

    const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(uploaded.path).data.publicUrl

    const { data, error } = await supabase
      .from('boaspraticas_praticas')
      .update({ projeto: publicUrl, fabricou_dispositivo: true })
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Erro ao salvar projeto:', error)
      return NextResponse.json({ error: 'Erro ao salvar projeto' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { ...data, projeto_url: publicUrl } })
  } catch (e) {
    console.error('Erro interno upload projeto:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
