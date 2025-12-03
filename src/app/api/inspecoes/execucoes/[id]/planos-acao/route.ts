import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';
import { PlanoAcao, PlanoAcaoWithRelations, CreatePlanoAcaoData, EvidenciaPlanoAcao } from '@/types/plano-acao';

// Tipos auxiliares para evitar uso de 'any'
type SupaError = { message?: string };
type UsuarioResumo = { matricula: number; nome: string; email: string };
type PlanoRow = PlanoAcao & { responsavel?: number; evidencias?: EvidenciaPlanoAcao[] };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/inspecoes/execucoes/[id]/planos-acao - Listar planos de ação de uma execução
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
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as PlanoAcao['status'];
    const prioridade = searchParams.get('prioridade') as PlanoAcao['prioridade'];
    const vencidos = searchParams.get('vencidos') === 'true';

    // Buscar execução para verificar acesso
    const { data: execucao } = await supabase
      .from('execucoes_inspecao')
      .select('id, matricula_executor')
      .eq('id', id)
      .single();

    if (!execucao) {
      return NextResponse.json({ error: 'Execução não encontrada' }, { status: 404 });
    }

    // Verificar permissões
    const podeVisualizar = 
      execucao.matricula_executor === authResult.user?.matricula ||
      authResult.user?.role === 'Admin' ||
      authResult.user?.role === 'Editor';

    if (!podeVisualizar) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Construir query para planos de ação (sem join direto a usuarios — vamos anexar manualmente)
    let query = supabase
      .from('planos_acao')
      .select(`
        *,
        evidencias:evidencias_plano_acao(*),
        pergunta:perguntas_formulario(pergunta, impeditivo),
        execucao:execucoes_inspecao(id, tag_equipamento)
      `)
      .eq('execucao_inspecao_id', id)
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (status) {
      query = query.eq('status', status);
    }
    if (prioridade) {
      query = query.eq('prioridade', prioridade);
    }
    if (vencidos) {
      query = query.lt('prazo', new Date().toISOString().split('T')[0]);
    }

    const { data: planosPrimarios, error: erroPrimario } = await query;

    // Fallback: se a coluna execucao_inspecao_id não existir, usar execucao_id (schema antigo)
    let planos = planosPrimarios;
    if (erroPrimario) {
      const mensagem = (erroPrimario as SupaError)?.message || '';
      if (mensagem.includes('execucao_inspecao_id')) {
        const { data: planosAntigos, error: erroAntigo } = await supabase
          .from('planos_acao')
          .select(`
            *,
            evidencias:evidencias_plano_acao(*)
          `)
          .eq('execucao_id', id)
          .order('created_at', { ascending: false });

        if (erroAntigo) {
          console.error('Erro ao buscar planos de ação (schema antigo):', erroAntigo);
          return NextResponse.json({ error: 'Erro ao buscar planos de ação' }, { status: 500 });
        }
        planos = planosAntigos;
      } else {
        console.error('Erro ao buscar planos de ação:', erroPrimario);
        return NextResponse.json({ error: 'Erro ao buscar planos de ação' }, { status: 500 });
      }
    }

    // Anexar responsavel_info manualmente a partir de usuarios
    const responsaveis = Array.from(
      new Set(
        (planos || [])
          .map((p) => {
            const row = p as Partial<PlanoRow>;
            return row.responsavel_matricula ?? row.responsavel;
          })
          .filter((v): v is number => typeof v === 'number')
      )
    );
    const usuariosMap = new Map<number, UsuarioResumo>();
    if (responsaveis.length > 0) {
      const { data: usuarios, error: erroUsuarios } = await supabase
        .from('usuarios')
        .select('matricula, nome, email')
        .in('matricula', responsaveis);
      if (!erroUsuarios && usuarios) {
        usuarios.forEach((u: UsuarioResumo) => {
          usuariosMap.set(u.matricula, { matricula: u.matricula, nome: u.nome, email: u.email });
        });
      }
    }

    const planosComInfo: PlanoAcaoWithRelations[] = (planos || []).map((p) => {
      const row = p as PlanoRow & {
        pergunta?: { pergunta?: string; impeditivo?: boolean };
        execucao?: { id: string; tag_equipamento?: string | null };
      };
      const info = usuariosMap.get(row.responsavel_matricula ?? row.responsavel ?? -1) || null;
      return {
        ...(row as PlanoAcao),
        evidencias: row.evidencias,
        responsavel_info: info,
        pergunta: row.pergunta,
        execucao: row.execucao
      } as PlanoAcaoWithRelations;
    });

    return NextResponse.json({
      success: true,
      data: planosComInfo as PlanoAcaoWithRelations[]
    });

  } catch (error) {
    console.error('Erro na API de planos de ação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST /api/inspecoes/execucoes/[id]/planos-acao - Criar novo plano de ação
export async function POST(
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
    const body: CreatePlanoAcaoData = await request.json();

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
    const podeCriar = 
      execucao.matricula_executor === authResult.user?.matricula ||
      authResult.user?.role === 'Admin';

    if (!podeCriar) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Não permitir criar planos em execuções concluídas ou canceladas
    if (execucao.status !== 'em_andamento' && authResult.user?.role !== 'Admin') {
      return NextResponse.json({ error: 'Não é possível criar planos em execuções que não estão em andamento' }, { status: 409 });
    }

    // Validar dados - usando os campos corretos do banco de dados
    const erros: { [key: string]: string } = {};
    if (!body.desvio?.trim()) {
      erros.desvio = 'Descrição do desvio é obrigatória';
    }
    if (!body.o_que_fazer?.trim()) {
      erros.o_que_fazer = 'O que deve ser feito é obrigatório';
    }
    if (!body.como_fazer?.trim()) {
      erros.como_fazer = 'Como executar é obrigatório';
    }
    if (!body.responsavel_matricula) {
      erros.responsavel_matricula = 'Responsável é obrigatório';
    }
    if (!body.prazo) {
      erros.prazo = 'Prazo é obrigatório';
    }
    if (!body.prioridade) {
      erros.prioridade = 'Prioridade é obrigatória';
    }
    if (!body.pergunta_id) {
      erros.pergunta_id = 'Pergunta é obrigatória';
    }

    if (Object.keys(erros).length > 0) {
      return NextResponse.json({ error: 'Dados inválidos', erros }, { status: 400 });
    }

    // Verificar se o responsável existe
    const { data: responsavel } = await supabase
      .from('usuarios')
      .select('matricula')
      .eq('matricula', body.responsavel_matricula)
      .single();

    if (!responsavel) {
      return NextResponse.json({ error: 'Responsável não encontrado' }, { status: 400 });
    }

    // Criar plano de ação com fallback para esquemas antigos (sem cadastrado_por_matricula)
    const payloadNovo = {
      execucao_inspecao_id: id,
      pergunta_id: body.pergunta_id,
      desvio: body.desvio.trim(),
      o_que_fazer: body.o_que_fazer.trim(),
      criador_id: authResult.user?.matricula,
      como_fazer: body.como_fazer.trim(),
      responsavel_matricula: body.responsavel_matricula,
      prazo: body.prazo,
      prioridade: body.prioridade,
    };

    const tentarInsert = async (payload: Record<string, unknown>) => {
      return supabase
        .from('planos_acao')
        .insert([payload])
        .select('*')
        .single();
    };

    let planoInserido: PlanoAcao | null = null;

    // ÚNICA TENTATIVA: usar payload completo com cadastrado_por_matricula
    const { data: tentativa, error: erro } = await tentarInsert({
      ...payloadNovo,
      criador_id: Number(authResult.user?.matricula),
    });

    if (erro) {
      console.error('Erro ao criar plano de ação:', erro);
      return NextResponse.json({ error: 'Erro ao criar plano de ação' }, { status: 500 });
    }

    planoInserido = tentativa as PlanoAcao;

    // Anexar responsavel_info manualmente
    let responsavel_info: UsuarioResumo | undefined = undefined;
    if (planoInserido?.responsavel_matricula) {
      const { data: usuarioResp } = await supabase
        .from('usuarios')
        .select('matricula, nome, email')
        .eq('matricula', planoInserido.responsavel_matricula)
        .single();
      if (usuarioResp) {
        responsavel_info = {
          matricula: usuarioResp.matricula,
          nome: usuarioResp.nome,
          email: usuarioResp.email,
        };
      }
    }

    const retorno: PlanoAcaoWithRelations = {
      ...(planoInserido as PlanoAcao),
      responsavel_info,
      evidencias: [],
    };

    return NextResponse.json({ success: true, data: retorno }, { status: 201 });

  } catch (error) {
    console.error('Erro na API de criação de plano de ação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}



