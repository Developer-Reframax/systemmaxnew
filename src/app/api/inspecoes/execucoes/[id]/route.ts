import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';

// Interfaces para tipagem
interface Resposta {
  pergunta_id: string;
  resposta: string;
  observacoes?: string;
}

interface Pergunta {
  id: string;
  pergunta: string;
  ordem: number;
  resposta_atual?: {
    resposta: string;
    observacoes?: string;
  } | null;
}

interface RespostasPorPergunta {
  [perguntaId: string]: {
    resposta: string;
    observacoes?: string;
  };
}

interface DadosAtualizacao {
  status?: string;
  observacoes_gerais?: string;
  data_finalizacao?: string;
  data_conclusao?: string;
}

interface Participante {
  matricula: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/inspecoes/execucoes/[id] - Buscar execução específica
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id } = await context.params;

    // Buscar execução com todos os dados relacionados
    const { data: execucao, error } = await supabase
      .from('execucoes_inspecao')
      .select(`
        *,
        formulario:formularios_inspecao(
          id, titulo, corporativo,
          categoria:categorias_inspecao(id, nome),
          perguntas:perguntas_formulario(
            id, pergunta, ordem,
            resposta:respostas_execucao!left(resposta, observacoes)
          )
        ),
        local:locais(id, local),
        executor:usuarios!execucoes_inspecao_matricula_executor_fkey(matricula, nome, email),
        participantes:participantes_execucao(
          matricula_participante,
          participante:usuarios!participantes_execucao_matricula_participante_fkey(matricula, nome, email)
        ),
        respostas:respostas_execucao(
          pergunta_id, resposta, observacoes,
          pergunta:perguntas_formulario(id, pergunta)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar execução:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Execução não encontrada' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }

    if (!execucao) {
      return NextResponse.json({ error: 'Execução não encontrada' }, { status: 404 });
    }

    // Verificar se o usuário tem acesso à execução
    // RLS já filtra por contrato_raiz, mas vamos verificar se é executor ou admin
    const podeVisualizar = 
      execucao.matricula_executor === authResult.user?.matricula ||
      authResult.user?.role === 'Admin' ||
      authResult.user?.role === 'Editor';

    if (!podeVisualizar) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Organizar respostas por pergunta para facilitar o frontend
    const respostasPorPergunta = execucao.respostas?.reduce((acc: RespostasPorPergunta, resposta: Resposta) => {
      acc[resposta.pergunta_id] = {
        resposta: resposta.resposta,
        observacoes: resposta.observacoes
      };
      return acc;
    }, {} as RespostasPorPergunta) || {};

    // Adicionar respostas às perguntas do formulário
    if (execucao.formulario?.perguntas) {
      execucao.formulario.perguntas = execucao.formulario.perguntas.map((pergunta: Pergunta) => ({
        ...pergunta,
        resposta_atual: respostasPorPergunta[pergunta.id] || null
      }));
    }

    return NextResponse.json({
      success: true,
      data: execucao
    });

  } catch (error) {
    console.error('Erro na API de busca de execução:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT /api/inspecoes/execucoes/[id] - Atualizar execução específica
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { local_id, participantes = [], status, observacoes_gerais, respostas, concluir = false } = body;

    // Verificar se a execução existe
    const { data: execucaoExistente } = await supabase
      .from('execucoes_inspecao')
      .select('id, matricula_executor, status, local_id')
      .eq('id', id)
      .single();

    if (!execucaoExistente) {
      return NextResponse.json({ error: 'Execução não encontrada' }, { status: 404 });
    }

    // Verificar permissões
    const podeEditar = 
      execucaoExistente.matricula_executor === authResult.user?.matricula ||
      authResult.user?.role === 'Admin';

    if (!podeEditar) {
      return NextResponse.json({ error: 'Acesso negado. Apenas o executor ou administradores podem editar esta execução.' }, { status: 403 });
    }

    // Não permitir edição de execuções concluídas ou canceladas (exceto admin)
    if (execucaoExistente.status !== 'em_andamento' && authResult.user?.role !== 'Admin') {
      return NextResponse.json({ error: 'Não é possível editar execuções que não estão em andamento' }, { status: 409 });
    }

    // Atualizar local se fornecido
    if (local_id !== undefined && local_id !== null) {
      const { data: localValido } = await supabase
        .from('locais')
        .select('id')
        .eq('id', local_id)
        .single();

      if (!localValido) {
        return NextResponse.json({ error: 'Local não encontrado' }, { status: 400 });
      }

      const { error: erroAtualizarLocal } = await supabase
        .from('execucoes_inspecao')
        .update({ local_id })
        .eq('id', id);

      if (erroAtualizarLocal) {
        console.error('Erro ao atualizar local da execução:', erroAtualizarLocal);
        return NextResponse.json({ error: 'Erro ao atualizar local' }, { status: 500 });
      }
    }

    // Atualizar data_inicio se fornecida
    if (body.data_inicio !== undefined && body.data_inicio !== null) {
      const { error: erroAtualizarDataInicio } = await supabase
        .from('execucoes_inspecao')
        .update({ data_inicio: body.data_inicio })
        .eq('id', id);

      if (erroAtualizarDataInicio) {
        console.error('Erro ao atualizar data de início:', erroAtualizarDataInicio);
        return NextResponse.json({ error: 'Erro ao atualizar data de início' }, { status: 500 });
      }
    }
    
    // Atualizar participantes se fornecidos
    if (participantes !== undefined) {
      const matriculasParticipantes = Array.isArray(participantes)
        ? participantes
            .map((p: Participante | string | number) => {
              if (typeof p === 'string' || typeof p === 'number') return String(p);
              return p?.matricula;
            })
            .filter((m: string | undefined) => typeof m === 'string' && m.trim() !== '')
        : [];

      if (matriculasParticipantes.length > 0) {
        const { data: usuariosValidos, error: usuariosError } = await supabase
          .from('usuarios')
          .select('matricula')
          .in('matricula', matriculasParticipantes);

        if (usuariosError) {
          console.error('Erro ao validar participantes:', usuariosError);
          return NextResponse.json({ error: 'Erro ao validar participantes' }, { status: 500 });
        }

        if (!usuariosValidos || usuariosValidos.length !== matriculasParticipantes.length) {
          const encontrados = usuariosValidos?.map(u => u.matricula) || [];
          const naoEncontrados = matriculasParticipantes.filter((m: string) => !encontrados.includes(m));
          return NextResponse.json({ error: `Participantes não encontrados: ${naoEncontrados.join(', ')}` }, { status: 400 });
        }
      }

      const { error: erroRemoverParticipantes } = await supabase
        .from('participantes_execucao')
        .delete()
        .eq('execucao_id', id);

      if (erroRemoverParticipantes) {
        console.error('Erro ao remover participantes:', erroRemoverParticipantes);
        return NextResponse.json({ error: 'Erro ao atualizar participantes' }, { status: 500 });
      }

      if (matriculasParticipantes.length > 0) {
        const participantesParaInserir = matriculasParticipantes.map((matricula: string) => ({
          execucao_id: id,
          matricula_participante: matricula
        }));

        const { error: erroInserirParticipantes } = await supabase
          .from('participantes_execucao')
          .insert(participantesParaInserir);

        if (erroInserirParticipantes) {
          console.error('Erro ao inserir participantes:', erroInserirParticipantes);
          return NextResponse.json({ error: 'Erro ao atualizar participantes' }, { status: 500 });
        }
    }
    }

    // Salvar respostas se fornecidas
    if (respostas && Array.isArray(respostas)) {
      for (const resposta of respostas) {
        const { pergunta_id, resposta: valorResposta, observacoes } = resposta;

        if (!pergunta_id || !valorResposta) {
          continue; // Pular respostas inválidas
        }

        // Validar valor da resposta
        if (!['conforme', 'nao_conforme', 'nao_aplica'].includes(valorResposta)) {
          return NextResponse.json({ 
            error: `Valor de resposta inválido: ${valorResposta}` 
          }, { status: 400 });
        }

        // Inserir ou atualizar resposta
        const { error: respostaError } = await supabase
          .from('respostas_execucao')
          .upsert({
            execucao_id: id,
            pergunta_id,
            resposta: valorResposta,
            observacoes
          }, {
            onConflict: 'execucao_id,pergunta_id'
          });

        if (respostaError) {
          console.error('Erro ao salvar resposta:', respostaError);
          return NextResponse.json({ error: 'Erro ao salvar respostas' }, { status: 500 });
        }
      }
    }

    // Preparar dados para atualização
    const dadosAtualizacao: DadosAtualizacao = {};

    if (status) {
      dadosAtualizacao.status = status;
    }

    if (observacoes_gerais !== undefined) {
      dadosAtualizacao.observacoes_gerais = observacoes_gerais;
    }

    // Se concluindo a execução
    if (concluir || status === 'concluida') {
      dadosAtualizacao.status = 'concluida';
      dadosAtualizacao.data_conclusao = new Date().toISOString();
    }

    // Atualizar execução se há dados para atualizar
    if (Object.keys(dadosAtualizacao).length > 0) {
      const { error: updateError } = await supabase
        .from('execucoes_inspecao')
        .update(dadosAtualizacao)
        .eq('id', id);

      if (updateError) {
        console.error('Erro ao atualizar execução:', updateError);
        return NextResponse.json({ error: 'Erro ao atualizar execução' }, { status: 500 });
      }
    }

    // Se concluída, calcular nota final
    if (dadosAtualizacao.status === 'concluida') {
      await supabase.rpc('calcular_nota_execucao', { execucao_uuid: id });
    }

    // Buscar execução atualizada
    const { data: execucaoAtualizada } = await supabase
      .from('execucoes_inspecao')
      .select(`
        *,
        formulario:formularios_inspecao(
          id, titulo, descricao,
          categoria:categorias_inspecao(id, nome, cor)
        ),
        local:locais(id, local),
        executor:usuarios!execucoes_inspecao_matricula_executor_fkey(matricula, nome),
        participantes:participantes_execucao(
          matricula_participante,
          participante:usuarios!participantes_execucao_matricula_participante_fkey(matricula, nome)
        )
      `)
      .eq('id', id)
      .single();

    return NextResponse.json({
      success: true,
      data: execucaoAtualizada,
      message: concluir ? 'Execução concluída com sucesso' : 'Execução atualizada com sucesso'
    });

  } catch (error) {
    console.error('Erro na API de atualização de execução:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE /api/inspecoes/execucoes/[id] - Cancelar execução (apenas Admin)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Apenas administradores podem cancelar execuções
    if (authResult.user?.role !== 'Admin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem cancelar execuções.' }, { status: 403 });
    }

    const { id } = await context.params;

    // Verificar se a execução existe
    const { data: execucao } = await supabase
      .from('execucoes_inspecao')
      .select('id, status')
      .eq('id', id)
      .single();

    if (!execucao) {
      return NextResponse.json({ error: 'Execução não encontrada' }, { status: 404 });
    }

    // Não permitir cancelamento de execuções já concluídas
    if (execucao.status === 'concluida') {
      return NextResponse.json({ error: 'Não é possível cancelar execuções concluídas' }, { status: 409 });
    }

    // Cancelar execução (marcar como cancelada ao invés de deletar)
    const { error: updateError } = await supabase
      .from('execucoes_inspecao')
      .update({
        status: 'cancelada',
        data_conclusao: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('Erro ao cancelar execução:', updateError);
      return NextResponse.json({ error: 'Erro ao cancelar execução' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Execução cancelada com sucesso'
    });

  } catch (error) {
    console.error('Erro na API de cancelamento de execução:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}