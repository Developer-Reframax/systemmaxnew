import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Configuração do Supabase com Service Role Key para bypass do RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// GET /api/apadrinhamento/[id] - Buscar apadrinhamento por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'ID do apadrinhamento é obrigatório' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('apadrinhamentos')
      .select(`
        *,
        novato:usuarios!apadrinhamentos_matricula_novato_fkey(matricula, nome, email, funcao),
        padrinho:usuarios!apadrinhamentos_matricula_padrinho_fkey(matricula, nome, email, funcao),
        supervisor_info:usuarios!apadrinhamentos_matricula_supervisor_fkey(matricula, nome, email, funcao)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Apadrinhamento não encontrado' },
          { status: 404 }
        )
      }
      console.error('Erro ao buscar apadrinhamento:', error)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Erro na API de apadrinhamento por ID:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/apadrinhamento/[id] - Atualizar apadrinhamento
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'ID do apadrinhamento é obrigatório' },
        { status: 400 }
      )
    }

    const {
      matricula_padrinho,
      matricula_supervisor,
      tipo_apadrinhamento,
      data_inicio,
      observacoes
    } = body

    // Validar tipo de apadrinhamento se fornecido
    if (tipo_apadrinhamento) {
      const tiposValidos = ['Novo colaborador', 'Novo operador de ponte', 'Novo operador de empilhadeira']
      if (!tiposValidos.includes(tipo_apadrinhamento)) {
        return NextResponse.json(
          { error: 'Tipo de apadrinhamento inválido' },
          { status: 400 }
        )
      }
    }

    // Verificar se o apadrinhamento existe
    const { data: apadrinhamentoExistente } = await supabase
      .from('apadrinhamentos')
      .select('id, status')
      .eq('id', id)
      .single()

    if (!apadrinhamentoExistente) {
      return NextResponse.json(
        { error: 'Apadrinhamento não encontrado' },
        { status: 404 }
      )
    }

    // Não permitir edição de apadrinhamentos finalizados
    if (apadrinhamentoExistente.status === 'Concluído') {
      return NextResponse.json(
        { error: 'Não é possível editar apadrinhamentos concluídos' },
        { status: 400 }
      )
    }

    // Verificar se as matrículas existem (se fornecidas)
    const matriculasParaVerificar = []
    if (matricula_padrinho) matriculasParaVerificar.push(matricula_padrinho)
    if (matricula_supervisor) matriculasParaVerificar.push(matricula_supervisor)

    if (matriculasParaVerificar.length > 0) {
      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('matricula')
        .in('matricula', matriculasParaVerificar)

      const matriculasEncontradas = usuarios?.map(u => u.matricula) || []
      
      if (matricula_padrinho && !matriculasEncontradas.includes(matricula_padrinho)) {
        return NextResponse.json(
          { error: 'Matrícula do padrinho não encontrada' },
          { status: 400 }
        )
      }

      if (matricula_supervisor && !matriculasEncontradas.includes(matricula_supervisor)) {
        return NextResponse.json(
          { error: 'Matrícula do supervisor não encontrada' },
          { status: 400 }
        )
      }
    }

    // Preparar dados para atualização
    const updateData: Record<string, unknown> = {}
    if (matricula_padrinho !== undefined) updateData.matricula_padrinho = matricula_padrinho
    if (matricula_supervisor !== undefined) updateData.matricula_supervisor = matricula_supervisor
    if (tipo_apadrinhamento !== undefined) updateData.tipo_apadrinhamento = tipo_apadrinhamento
    if (data_inicio !== undefined) updateData.data_inicio = data_inicio
    if (observacoes !== undefined) updateData.observacoes = observacoes

    // Atualizar apadrinhamento
    const { data, error } = await supabase
      .from('apadrinhamentos')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        novato:usuarios!apadrinhamentos_matricula_novato_fkey(matricula, nome, email, funcao),
        padrinho:usuarios!apadrinhamentos_matricula_padrinho_fkey(matricula, nome, email, funcao),
        supervisor_info:usuarios!apadrinhamentos_matricula_supervisor_fkey(matricula, nome, email, funcao)
      `)
      .single()

    if (error) {
      console.error('Erro ao atualizar apadrinhamento:', error)
      return NextResponse.json(
        { error: 'Erro ao atualizar apadrinhamento' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Erro na atualização de apadrinhamento:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/apadrinhamento/[id] - Excluir apadrinhamento
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'ID do apadrinhamento é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o apadrinhamento existe
    const { data: apadrinhamentoExistente } = await supabase
      .from('apadrinhamentos')
      .select('id, status')
      .eq('id', id)
      .single()

    if (!apadrinhamentoExistente) {
      return NextResponse.json(
        { error: 'Apadrinhamento não encontrado' },
        { status: 404 }
      )
    }

    // Excluir apadrinhamento
    const { error } = await supabase
      .from('apadrinhamentos')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao excluir apadrinhamento:', error)
      return NextResponse.json(
        { error: 'Erro ao excluir apadrinhamento' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Apadrinhamento excluído com sucesso' })

  } catch (error) {
    console.error('Erro na exclusão de apadrinhamento:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}