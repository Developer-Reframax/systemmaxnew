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

// Se existir pergunta impeditiva nao conforme em checklist, marcar equipamento como impedido
async function marcarEquipamentoImpedidoSeNecessario(
  formularioId: string | null | undefined,
  respostas: Array<{ pergunta_id: string; resposta: string }> | undefined,
  equipamentoTag: string | null | undefined
) {
  try {
    if (!formularioId || !equipamentoTag || !respostas || respostas.length === 0) return;

    const perguntasNaoConforme = respostas
      .filter((r) => r.resposta === 'nao_conforme' && r.pergunta_id)
      .map((r) => r.pergunta_id);

    if (perguntasNaoConforme.length === 0) return;

    const { data: perguntasImpeditivas, error } = await supabase
      .from('perguntas_formulario')
      .select('id')
      .eq('formulario_id', formularioId)
      .eq('impeditivo', true)
      .in('id', perguntasNaoConforme);

    if (error) {
      console.warn('Falha ao verificar perguntas impeditivas para impedir equipamento:', error);
      return;
    }

    if (perguntasImpeditivas && perguntasImpeditivas.length > 0) {
      await supabase
        .from('equipamentos_inspecao')
        .update({ impedido: true })
        .eq('tag', equipamentoTag);
    }
  } catch (err) {
    console.warn('Nao foi possivel atualizar impedimento do equipamento:', err);
  }
}

// GET /api/inspecoes/execucoes/[id] - Buscar execucao especifica
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticacao
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id } = await context.params;

    // Buscar execucao com todos os dados relacionados
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
      console.error('Erro ao buscar execucao:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Execucao nao encontrada' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }

    if (!execucao) {
      return NextResponse.json({ error: 'Execucao nao encontrada' }, { status: 404 });
    }

    // Verificar se o usuario tem acesso a execucao
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

    // Adicionar respostas as perguntas do formulario
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
    console.error('Erro na API de busca de execucao:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT /api/inspecoes/execucoes/[id] - Atualizar execucao especifica
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticacao
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { local_id, participantes = [], status, observacoes_gerais, respostas, concluir = false, equipamento_tag } = body;

    // Verificar se a execucao existe
    const { data: execucaoExistente } = await supabase
      .from('execucoes_inspecao')
      .select('id, matricula_executor, status, local_id, formulario_id, tag_equipamento')
      .eq('id', id)
      .single();

    if (!execucaoExistente) {
      return NextResponse.json({ error: 'Execucao nao encontrada' }, { status: 404 });
    }

    // Verificar permissoes
    const podeEditar =
      execucaoExistente.matricula_executor === authResult.user?.matricula ||
      authResult.user?.role === 'Admin';

    if (!podeEditar) {
      return NextResponse.json({ error: 'Acesso negado. Apenas o executor ou administradores podem editar esta execucao.' }, { status: 403 });
    }

    // Nao permitir edicao de execucoes concluidas ou canceladas (exceto admin)
    if (execucaoExistente.status !== 'em_andamento' && authResult.user?.role !== 'Admin') {
      return NextResponse.json({ error: 'Nao e possivel editar execucoes que nao estao em andamento' }, { status: 409 });
    }

    // Validar checklist quanto a tag de equipamento
    let formularioCheckList = false;
    if (execucaoExistente.formulario_id) {
      const { data: formCheck } = await supabase
        .from('formularios_inspecao')
        .select('check_list')
        .eq('id', execucaoExistente.formulario_id)
        .single();

      formularioCheckList = !!formCheck?.check_list;

      if (formularioCheckList && (concluir || status === 'concluida')) {
        const tag = equipamento_tag ?? execucaoExistente.tag_equipamento;
        if (!tag) {
          return NextResponse.json({ error: 'Tag do equipamento e obrigatoria para concluir checklists' }, { status: 400 });
        }
      }
    }

    // Atualizar local se fornecido
    if (local_id !== undefined && local_id !== null) {
      const { data: localValido } = await supabase
        .from('locais')
        .select('id')
        .eq('id', local_id)
        .single();

      if (!localValido) {
        return NextResponse.json({ error: 'Local nao encontrado' }, { status: 400 });
      }

      const { error: erroAtualizarLocal } = await supabase
        .from('execucoes_inspecao')
        .update({ local_id })
        .eq('id', id);

      if (erroAtualizarLocal) {
        console.error('Erro ao atualizar local da execucao:', erroAtualizarLocal);
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
        console.error('Erro ao atualizar data de inicio:', erroAtualizarDataInicio);
        return NextResponse.json({ error: 'Erro ao atualizar data de inicio' }, { status: 500 });
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
          return NextResponse.json({ error: `Participantes nao encontrados: ${naoEncontrados.join(', ')}` }, { status: 400 });
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
          continue; // Pular respostas invalidas
        }

        // Validar valor da resposta
        if (!['conforme', 'nao_conforme', 'nao_aplica'].includes(valorResposta)) {
          return NextResponse.json({ 
            error: `Valor de resposta invalido: ${valorResposta}` 
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

    // Preparar dados para atualizacao
    const dadosAtualizacao: DadosAtualizacao & { tag_equipamento?: string | null } = {};

    if (status) {
      dadosAtualizacao.status = status;
    }

    if (observacoes_gerais !== undefined) {
      dadosAtualizacao.observacoes_gerais = observacoes_gerais;
    }

    if (equipamento_tag !== undefined) {
      dadosAtualizacao.tag_equipamento = equipamento_tag || null;
    }

    if ((concluir || status === 'concluida') && formularioCheckList) {
      const tagEquip = equipamento_tag ?? execucaoExistente.tag_equipamento;
      if (tagEquip) {
        await marcarEquipamentoImpedidoSeNecessario(execucaoExistente.formulario_id, respostas, tagEquip);
      }
    }

    // Se concluindo a execucao
    if (concluir || status === 'concluida') {
      dadosAtualizacao.status = 'concluida';
      dadosAtualizacao.data_conclusao = new Date().toISOString();
    }

    // Atualizar execucao se ha dados para atualizar
    if (Object.keys(dadosAtualizacao).length > 0) {
      const { error: updateError } = await supabase
        .from('execucoes_inspecao')
        .update(dadosAtualizacao)
        .eq('id', id);

      if (updateError) {
        console.error('Erro ao atualizar execucao:', updateError);
        return NextResponse.json({ error: 'Erro ao atualizar execucao' }, { status: 500 });
      }
    }

    // Se concluida, calcular nota final
    if (dadosAtualizacao.status === 'concluida') {
      await supabase.rpc('calcular_nota_execucao', { execucao_uuid: id });
    }

    // Buscar execucao atualizada
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
      message: concluir ? 'Execucao concluida com sucesso' : 'Execucao atualizada com sucesso'
    });

  } catch (error) {
    console.error('Erro na API de atualizacao de execucao:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE /api/inspecoes/execucoes/[id] - Cancelar execucao (apenas Admin)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticacao
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Apenas administradores podem cancelar execucoes
    if (authResult.user?.role !== 'Admin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem cancelar execucoes.' }, { status: 403 });
    }

    const { id } = await context.params;

    // Verificar se a execucao existe
    const { data: execucao } = await supabase
      .from('execucoes_inspecao')
      .select('id, status')
      .eq('id', id)
      .single();

    if (!execucao) {
      return NextResponse.json({ error: 'Execucao nao encontrada' }, { status: 404 });
    }

    // Nao permitir cancelamento de execucoes ja concluidas
    if (execucao.status === 'concluida') {
      return NextResponse.json({ error: 'Nao e possivel cancelar execucoes concluidas' }, { status: 409 });
    }

    // Cancelar execucao (marcar como cancelada ao inves de deletar)
    const { error: updateError } = await supabase
      .from('execucoes_inspecao')
      .update({
        status: 'cancelada',
        data_conclusao: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('Erro ao cancelar execucao:', updateError);
      return NextResponse.json({ error: 'Erro ao cancelar execucao' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Execucao cancelada com sucesso'
    });

  } catch (error) {
    console.error('Erro na API de cancelamento de execucao:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
