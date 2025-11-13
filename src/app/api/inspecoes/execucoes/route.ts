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

// GET /api/inspecoes/execucoes - Listar execuções
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Parâmetros de consulta
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

    // Filtrar por contrato_raiz do usuário (RLS)
    if (authResult.user?.contrato_raiz) {
      // A query já será filtrada pelo RLS baseado no contrato_raiz
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

    // Aplicar paginação
    query = query.range(offset, offset + limit - 1);

    const { data: execucoes, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar execuções:', error);
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
    console.error('Erro na API de execuções:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST /api/inspecoes/execucoes - Criar nova execução
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const body = await request.json();
    const { formulario_id, local_id, participantes = [], respostas = [], status } = body;

    // Logs iniciais para diagnóstico
    console.log('POST /api/inspecoes/execucoes - body recebido:', body);
    console.log('POST /api/inspecoes/execucoes - campos extraídos:', {
      formulario_id,
      local_id,
      status,
      participantesCount: Array.isArray(participantes) ? participantes.length : 0,
      respostasCount: Array.isArray(respostas) ? respostas.length : 0,
      data_inicio: body?.data_inicio
    });

    // Validar campos obrigatórios
    if (!formulario_id || !local_id) {
      console.error('Validação falhou: campos obrigatórios ausentes', { formulario_id, local_id });
      return NextResponse.json({ 
        error: 'Campos obrigatórios: formulario_id, local_id' 
      }, { status: 400 });
    }

    // Validar se o formulário existe e está ativo
    const { data: formulario } = await supabase
      .from('formularios_inspecao')
      .select('id, ativo')
      .eq('id', formulario_id)
      .single();

    if (!formulario) {
      console.error('Validação falhou: formulário não encontrado', { formulario_id });
      return NextResponse.json({ 
        error: 'Formulário não encontrado' 
      }, { status: 400 });
    }

    if (!formulario.ativo) {
      console.error('Validação falhou: formulário inativo', { formulario_id });
      return NextResponse.json({ 
        error: 'Formulário não está ativo' 
      }, { status: 400 });
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
        .filter((matricula: string) => matricula && matricula.trim() !== ''); // Filtrar matrículas vazias

      if (matriculasParticipantes.length > 0) {
        console.log('Validando participantes:', matriculasParticipantes);
        
        // Usar service role para consultar usuários sem restrições de RLS
        const { data: usuariosValidos, error: usuariosError } = await supabase
          .from('usuarios')
          .select('matricula')
          .in('matricula', matriculasParticipantes);

        console.log('Usuários encontrados:', usuariosValidos);
        console.log('Erro na consulta:', usuariosError);

        if (usuariosError) {
          console.error('Erro ao consultar usuários:', usuariosError);
          return NextResponse.json({ 
            error: 'Erro ao validar participantes' 
          }, { status: 500 });
        }

        if (!usuariosValidos || usuariosValidos.length !== matriculasParticipantes.length) {
          const matriculasEncontradas = usuariosValidos?.map(u => u.matricula) || [];
          const matriculasNaoEncontradas = matriculasParticipantes.filter(
            (matricula: string) => !matriculasEncontradas.includes(matricula)
          );
          
          console.error('Participantes não encontrados:', matriculasNaoEncontradas);
          
          return NextResponse.json({ 
            error: `Participantes não encontrados: ${matriculasNaoEncontradas.join(', ')}` 
          }, { status: 400 });
        }
      }
    }

    // Criar execução
    const statusExecucao = status || 'em_andamento';
    const dataConclusao = statusExecucao === 'concluida' ? new Date().toISOString() : null;

    const { data: novaExecucao, error: insertError } = await supabase
      .from('execucoes_inspecao')
      .insert({
        formulario_id,
        local_id: parseInt(local_id),
        matricula_executor: authResult.user?.matricula,
        status: statusExecucao,
        data_inicio: body.data_inicio || new Date().toISOString(), // Novo campo
        data_conclusao: dataConclusao
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir execução:', insertError);
      return NextResponse.json({ error: 'Erro ao criar execução' }, { status: 500 });
    }

    // Inserir participantes se fornecidos
    if (participantes && participantes.length > 0) {
      const matriculasParticipantes = participantes
        .map((p: Participante | string | number) => {
          if (typeof p === 'string' || typeof p === 'number') return String(p);
          return p.matricula;
        })
        .filter((matricula: string) => matricula && matricula.trim() !== ''); // Filtrar matrículas vazias

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
          // Reverter criação da execução
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
          continue; // Pular respostas inválidas
        }

        if (!['conforme', 'nao_conforme', 'nao_aplica'].includes(valorResposta)) {
          console.error('Validação falhou: valor de resposta inválido', { pergunta_id, valorResposta });
          return NextResponse.json({
            error: `Valor de resposta inválido: ${valorResposta}`
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

    // Se concluída, calcular nota final
    if (statusExecucao === 'concluida') {
      await supabase.rpc('calcular_nota_execucao', { execucao_uuid: novaExecucao.id });
    }

    // Buscar execução completa
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
      message: statusExecucao === 'concluida' ? 'Execução criada e concluída com sucesso' : 'Execução criada com sucesso'
    }, { status: 201 });

  } catch (error) {
    console.error('Erro na API de criação de execução:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT /api/inspecoes/execucoes - Atualizar execução (para salvar respostas)
export async function PUT(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const body = await request.json();
    const { execucao_id, local_id, participantes = [], respostas, status, concluir = false } = body;

    // Validar campos obrigatórios
    if (!execucao_id) {
      return NextResponse.json({ 
        error: 'Campo obrigatório: execucao_id' 
      }, { status: 400 });
    }

    // Verificar se a execução existe e se o usuário pode editá-la
    const { data: execucao } = await supabase
      .from('execucoes_inspecao')
      .select('id, matricula_executor, status, local_id')
      .eq('id', execucao_id)
      .single();

    if (!execucao) {
      return NextResponse.json({ error: 'Execução não encontrada' }, { status: 404 });
    }

    // Verificar se o usuário é o executor ou tem permissão de admin
    if (execucao.matricula_executor !== authResult.user?.matricula && 
        authResult.user?.role !== 'Admin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas o executor ou administradores podem editar esta execução.' }, { status: 403 });
    }

    // Não permitir edição de execuções concluídas ou canceladas
    if (execucao.status !== 'em_andamento') {
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
        .eq('id', execucao_id);

      if (erroAtualizarLocal) {
        console.error('Erro ao atualizar local da execução:', erroAtualizarLocal);
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
        console.error('Erro ao atualizar data de início:', erroAtualizarDataInicio);
        return NextResponse.json({ error: 'Erro ao atualizar data de início' }, { status: 500 });
      }
    }

    // Atualizar participantes se fornecidos
    if (participantes !== undefined) {
      // Normalizar matrículas
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
          return NextResponse.json({ error: `Participantes não encontrados: ${naoEncontrados.join(', ')}` }, { status: 400 });
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

    // Atualizar status da execução se necessário
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
        data_conclusao: dataConclusao
      })
      .eq('id', execucao_id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar execução:', updateError);
      return NextResponse.json({ error: 'Erro ao atualizar execução' }, { status: 500 });
    }

    // Se concluída, calcular nota final
    if (novoStatus === 'concluida') {
      await supabase.rpc('calcular_nota_execucao', { execucao_uuid: execucao_id });
    }

    return NextResponse.json({
      success: true,
      data: execucaoAtualizada,
      message: concluir ? 'Execução concluída com sucesso' : 'Execução salva com sucesso'
    });

  } catch (error) {
    console.error('Erro na API de atualização de execução:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}