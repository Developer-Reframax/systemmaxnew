import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Buscar registro 3P específico por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'ID do registro não fornecido' }, { status: 400 })
    }

    // Buscar registro 3P com todas as informações relacionadas
    const { data: registro3p, error } = await supabase
      .from('registros_3ps')
      .select(`
        *,
        area:locais(id, local, contrato),
        criador:usuarios!registros_3ps_matricula_criador_fkey(matricula, nome, email, funcao),
        participantes:participantes_3ps(
          id,
          matricula_participante,
          participante:usuarios!participantes_3ps_matricula_participante_fkey(matricula, nome, email, funcao)
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Erro ao buscar registro 3P:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Registro 3P não encontrado' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Erro ao buscar registro 3P' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: registro3p
    })
  } catch (error) {
    console.error('Erro na API de registro 3P:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// PUT - Atualizar registro 3P
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const { id } = await params
    const updateData = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'ID do registro não fornecido' }, { status: 400 })
    }

    const tiposValidos = ['Melhoria', 'Aprendizado']
    if (updateData.tipo !== undefined && !tiposValidos.includes(updateData.tipo)) {
      return NextResponse.json({ 
        error: 'Campo tipo deve ser Melhoria ou Aprendizado' 
      }, { status: 400 })
    }

    // Verificar se o registro existe e se o usuário tem permissão para editá-lo
    const { data: registroExistente, error: errorVerificacao } = await supabase
      .from('registros_3ps')
      .select('id, matricula_criador')
      .eq('id', id)
      .single()

    if (errorVerificacao) {
      if (errorVerificacao.code === 'PGRST116') {
        return NextResponse.json({ error: 'Registro 3P não encontrado' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Erro ao verificar registro' }, { status: 500 })
    }

    // Verificar se o usuário é o criador do registro
    if (registroExistente.matricula_criador !== authResult.user?.matricula) {
      return NextResponse.json({ error: 'Sem permissão para editar este registro' }, { status: 403 })
    }

    // Extrair participantes para atualizar separadamente
    const participantes = updateData.participantes
    delete updateData.participantes
    delete updateData.matricula_criador // Não permitir alterar o criador

    // Atualizar registro principal
    const { data: registroAtualizado, error: errorUpdate } = await supabase
      .from('registros_3ps')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        area:locais(id, local, contrato),
        criador:usuarios!registros_3ps_matricula_criador_fkey(matricula, nome, email, funcao)
      `)
      .single()

    if (errorUpdate) {
      console.error('Erro ao atualizar registro 3P:', errorUpdate)
      return NextResponse.json({ error: 'Erro ao atualizar registro 3P' }, { status: 500 })
    }

    // Atualizar participantes se fornecidos
    if (Array.isArray(participantes)) {
      // Remover participantes existentes
      await supabase
        .from('participantes_3ps')
        .delete()
        .eq('registro_3p_id', id)

      // Inserir novos participantes
      if (participantes.length > 0) {
        const participantesData = participantes.map((matricula: number) => ({
          registro_3p_id: id,
          matricula_participante: matricula
        }))

        const { error: errorParticipantes } = await supabase
          .from('participantes_3ps')
          .insert(participantesData)

        if (errorParticipantes) {
          console.error('Erro ao atualizar participantes:', errorParticipantes)
        }
      }
    }

    // Buscar registro completo atualizado
    const { data: registroCompleto, error: errorCompleto } = await supabase
      .from('registros_3ps')
      .select(`
        *,
        area:locais(id, local, contrato),
        criador:usuarios!registros_3ps_matricula_criador_fkey(matricula, nome, email, funcao),
        participantes:participantes_3ps(
          id,
          matricula_participante,
          participante:usuarios!participantes_3ps_matricula_participante_fkey(matricula, nome, email, funcao)
        )
      `)
      .eq('id', id)
      .single()

    if (errorCompleto) {
      console.error('Erro ao buscar registro atualizado:', errorCompleto)
      return NextResponse.json({ 
        success: true, 
        data: registroAtualizado,
        message: 'Registro 3P atualizado com sucesso' 
      })
    }

    return NextResponse.json({
      success: true,
      data: registroCompleto,
      message: 'Registro 3P atualizado com sucesso'
    })
  } catch (error) {
    console.error('Erro na atualização do registro 3P:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE - Excluir registro 3P
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'ID do registro não fornecido' }, { status: 400 })
    }

    const tiposValidos = ['Melhoria', 'Aprendizado']
    if (updateData.tipo !== undefined -and -not ( -contains updateData.tipo)) {
      return NextResponse.json({ 
        error: 'Campo tipo deve ser Melhoria ou Aprendizado' 
      }, { status: 400 })
    }

    // Verificar se o registro existe e se o usuário tem permissão para excluí-lo
    const { data: registroExistente, error: errorVerificacao } = await supabase
      .from('registros_3ps')
      .select('id, matricula_criador')
      .eq('id', id)
      .single()

    if (errorVerificacao) {
      if (errorVerificacao.code === 'PGRST116') {
        return NextResponse.json({ error: 'Registro 3P não encontrado' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Erro ao verificar registro' }, { status: 500 })
    }

    // Verificar se o usuário é o criador do registro
    if (registroExistente.matricula_criador !== authResult.user?.matricula) {
      return NextResponse.json({ error: 'Sem permissão para excluir este registro' }, { status: 403 })
    }

    // Excluir registro (participantes serão excluídos automaticamente por CASCADE)
    const { error: errorDelete } = await supabase
      .from('registros_3ps')
      .delete()
      .eq('id', id)

    if (errorDelete) {
      console.error('Erro ao excluir registro 3P:', errorDelete)
      return NextResponse.json({ error: 'Erro ao excluir registro 3P' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Registro 3P excluído com sucesso'
    })
  } catch (error) {
    console.error('Erro na exclusão do registro 3P:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
