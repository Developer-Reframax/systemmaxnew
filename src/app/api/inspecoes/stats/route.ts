import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';

// Tipos explícitos para relações retornadas pelo Supabase
type ExecucaoStatus = 'em_andamento' | 'concluida' | string;

interface CategoriaInspecao { nome: string }

interface FormularioRel {
  titulo: string;
  categoria?: CategoriaInspecao | CategoriaInspecao[];
}

interface ExecucaoResumo {
  id: string;
  nota_final: number | null;
  status: ExecucaoStatus;
}

interface FormularioComCategoria {
  id: string;
  titulo: string;
  categoria?: CategoriaInspecao | CategoriaInspecao[];
  execucoes?: ExecucaoResumo[];
}

interface LocalRel { local: string }

interface UsuarioRel { nome: string }

interface ExecucaoCompleta {
  id: string;
  status: ExecucaoStatus;
  nota_final: number | null;
  data_inicio: string;
  formulario?: FormularioRel | FormularioRel[];
  local?: LocalRel | LocalRel[];
  executor?: UsuarioRel | UsuarioRel[];
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/inspecoes/stats - Estatísticas do dashboard
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Data de 30 dias atrás
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 30);
    const dataLimiteISO = dataLimite.toISOString();

    // Buscar resumo geral
    const [
      { count: totalFormularios },
      { count: formulariosAtivos },
      { count: totalExecucoes },
      { count: execucoesEmAndamento },
      { count: execucoesConcluidas }
    ] = await Promise.all([
      supabase.from('formularios_inspecao').select('*', { count: 'exact', head: true }),
      supabase.from('formularios_inspecao').select('*', { count: 'exact', head: true }).eq('ativo', true),
      supabase.from('execucoes_inspecao').select('*', { count: 'exact', head: true }),
      supabase.from('execucoes_inspecao').select('*', { count: 'exact', head: true }).eq('status', 'em_andamento'),
      supabase.from('execucoes_inspecao').select('*', { count: 'exact', head: true })
        .eq('status', 'concluida')
        .gte('data_inicio', dataLimiteISO)
    ]);

    // Calcular média de conformidade dos últimos 30 dias
    const { data: execucoesComNota } = await supabase
      .from('execucoes_inspecao')
      .select('nota_final')
      .eq('status', 'concluida')
      .gte('data_inicio', dataLimiteISO)
      .not('nota_final', 'is', null);

    const mediaConformidade = execucoesComNota && execucoesComNota.length > 0
      ? execucoesComNota.reduce((acc, exec) => acc + (exec.nota_final || 0), 0) / execucoesComNota.length
      : 0;

    // Buscar execuções recentes
    const { data: execucoesRecentes } = await supabase
      .from('execucoes_inspecao')
      .select(`
        id,
        status,
        nota_final,
        data_inicio,
        formulario:formularios_inspecao!execucoes_inspecao_formulario_id_fkey(titulo, categoria:categorias_inspecao!formularios_inspecao_categoria_id_fkey(nome)),
        local:locais!execucoes_inspecao_local_id_fkey(local),
        executor:usuarios!execucoes_inspecao_matricula_executor_fkey(nome)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    // Buscar formulários mais usados
    const { data: formulariosMaisUsados } = await supabase
      .from('formularios_inspecao')
      .select(`
        id,
        titulo,
        categoria:categorias_inspecao!formularios_inspecao_categoria_id_fkey(nome),
        execucoes:execucoes_inspecao(id, nota_final, status)
      `)
      .eq('ativo', true)
      .limit(10);

    // Processar formulários mais usados (suportando objeto ou array nas relações)
    const formulariosMaisUsadosProcessados = formulariosMaisUsados
      ?.map((formulario: FormularioComCategoria) => {
        const execucoesConcluidas = formulario.execucoes?.filter(e => e.status === 'concluida') || [];
        const totalExecucoes = formulario.execucoes?.length || 0;
        const mediaConformidadeFormulario = execucoesConcluidas.length > 0
          ? execucoesConcluidas
              .filter(e => e.nota_final !== null)
              .reduce((acc, e) => acc + (e.nota_final || 0), 0) / execucoesConcluidas.filter(e => e.nota_final !== null).length
          : 0;

        const categoriaRel = formulario.categoria;
        const categoriaNome = Array.isArray(categoriaRel)
          ? (categoriaRel[0]?.nome ?? 'Sem categoria')
          : (categoriaRel?.nome ?? 'Sem categoria');

        return {
          id: formulario.id,
          titulo: formulario.titulo,
          categoria_nome: categoriaNome,
          total_execucoes: totalExecucoes,
          media_conformidade: mediaConformidadeFormulario
        };
      })
      .sort((a, b) => b.total_execucoes - a.total_execucoes)
      .slice(0, 5) || [];

    // Processar execuções recentes (suportando objeto ou array nas relações)
    const execucoesRecentesProcessadas = execucoesRecentes?.map((execucao: ExecucaoCompleta) => {
      const formularioRel = execucao.formulario;
      const localRel = execucao.local;
      const executorRel = execucao.executor;

      const formularioTitulo = Array.isArray(formularioRel)
        ? (formularioRel[0]?.titulo ?? 'Formulário não encontrado')
        : (formularioRel?.titulo ?? 'Formulário não encontrado');

      const categoriaRel = Array.isArray(formularioRel)
        ? formularioRel[0]?.categoria
        : formularioRel?.categoria;

      const categoriaNome = Array.isArray(categoriaRel)
        ? (categoriaRel[0]?.nome ?? 'Sem categoria')
        : (categoriaRel?.nome ?? 'Sem categoria');

      const localNome = Array.isArray(localRel)
        ? (localRel[0]?.local ?? 'Local não encontrado')
        : (localRel?.local ?? 'Local não encontrado');

      const executorNome = Array.isArray(executorRel)
        ? (executorRel[0]?.nome ?? 'Executor não encontrado')
        : (executorRel?.nome ?? 'Executor não encontrado');

      return {
        id: execucao.id,
        formulario_titulo: formularioTitulo,
        categoria_nome: categoriaNome,
        local_nome: localNome,
        executor_nome: executorNome,
        status: execucao.status,
        nota_final: execucao.nota_final,
        data_inicio: execucao.data_inicio
      };
    }) || [];

    const stats = {
      resumo_geral: {
        total_formularios: totalFormularios || 0,
        formularios_ativos: formulariosAtivos || 0,
        total_execucoes: totalExecucoes || 0,
        execucoes_em_andamento: execucoesEmAndamento || 0,
        execucoes_concluidas: execucoesConcluidas || 0,
        media_conformidade: mediaConformidade
      },
      execucoes_recentes: execucoesRecentesProcessadas,
      formularios_mais_usados: formulariosMaisUsadosProcessados
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Erro na API de estatísticas:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}