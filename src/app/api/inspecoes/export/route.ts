import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getSingleRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

async function getUserContract(matricula?: number | null, contratoToken?: string | null) {
  if (contratoToken) {
    return contratoToken;
  }

  if (!matricula) {
    return null;
  }

  const { data: usuarioContrato, error } = await supabase
    .from('usuarios')
    .select('contrato_raiz')
    .eq('matricula', matricula)
    .single();

  if (error) {
    console.error('Erro ao buscar contrato_raiz do usuario para exportacao de inspecoes:', error);
    return null;
  }

  return usuarioContrato?.contrato_raiz || null;
}

function formatReference(formulario: string, local: string, dataInicio: string | null) {
  const data = dataInicio
    ? new Date(dataInicio).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Sem data';

  return `${formulario} | ${local} | ${data}`;
}

type ExecucaoExportRow = {
  contrato?: string | null;
  status?: string | null;
  data_inicio?: string | null;
  data_conclusao?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  nota_final?: number | null;
  observacoes_gerais?: string | null;
  tag_equipamento?: string | null;
  formulario?:
    | {
        titulo?: string | null;
        corporativo?: boolean | null;
        check_list?: boolean | null;
        categoria?: { nome?: string | null } | Array<{ nome?: string | null }>;
      }
    | Array<{
        titulo?: string | null;
        corporativo?: boolean | null;
        check_list?: boolean | null;
        categoria?: { nome?: string | null } | Array<{ nome?: string | null }>;
      }>
    | null;
  local?: { local?: string | null } | Array<{ local?: string | null }> | null;
  executor?:
    | {
        matricula?: number | null;
        nome?: string | null;
        email?: string | null;
        funcao?: string | null;
        contrato_raiz?: string | null;
      }
    | Array<{
        matricula?: number | null;
        nome?: string | null;
        email?: string | null;
        funcao?: string | null;
        contrato_raiz?: string | null;
      }>
    | null;
  participantes?: Array<{
    matricula_participante?: string | null;
    participante?:
      | {
          matricula?: number | null;
          nome?: string | null;
          email?: string | null;
          funcao?: string | null;
          contrato_raiz?: string | null;
        }
      | Array<{
          matricula?: number | null;
          nome?: string | null;
          email?: string | null;
          funcao?: string | null;
          contrato_raiz?: string | null;
        }>
      | null;
  }> | null;
  respostas?: Array<{
    resposta?: string | null;
    observacoes?: string | null;
    pergunta?: { pergunta?: string | null } | Array<{ pergunta?: string | null }> | null;
  }> | null;
};

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error || 'Usuario nao autenticado' },
        { status: authResult.status || 401 }
      );
    }

    const contratoRaiz = await getUserContract(
      authResult.user?.matricula ?? null,
      authResult.user?.contrato_raiz ?? null
    );

    if (!contratoRaiz) {
      return NextResponse.json(
        { success: false, message: 'Contrato do usuario nao encontrado' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('execucoes_inspecao')
      .select(`
        contrato,
        status,
        data_inicio,
        data_conclusao,
        created_at,
        updated_at,
        nota_final,
        tag_equipamento,
        formulario:formularios_inspecao!execucoes_inspecao_formulario_id_fkey(
          titulo,
          corporativo,
          check_list,
          categoria:categorias_inspecao!formularios_inspecao_categoria_id_fkey(nome)
        ),
        local:locais!execucoes_inspecao_local_id_fkey(local),
        executor:usuarios!execucoes_inspecao_matricula_executor_fkey(
          matricula,
          nome,
          email,
          funcao,
          contrato_raiz
        ),
        participantes:participantes_execucao(
          matricula_participante,
          participante:usuarios!participantes_execucao_matricula_participante_fkey(
            matricula,
            nome,
            email,
            funcao,
            contrato_raiz
          )
        ),
        respostas:respostas_execucao(
          resposta,
          observacoes,
          pergunta:perguntas_formulario(pergunta)
        )
      `)
      .eq('contrato', contratoRaiz)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao exportar execucoes de inspecao:', error);
      return NextResponse.json(
        { success: false, message: 'Erro ao carregar execucoes para exportacao' },
        { status: 500 }
      );
    }

    const execucoes = ((data as ExecucaoExportRow[] | null) || []).map((item) => {
      const formulario = getSingleRelation(item.formulario);
      const categoria = getSingleRelation(formulario?.categoria);
      const local = getSingleRelation(item.local);
      const executor = getSingleRelation(item.executor);
      const participantes = (item.participantes || []).map((participante) => {
        const participanteInfo = getSingleRelation(participante.participante);

        return {
          matricula: participanteInfo?.matricula || participante.matricula_participante || null,
          nome: participanteInfo?.nome || null,
          email: participanteInfo?.email || null,
          funcao: participanteInfo?.funcao || null,
          contrato_raiz: participanteInfo?.contrato_raiz || null
        };
      });

      const respostas = (item.respostas || []).map((resposta) => {
        const pergunta = getSingleRelation(resposta.pergunta);

        return {
          pergunta: pergunta?.pergunta || null,
          resposta: resposta.resposta || null,
          observacoes: resposta.observacoes || null
        };
      });

      const formularioTitulo = formulario?.titulo || 'Formulario nao identificado';
      const localNome = local?.local || 'Local nao identificado';

      return {
        referencia: formatReference(formularioTitulo, localNome, item.data_inicio || null),
        contrato: item.contrato || contratoRaiz,
        status: item.status || null,
        data_inicio: item.data_inicio || null,
        data_conclusao: item.data_conclusao || null,
        criado_em: item.created_at || null,
        atualizado_em: item.updated_at || null,
        nota_final: item.nota_final ?? null,
        observacoes_gerais: item.observacoes_gerais || null,
        tag_equipamento: item.tag_equipamento || null,
        formulario: formularioTitulo,
        categoria: categoria?.nome || null,
        tipo_formulario: formulario?.check_list ? 'Checklist' : formulario?.corporativo ? 'Corporativo' : 'Padrao',
        local: localNome,
        executor: {
          matricula: executor?.matricula || null,
          nome: executor?.nome || null,
          email: executor?.email || null,
          funcao: executor?.funcao || null,
          contrato_raiz: executor?.contrato_raiz || null
        },
        participantes,
        respostas
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        contrato: contratoRaiz,
        exportado_em: new Date().toISOString(),
        execucoes
      }
    });
  } catch (error) {
    console.error('Exportacao de inspecoes falhou:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
