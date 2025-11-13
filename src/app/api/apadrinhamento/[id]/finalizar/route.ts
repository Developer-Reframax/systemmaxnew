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

// PATCH /api/apadrinhamento/[id]/finalizar - Finalizar apadrinhamento
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { observacoes_finalizacao } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID do apadrinhamento é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o apadrinhamento existe e está ativo
    const { data: apadrinhamentoExistente } = await supabase
      .from('apadrinhamentos')
      .select('id, status, finalizado, observacoes')
      .eq('id', id)
      .single()

    if (!apadrinhamentoExistente) {
      return NextResponse.json(
        { error: 'Apadrinhamento não encontrado' },
        { status: 404 }
      )
    }

    if (apadrinhamentoExistente.finalizado) {
      return NextResponse.json(
        { error: 'Este apadrinhamento já foi finalizado' },
        { status: 400 }
      )
    }

    if (apadrinhamentoExistente.status === 'Concluído') {
      return NextResponse.json(
        { error: 'Este apadrinhamento já está concluído' },
        { status: 400 }
      )
    }

    // Preparar observações finais
    let observacoesFinal = apadrinhamentoExistente.observacoes || ''
    if (observacoes_finalizacao) {
      const dataFinalizacao = new Date().toLocaleDateString('pt-BR')
      const novaObservacao = `\n\n[Finalizado em ${dataFinalizacao}]: ${observacoes_finalizacao}`
      observacoesFinal += novaObservacao
    }

    // Finalizar apadrinhamento
    const { data, error } = await supabase
      .from('apadrinhamentos')
      .update({
        finalizado: true,
        status: 'Concluído',
        observacoes: observacoesFinal
      })
      .eq('id', id)
      .select(`
        *,
        novato:usuarios!apadrinhamentos_matricula_novato_fkey(matricula, nome, email, funcao),
        padrinho:usuarios!apadrinhamentos_matricula_padrinho_fkey(matricula, nome, email, funcao),
        supervisor_info:usuarios!apadrinhamentos_matricula_supervisor_fkey(matricula, nome, email, funcao)
      `)
      .single()

    if (error) {
      console.error('Erro ao finalizar apadrinhamento:', error)
      return NextResponse.json(
        { error: 'Erro ao finalizar apadrinhamento' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Apadrinhamento finalizado com sucesso',
      data
    })

  } catch (error) {
    console.error('Erro na finalização de apadrinhamento:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}