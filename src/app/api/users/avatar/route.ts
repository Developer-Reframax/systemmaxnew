import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'

const supabaseServiceKey = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Verify JWT token
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const user = authResult.user
    const formData = await request.formData()
    const avatarFile = formData.get('avatar') as File
    const matricula = formData.get('matricula') as string
    const matriculaUserLogado = user?.matricula as unknown

    // Users can only upload their own avatar or admins can upload for any user
    if (!user || (matriculaUserLogado !== matricula && user.role !== 'Admin')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    if (!avatarFile) {
      return NextResponse.json({ error: 'Arquivo de avatar não fornecido' }, { status: 400 })
    }

    // Validate file type
    if (!avatarFile.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Arquivo deve ser uma imagem' }, { status: 400 })
    }

    // Validate file size (5MB limit)
    if (avatarFile.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo deve ter no máximo 5MB' }, { status: 400 })
    }

    try {
      // Generate unique filename
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `${matricula}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Convert File to ArrayBuffer for Supabase storage
      const arrayBuffer = await avatarFile.arrayBuffer()
      const buffer = new Uint8Array(arrayBuffer)

      // Upload to Supabase storage
      const { error: uploadError } = await supabaseServiceKey.storage
        .from('avatars')
        .upload(filePath, buffer, {
          contentType: avatarFile.type,
          upsert: false
        })

      if (uploadError) {
        console.error('Error uploading avatar:', uploadError)
        return NextResponse.json({ error: 'Erro ao fazer upload do avatar' }, { status: 500 })
      }

      // Get public URL
      const { data } = supabaseServiceKey.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const avatarUrl = data.publicUrl

      // Update user's avatar_url in database
      const { error: updateError } = await supabaseServiceKey
        .from('usuarios')
        .update({ avatar_url: avatarUrl })
        .eq('matricula', matricula)

      if (updateError) {
        console.error('Error updating user avatar URL:', updateError)
        // Try to delete the uploaded file if database update fails
        await supabaseServiceKey.storage
          .from('avatars')
          .remove([filePath])
        return NextResponse.json({ error: 'Erro ao atualizar URL do avatar' }, { status: 500 })
      }

      return NextResponse.json({ 
        message: 'Avatar enviado com sucesso',
        avatar_url: avatarUrl 
      })
    } catch (storageError) {
      console.error('Storage error:', storageError)
      return NextResponse.json({ error: 'Erro no armazenamento do arquivo' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error in POST /api/users/avatar:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
