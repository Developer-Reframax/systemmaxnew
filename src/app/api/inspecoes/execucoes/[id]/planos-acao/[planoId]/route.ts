import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';
import { UpdatePlanoAcaoData, PlanoAcao, PlanoAcaoWithRelations, EvidenciaPlanoAcao } from '@/types/plano-acao';

type UsuarioResumo = { matricula: number; nome: string; email: string };
type PlanoRow = PlanoAcao & { responsavel?: number; evidencias?: EvidenciaPlanoAcao[] };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/inspecoes/execucoes/[id]/planos-acao/[planoId] - Buscar plano de ação específico
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; planoId: string }> }
) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id, planoId } = await context.params;

    // Buscar plano de ação com dados relacionados
    const { data: plano, error } = await supabase
      .from('planos_acao')
      .select(`
        *,
        evidencias:evidencias_plano_acao(*)
      `)
      .eq('id', planoId)
      .eq('execucao_inspecao_id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar plano de ação:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Plano de ação não encontrado' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }

    if (!plano) {
      return NextResponse.json({ error: 'Plano de ação não encontrado' }, { status: 404 });
    }

    // Anexar responsavel_info manualmente
    let responsavel_info: UsuarioResumo | null = null;
    const planoRow = plano as PlanoRow;
    const responsavelMatricula = planoRow?.responsavel_matricula ?? planoRow?.responsavel;
    if (responsavelMatricula) {
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('matricula, nome, email')
        .eq('matricula', responsavelMatricula)
        .single();
      if (usuario) {
        responsavel_info = {
          matricula: usuario.matricula,
          nome: usuario.nome,
          email: usuario.email
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: { ...(planoRow as PlanoAcao), evidencias: planoRow.evidencias, responsavel_info } as PlanoAcaoWithRelations
    });

  } catch (error) {
    console.error('Erro na API de busca de plano de ação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT /api/inspecoes/execucoes/[id]/planos-acao/[planoId] - Atualizar plano de ação
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; planoId: string }> }
) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id, planoId } = await context.params;
    const body: UpdatePlanoAcaoData = await request.json();

    // Buscar plano de ação existente
    const { data: planoExistente } = await supabase
      .from('planos_acao')
      .select('id, execucao_inspecao_id')
      .eq('id', planoId)
      .eq('execucao_inspecao_id', id)
      .single();

    if (!planoExistente) {
      return NextResponse.json({ error: 'Plano de ação não encontrado' }, { status: 404 });
    }

    // Buscar execução para verificar acesso
    const { data: execucao } = await supabase
      .from('execucoes_inspecao')
      .select('id, matricula_executor, status')
      .eq('id', id)
      .single();

    if (!execucao) {
      return NextResponse.json({ error: 'Execução não encontrada' }, { status: 404 });
    }

    // Verificar permissões
    const podeEditar = 
      execucao.matricula_executor === authResult.user?.matricula ||
      authResult.user?.role === 'Admin';

    if (!podeEditar) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Não permitir editar planos em execuções concluídas ou canceladas (exceto admin)
    if (execucao.status !== 'em_andamento' && authResult.user?.role !== 'Admin') {
      return NextResponse.json({ error: 'Não é possível editar planos em execuções que não estão em andamento' }, { status: 409 });
    }

    // Validar dados se fornecidos
    const erros: { [key: string]: string } = {};
    if (body.desvio !== undefined && !body.desvio?.trim()) {
      erros.desvio = 'Desvio não pode ser vazio';
    }
    if (body.o_que_fazer !== undefined && !body.o_que_fazer?.trim()) {
      erros.o_que_fazer = 'O que fazer não pode ser vazio';
    }
    if (body.como_fazer !== undefined && !body.como_fazer?.trim()) {
      erros.como_fazer = 'Como fazer não pode ser vazio';
    }
    if (body.responsavel_matricula !== undefined && !body.responsavel_matricula) {
      erros.responsavel_matricula = 'Responsável é obrigatório';
    }
    if (body.status !== undefined && !['pendente', 'em_andamento', 'concluido', 'cancelado'].includes(body.status)) {
      erros.status = 'Status inválido';
    }

    if (Object.keys(erros).length > 0) {
      return NextResponse.json({ error: 'Dados inválidos', erros }, { status: 400 });
    }

    // Verificar se o novo responsável existe
    if (body.responsavel_matricula) {
      const { data: responsavel } = await supabase
        .from('usuarios')
        .select('matricula')
        .eq('matricula', body.responsavel_matricula)
        .single();

      if (!responsavel) {
        return NextResponse.json({ error: 'Responsável não encontrado' }, { status: 400 });
      }
    }

    // Preparar dados para atualização
    const dadosAtualizacao: UpdatePlanoAcaoData = {};
    if (body.desvio !== undefined) dadosAtualizacao.desvio = body.desvio.trim();
    if (body.o_que_fazer !== undefined) dadosAtualizacao.o_que_fazer = body.o_que_fazer.trim();
    if (body.como_fazer !== undefined) dadosAtualizacao.como_fazer = body.como_fazer.trim();
    if (body.responsavel_matricula !== undefined) dadosAtualizacao.responsavel_matricula = body.responsavel_matricula;
    if (body.prazo !== undefined) dadosAtualizacao.prazo = body.prazo;
    if (body.status !== undefined) dadosAtualizacao.status = body.status;

    // Se marcar como concluído, definir data de conclusão
    if (body.status === 'concluido' && !body.data_conclusao) {
      dadosAtualizacao.data_conclusao = new Date().toISOString();
    }

    // Atualizar plano de ação
    const { data: planoAtualizado, error } = await supabase
      .from('planos_acao')
      .update(dadosAtualizacao)
      .eq('id', planoId)
      .eq('execucao_inspecao_id', id)
      .select(`
        *,
        evidencias:evidencias_plano_acao(*)
      `)
      .single();

    if (error) {
      console.error('Erro ao atualizar plano de ação:', error);
      return NextResponse.json({ error: 'Erro ao atualizar plano de ação' }, { status: 500 });
    }

    // Anexar responsavel_info manualmente
    let responsavel_info_atualizado: UsuarioResumo | null = null;
    const planoAtualizadoRow = planoAtualizado as PlanoRow;
    const responsavelMatriculaAtual = planoAtualizadoRow?.responsavel_matricula ?? planoAtualizadoRow?.responsavel;
    if (responsavelMatriculaAtual) {
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('matricula, nome, email')
        .eq('matricula', responsavelMatriculaAtual)
        .single();
      if (usuario) {
        responsavel_info_atualizado = {
          matricula: usuario.matricula,
          nome: usuario.nome,
          email: usuario.email
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: { ...(planoAtualizadoRow as PlanoAcao), evidencias: planoAtualizadoRow.evidencias, responsavel_info: responsavel_info_atualizado } as PlanoAcaoWithRelations
    });

  } catch (error) {
    console.error('Erro na API de atualização de plano de ação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE /api/inspecoes/execucoes/[id]/planos-acao/[planoId] - Deletar plano de ação
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; planoId: string }> }
) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id, planoId } = await context.params;

    // Buscar plano de ação existente
    const { data: planoExistente } = await supabase
      .from('planos_acao')
      .select('id, execucao_id')
      .eq('id', planoId)
      .eq('execucao_inspecao_id', id)
      .single();

    if (!planoExistente) {
      return NextResponse.json({ error: 'Plano de ação não encontrado' }, { status: 404 });
    }

    // Buscar execução para verificar acesso
    const { data: execucao } = await supabase
      .from('execucoes_inspecao')
      .select('id, matricula_executor, status')
      .eq('id', id)
      .single();

    if (!execucao) {
      return NextResponse.json({ error: 'Execução não encontrada' }, { status: 404 });
    }

    // Verificar permissões
    const podeDeletar = 
      execucao.matricula_executor === authResult.user?.matricula ||
      authResult.user?.role === 'Admin';

    if (!podeDeletar) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Não permitir deletar planos em execuções concluídas ou canceladas (exceto admin)
    if (execucao.status !== 'em_andamento' && authResult.user?.role !== 'Admin') {
      return NextResponse.json({ error: 'Não é possível deletar planos em execuções que não estão em andamento' }, { status: 409 });
    }

    // Deletar plano de ação (as evidências serão deletadas em cascata)
    const { error } = await supabase
      .from('planos_acao')
      .delete()
      .eq('id', planoId)
      .eq('execucao_inspecao_id', id);

    if (error) {
      console.error('Erro ao deletar plano de ação:', error);
      return NextResponse.json({ error: 'Erro ao deletar plano de ação' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Plano de ação deletado com sucesso'
    });

  } catch (error) {
    console.error('Erro na API de deleção de plano de ação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}