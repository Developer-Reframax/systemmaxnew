import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';

// Interfaces para tipagem
interface Participante {
  matricula: string;
}

interface ParticipanteParaInserir {
  execucao_id: string;
  matricula_participante: string;
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
// GET /api/inspecoes/execucoes - Listar execu��es
export async function GET(request: NextRequest) {
  try {
    // Verificar autentica��o
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Par�metros de consulta
    const { searchParams } = new URL(request.url);
    const formulario_id = searchParams.get('formulario_id');
    const status = searchParams.get('status');
    const executor = searchParams.get('executor');
    const local_id = searchParams.get('local_id');
    const data_inicio = searchParams.get('data_inicio');
    const data_fim = searchParams.get('data_fim');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Construir query com joins
    let query = supabase
      .from('execucoes_inspecao')
      .select(`
        *,
        formulario:formularios_inspecao(id, titulo, categoria:categorias_inspecao(nome)),
        local:locais(id, local),
        executor:usuarios!execucoes_inspecao_matricula_executor_fkey(matricula, nome),
        participantes:participantes_execucao(
          matricula_participante,
          participante:usuarios!participantes_execucao_matricula_participante_fkey(matricula, nome)
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Filtrar por contrato_raiz do usu�rio (RLS)
    if (authResult.user?.contrato_raiz) {
      // A query j� ser� filtrada pelo RLS baseado no contrato_raiz
    }

    // Aplicar filtros
    if (formulario_id) {
      query = query.eq('formulario_id', formulario_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (executor) {
      query = query.eq('matricula_executor', parseInt(executor));
    }

    if (local_id) {
      query = query.eq('local_id', parseInt(local_id));
    }

    if (data_inicio) {
      query = query.gte('data_inicio', data_inicio);
    }

    if (data_fim) {
      query = query.lte('data_inicio', data_fim);
    }

    // Aplicar pagina��o
    query = query.range(offset, offset + limit - 1);

    const { data: execucoes, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar execu��es:', error);
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: execucoes,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Erro na API de execu??es:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST /api/inspecoes/execucoes - Criar nova execu��o
export async function POST(request: NextRequest) {
  try {
    // Verificar autentica��o
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const body = await request.json();
    const { formulario_id, local_id, participantes = [], respostas = [], status, equipamento_tag } = body;
    const contratoUsuario = authResult.user?.contrato_raiz;

    // Logs iniciais para diagn�stico
    console.log('POST /api/inspecoes/execucoes - body recebido:', body);
    console.log('POST /api/inspecoes/execucoes - campos extra??dos:', {
      formulario_id,
      local_id,
      status,
      participantesCount: Array.isArray(participantes) ? participantes.length : 0,
      respostasCount: Array.isArray(respostas) ? respostas.length : 0,
      data_inicio: body?.data_inicio
    });

    // Validar campos obrigat�rios
    if (!formulario_id || !local_id) {
      console.error('Validação falhou: campos obrigatórios ausentes', { formulario_id, local_id });
      return NextResponse.json({ 
        error: 'Campos obrigat?rios: formulario_id, local_id' 
      }, { status: 400 });
    }

    // Validar se o formul�rio existe e est� ativo
    const { data: formulario } = await supabase
      .from('formularios_inspecao')
      .select('id, ativo, check_list')
      .eq('id', formulario_id)
      .single();

    if (!formulario) {
      console.error('Valida??o falhou: formul?rio n?o encontrado', { formulario_id });
      return NextResponse.json({ 
        error: 'Formul?rio n?o encontrado' 
      }, { status: 400 });
    }

    if (!formulario.ativo) {
      console.error('Valida��o falhou: formul�rio inativo', { formulario_id });
      return NextResponse.json({ 
        error: 'Formul�rio n�o est� ativo' 
      }, { status: 400 });
    }

    const statusExecucao = status || 'em_andamento';

    if (formulario.check_list && statusExecucao === 'concluida' && !equipamento_tag) {
      return NextResponse.json({ error: 'Tag do equipamento � obrigat?ria para concluir checklists' }, { status: 400 });
    }

    // Validar se o local existe
    const { data: local } = await supabase
      .from('locais')
      .select('id')
      .eq('id', local_id)
      .single();

    if (!local) {
      console.error('Validação falhou: local não encontrado', { local_id });
      return NextResponse.json({ 
        error: 'Local não encontrado' 
      }, { status: 400 });
    }

    // Validar participantes se fornecidos
    if (participantes && participantes.length > 0) {
      const matriculasParticipantes = participantes
        .map((p: Participante | string | number) => {
          if (typeof p === 'string' || typeof p === 'number') return String(p);
          return p.matricula;
        })
        .filter((matricula: string) => matricula && matricula.trim() !== ''); // Filtrar matr�culas vazias

      if (matriculasParticipantes.length > 0) {
        console.log('Validando participantes:', matriculasParticipantes);
        
        // Usar service role para consultar usu�rios sem restri��es de RLS
        const { data: usuariosValidos, error: usuariosError } = await supabase
          .from('usuarios')
          .select('matricula')
          .in('matricula', matriculasParticipantes);

        console.log('Usu�rios encontrados:', usuariosValidos);
        console.log('Erro na consulta:', usuariosError);

        if (usuariosError) {
          console.error('Erro ao consultar usu�rios:', usuariosError);
          return NextResponse.json({ 
            error: 'Erro ao validar participantes' 
          }, { status: 500 });
        }

        if (!usuariosValidos || usuariosValidos.length !== matriculasParticipantes.length) {
          const matriculasEncontradas = usuariosValidos?.map(u => u.matricula) || [];
          const matriculasNaoEncontradas = matriculasParticipantes.filter(
            (matricula: string) => !matriculasEncontradas.includes(matricula)
          );
          
          console.error('Participantes n�o encontrados:', matriculasNaoEncontradas);
          
          return NextResponse.json({ 
            error: `Participantes n�o encontrados: ${matriculasNaoEncontradas.join(', ')}` 
          }, { status: 400 });
        }
      }
    }

    // Criar execu��o
    const dataConclusao = statusExecucao === 'concluida' ? new Date().toISOString() : null;

    // Obter contrato_raiz do usu�rio se n�o vier no token
    let contratoExecucao = contratoUsuario;
    if (!contratoExecucao && authResult.user?.matricula) {
      const { data: usuarioContrato } = await supabase
        .from('usuarios')
        .select('contrato_raiz')
        .eq('matricula', authResult.user.matricula)
        .single();
      contratoExecucao = usuarioContrato?.contrato_raiz || null;
    }

    const { data: novaExecucao, error: insertError } = await supabase
      .from('execucoes_inspecao')
      .insert({
        formulario_id,
        local_id: parseInt(local_id),
        matricula_executor: authResult.user?.matricula,
        contrato: contratoExecucao,
        tag_equipamento: formulario.check_list ? equipamento_tag : null,
        status: statusExecucao,
        data_inicio: body.data_inicio || new Date().toISOString(), // Novo campo
        data_conclusao: dataConclusao
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir execu��o:', insertError);
      return NextResponse.json({ error: 'Erro ao criar execu��o' }, { status: 500 });
    }

    // Inserir participantes se fornecidos
    if (participantes && participantes.length > 0) {
      const matriculasParticipantes = participantes
        .map((p: Participante | string | number) => {
          if (typeof p === 'string' || typeof p === 'number') return String(p);
          return p.matricula;
        })
        .filter((matricula: string) => matricula && matricula.trim() !== ''); // Filtrar matr�culas vazias

      if (matriculasParticipantes.length > 0) {
        const participantesParaInserir: ParticipanteParaInserir[] = matriculasParticipantes.map((matricula: string) => ({
          execucao_id: novaExecucao.id,
          matricula_participante: matricula
        }));

        console.log('Inserindo participantes:', participantesParaInserir);

        const { error: participantesError } = await supabase
          .from('participantes_execucao')
          .insert(participantesParaInserir);

        if (participantesError) {
          console.error('Erro ao inserir participantes:', participantesError);
          // Reverter cria��o da execu��o
          await supabase
            .from('execucoes_inspecao')
            .delete()
            .eq('id', novaExecucao.id);
          
          return NextResponse.json({ error: 'Erro ao adicionar participantes' }, { status: 500 });
         }
       }
    }

    // Inserir respostas se fornecidas
    if (respostas && Array.isArray(respostas) && respostas.length > 0) {
      for (const r of respostas) {
        const { pergunta_id, resposta: valorResposta, observacoes } = r;

        if (!pergunta_id || !valorResposta) {
          continue; // Pular respostas inv�lidas
        }

        if (!['conforme', 'nao_conforme', 'nao_aplica'].includes(valorResposta)) {
          console.error('Valida??o falhou: valor de resposta inv?lido', { pergunta_id, valorResposta });
          return NextResponse.json({
            error: `Valor de resposta inv�lido: ${valorResposta}`
          }, { status: 400 });
        }

        const { error: respostaError } = await supabase
          .from('respostas_execucao')
          .upsert({
            execucao_id: novaExecucao.id,
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

        if (statusExecucao === 'concluida' && formulario?.check_list && equipamento_tag) {
      await marcarEquipamentoImpedidoSeNecessario(formulario.id, respostas, equipamento_tag);
    }

// Se conclu�da, calcular nota final
    if (statusExecucao === 'concluida') {
      await supabase.rpc('calcular_nota_execucao', { execucao_uuid: novaExecucao.id });
    }

    // Buscar execu��o completa
    const { data: execucaoCompleta } = await supabase
      .from('execucoes_inspecao')
      .select(`
        *,
        formulario:formularios_inspecao(id, titulo, categoria:categorias_inspecao(nome)),
        local:locais(id, local),
        executor:usuarios!execucoes_inspecao_matricula_executor_fkey(matricula, nome),
        participantes:participantes_execucao(
          matricula_participante,
          participante:usuarios!participantes_execucao_matricula_participante_fkey(matricula, nome)
        )
      `)
      .eq('id', novaExecucao.id)
      .single();

    return NextResponse.json({
      success: true,
      data: execucaoCompleta,
      message: statusExecucao === 'concluida' ? 'Execu??o criada e conclu??da com sucesso' : 'Execu??o criada com sucesso'
    }, { status: 201 });

  } catch (error) {
    console.error('Erro na API de cria??o de execu??o:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT /api/inspecoes/execucoes - Atualizar execu��o (para salvar respostas)
export async function PUT(request: NextRequest) {
  try {
    // Verificar autentica��o
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const body = await request.json();
    const { execucao_id, local_id, participantes = [], respostas, status, concluir = false, equipamento_tag } = body;

    // Validar campos obrigat�rios
    if (!execucao_id) {
      return NextResponse.json({ 
        error: 'Campo obrigat�rio: execucao_id' 
      }, { status: 400 });
    }

    // Verificar se a execu��o existe e se o usu�rio pode edit�-la
    const { data: execucao } = await supabase
      .from('execucoes_inspecao')
      .select('id, matricula_executor, status, local_id, formulario_id, tag_equipamento')
      .eq('id', execucao_id)
      .single();

    if (!execucao) {
      return NextResponse.json({ error: 'Execu??o n?o encontrada' }, { status: 404 });
    }

    // Verificar se o usu�rio � o executor ou tem permiss�o de admin
    if (execucao.matricula_executor !== authResult.user?.matricula && 
        authResult.user?.role !== 'Admin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas o executor ou administradores podem editar esta execu??o.' }, { status: 403 });
    }

    // N�o permitir edi��o de execu��es conclu�das ou canceladas
    if (execucao.status !== 'em_andamento') {
      return NextResponse.json({ error: 'N?o ? poss??vel editar execu??es que n?o est??o em andamento' }, { status: 409 });
    }

        let formularioCheckList = false;   if (execucao.formulario_id) {
      const { data: formCheck } = await supabase
        .from('formularios_inspecao')
        .select('check_list')
        .eq('id', execucao.formulario_id)
        .single();
      formularioCheckList = !!formCheck?.check_list;     if (formularioCheckList && (concluir || status === 'concluida') && !equipamento_tag) {
        return NextResponse.json({ error: 'Tag do equipamento ? obrigat?ria para checklists' }, { status: 400 });
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
        return NextResponse.json({ error: 'Local n?o encontrado' }, { status: 400 });
      }

      const { error: erroAtualizarLocal } = await supabase
        .from('execucoes_inspecao')
        .update({ local_id })
        .eq('id', execucao_id);

      if (erroAtualizarLocal) {
        console.error('Erro ao atualizar local da execu��o:', erroAtualizarLocal);
        return NextResponse.json({ error: 'Erro ao atualizar local' }, { status: 500 });
      }
    }

    // Atualizar data_inicio se fornecida
    if (body.data_inicio !== undefined) {
      const { error: erroAtualizarDataInicio } = await supabase
        .from('execucoes_inspecao')
        .update({ data_inicio: body.data_inicio })
        .eq('id', execucao_id);

      if (erroAtualizarDataInicio) {
        console.error('Erro ao atualizar data de in??cio:', erroAtualizarDataInicio);
        return NextResponse.json({ error: 'Erro ao atualizar data de in??cio' }, { status: 500 });
      }
    }

    // Atualizar participantes se fornecidos
    if (participantes !== undefined) {
      // Normalizar matr�culas
      const matriculasParticipantes = Array.isArray(participantes)
        ? participantes.map((p: Participante | string) => (typeof p === 'string' ? p : p.matricula)).filter((m: string) => m && m.trim() !== '')
        : [];

      // Validar participantes (se houver)
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
          return NextResponse.json({ error: `Participantes n?o encontrados: ${naoEncontrados.join(', ')}` }, { status: 400 });
        }
      }

      // Remover participantes atuais e inserir novos (se houver)
      const { error: erroRemoverParticipantes } = await supabase
        .from('participantes_execucao')
        .delete()
        .eq('execucao_id', execucao_id);

      if (erroRemoverParticipantes) {
        console.error('Erro ao remover participantes:', erroRemoverParticipantes);
        return NextResponse.json({ error: 'Erro ao atualizar participantes' }, { status: 500 });
      }

      if (matriculasParticipantes.length > 0) {
        const participantesParaInserir: ParticipanteParaInserir[] = matriculasParticipantes.map((matricula: string) => ({
          execucao_id,
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
          continue; // Pular respostas inv�lidas
        }

        // Validar valor da resposta
        if (!['conforme', 'nao_conforme', 'nao_aplica'].includes(valorResposta)) {
          return NextResponse.json({ 
            error: `Valor de resposta inv?lido: ${valorResposta}` 
          }, { status: 400 });
        }

        // Inserir ou atualizar resposta
        const { error: respostaError } = await supabase
          .from('respostas_execucao')
          .upsert({
            execucao_id,
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

    // Atualizar status da execu��o se necess�rio
    let novoStatus = status || execucao.status;
    let dataConclusao = null;

    if (concluir || status === 'concluida') {
      novoStatus = 'concluida';
      dataConclusao = new Date().toISOString();
    }

    const { data: execucaoAtualizada, error: updateError } = await supabase
      .from('execucoes_inspecao')
      .update({
        status: novoStatus,
        data_conclusao: dataConclusao,
        tag_equipamento: formularioCheckList ? (equipamento_tag ?? null) : null
      })
      .eq('id', execucao_id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar execu??o:', updateError);
      return NextResponse.json({ error: 'Erro ao atualizar execu??o' }, { status: 500 });
    }

        if ((concluir || novoStatus === 'concluida') && formularioCheckList && (equipamento_tag ?? execucao.tag_equipamento)) {
      await marcarEquipamentoImpedidoSeNecessario(execucao.formulario_id, respostas, (equipamento_tag ?? execucao.tag_equipamento));
    }

// Se conclu�da, calcular nota final
    if (novoStatus === 'concluida') {
      await supabase.rpc('calcular_nota_execucao', { execucao_uuid: execucao_id });
    }

    return NextResponse.json({
      success: true,
      data: execucaoAtualizada,
      message: concluir ? 'Execu??o conclu??da com sucesso' : 'Execu??o salva com sucesso'
    });

  } catch (error) {
    console.error('Erro na API de atualiza??o de execu??o:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}


















