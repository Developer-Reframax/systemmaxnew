import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Obter detalhes de um desvio específico
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

    // Buscar o desvio com todas as relações
    const { data: desvio, error } = await supabase
      .from('desvios')
      .select(`
        *,
        natureza:natureza_id(id, natureza),
      tipo:tipo_id(id, tipo),
        risco_associado:riscoassociado_id(id, risco_associado),
        equipe:equipe_id(id, equipe)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Erro ao buscar desvio:', error)
      return NextResponse.json(
        { success: false, message: 'Desvio não encontrado' },
        { status: 404 }
      )
    }

    if (!desvio) {
      return NextResponse.json(
        { success: false, message: 'Desvio não encontrado' },
        { status: 404 }
      )
    }

    // Buscar informações do usuário criador
    const { data: criador } = await supabase
      .from('usuarios')
      .select('matricula, nome, email')
      .eq('matricula', desvio.matricula_user)
      .single()

    // Buscar informações do responsável se já foi definido
    let responsavelInfo = null
    if (desvio.responsavel) {
      const { data: resp } = await supabase
        .from('usuarios')
        .select('matricula, nome, email')
        .eq('matricula', desvio.responsavel)
        .single()
      responsavelInfo = resp
    }

    // Buscar imagens do desvio
    const { data: imagens } = await supabase
      .from('imagens_desvios')
      .select('id, categoria, nome_arquivo, url_storage, tamanho, tipo_mime, created_at')
      .eq('desvio_id', id)
      .order('created_at', { ascending: true })

    return NextResponse.json({
      success: true,
      data: {
        ...desvio,
        criador,
        responsavel_info: responsavelInfo,
        imagens: imagens || []
      }
    })

  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Resolver um desvio
export async function PUT(
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
    const body = await request.json()
    const { status, observacoes_resolucao, data_conclusao } = body

    // Validar dados obrigatórios
    if (!status || !observacoes_resolucao) {
      return NextResponse.json(
        { success: false, message: 'Status e observações de resolução são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar data de conclusão se fornecida
    let dataConclusaoFinal = new Date().toISOString() // Fallback para data atual
    if (data_conclusao) {
      const dataFornecida = new Date(data_conclusao)
      if (isNaN(dataFornecida.getTime())) {
        return NextResponse.json(
          { success: false, message: 'Data de conclusão inválida' },
          { status: 400 }
        )
      }
      dataConclusaoFinal = dataFornecida.toISOString()
    }

    // Verificar se o desvio existe e se o usuário é o responsável
    const { data: desvio, error: desvioError } = await supabase
      .from('desvios')
      .select('id, responsavel, status')
      .eq('id', id)
      .single()

    if (desvioError || !desvio) {
      return NextResponse.json(
        { success: false, message: 'Desvio não encontrado' },
        { status: 404 }
      )
    }

    // Debug logs
    console.log('DEBUG - Matrícula do usuário logado:', authResult.user?.matricula, 'tipo:', typeof authResult.user?.matricula);
    console.log('DEBUG - Responsável do desvio:', desvio.responsavel, 'tipo:', typeof desvio.responsavel);
    
    // Converter matrícula para string para comparação (responsavel é varchar, matricula é integer)
    const matriculaString = authResult.user?.matricula.toString();
    console.log('DEBUG - Matrícula convertida:', matriculaString);
    console.log('DEBUG - Comparação:', desvio.responsavel !== matriculaString);

    // Verificar se o usuário é o responsável pelo desvio
    if (desvio.responsavel !== matriculaString) {
      return NextResponse.json(
        { success: false, message: 'Você não tem permissão para resolver este desvio' },
        { status: 403 }
      );
    }

    // Atualizar o desvio
    const { data, error } = await supabase
      .from('desvios')
      .update({
        status,
        observacao: observacoes_resolucao,
        data_conclusao: dataConclusaoFinal
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar desvio:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao resolver desvio' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Desvio resolvido com sucesso',
      data
    })

  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}