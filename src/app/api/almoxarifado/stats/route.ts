import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';

interface ItemMaisSolicitado {
  item_id: string;
  nome: string;
  categoria: string;
  total_solicitado: number;
}

interface UsuarioMaisAtivo {
  matricula: string;
  nome: string;
  total_requisicoes: number;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/almoxarifado/stats - Estatísticas do almoxarifado
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Parâmetros de consulta
    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get('periodo') || '30'; // dias
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - parseInt(periodo));

    // 1. Estatísticas gerais de itens
    const { data: statsItens } = await supabase
      .from('itens_almoxarifado')
      .select('id, estoque_atual, estoque_minimo, ativo')
      .eq('ativo', true);

    const totalItens = statsItens?.length || 0;
    const itensEstoqueBaixo = statsItens?.filter(item => 
      item.estoque_atual <= item.estoque_minimo
    ).length || 0;
    const itensZerados = statsItens?.filter(item => 
      item.estoque_atual === 0
    ).length || 0;

    // 2. Estatísticas de requisições
    const { data: statsRequisicoes } = await supabase
      .from('requisicoes')
      .select('id, status, valor_total, created_at')
      .gte('created_at', dataInicio.toISOString());

    const totalRequisicoes = statsRequisicoes?.length || 0;
    const requisicoesAprovadas = statsRequisicoes?.filter(req => 
      req.status === 'aprovada'
    ).length || 0;
    const requisicoesPendentes = statsRequisicoes?.filter(req => 
      req.status === 'pendente'
    ).length || 0;
    const requisicoesEntregues = statsRequisicoes?.filter(req => 
      req.status === 'entregue'
    ).length || 0;
    const valorTotalRequisicoes = statsRequisicoes?.reduce((acc, req) => 
      acc + (req.valor_total || 0), 0
    ) || 0;

    // 3. Movimentações por tipo
    const { data: statsMovimentacoes } = await supabase
      .from('movimentacoes_estoque')
      .select('tipo_movimentacao, quantidade, created_at')
      .gte('created_at', dataInicio.toISOString());

    const totalEntradas = statsMovimentacoes?.filter(mov => 
      mov.tipo_movimentacao === 'entrada'
    ).reduce((acc, mov) => acc + mov.quantidade, 0) || 0;

    const totalSaidas = statsMovimentacoes?.filter(mov => 
      mov.tipo_movimentacao === 'saida'
    ).reduce((acc, mov) => acc + mov.quantidade, 0) || 0;

    // 4. Top 5 itens mais requisitados
    const { data: topItens } = await supabase
      .from('requisicoes_itens')
      .select(`
        item_id,
        quantidade_solicitada,
        item:itens_almoxarifado(nome, categoria)
      `)
      .gte('created_at', dataInicio.toISOString());

    const itensAgrupados = topItens?.reduce((acc, item) => {
      const key = item.item_id;
      if (!acc[key]) {
        const itemData = Array.isArray(item.item) ? item.item[0] : item.item;
        acc[key] = {
          item_id: item.item_id,
          nome: itemData?.nome || 'Item não encontrado',
          categoria: itemData?.categoria || 'Sem categoria',
          total_solicitado: 0
        };
      }
      acc[key].total_solicitado += item.quantidade_solicitada;
      return acc;
    }, {} as Record<string, ItemMaisSolicitado>) || {};

    const topItensMaisRequisitados = Object.values(itensAgrupados)
      .sort((a: ItemMaisSolicitado, b: ItemMaisSolicitado) => b.total_solicitado - a.total_solicitado)
      .slice(0, 5);

    // 5. Requisições por status (últimos 7 dias para gráfico)
    const ultimosSete = new Date();
    ultimosSete.setDate(ultimosSete.getDate() - 7);

    const { data: requisicoesRecentes } = await supabase
      .from('requisicoes')
      .select('status, created_at')
      .gte('created_at', ultimosSete.toISOString())
      .order('created_at', { ascending: true });

    // Agrupar por dia
    const requisicoesporDia = requisicoesRecentes?.reduce((acc, req) => {
      const dia = new Date(req.created_at).toISOString().split('T')[0];
      if (!acc[dia]) {
        acc[dia] = { pendente: 0, aprovada: 0, entregue: 0, rejeitada: 0 };
      }
      acc[dia][req.status as keyof typeof acc[typeof dia]]++;
      return acc;
    }, {} as Record<string, { pendente: number; aprovada: number; entregue: number; rejeitada: number }>) || {};

    // 6. Alertas de estoque
    const { data: alertasEstoque } = await supabase
      .from('itens_almoxarifado')
      .select('id, nome, categoria, estoque_atual, estoque_minimo')
      .eq('ativo', true)
      .or('estoque_atual.lte.estoque_minimo,estoque_atual.eq.0')
      .order('estoque_atual', { ascending: true })
      .limit(10);

    // 7. Usuários mais ativos (solicitantes)
    const { data: usuariosAtivos } = await supabase
      .from('requisicoes')
      .select(`
        matricula_solicitante,
        solicitante:usuarios!matricula_solicitante(nome)
      `)
      .gte('created_at', dataInicio.toISOString());

    const usuariosAgrupados = usuariosAtivos?.reduce((acc, req) => {
      const key = req.matricula_solicitante;
      if (!acc[key]) {
        const solicitanteData = Array.isArray(req.solicitante) ? req.solicitante[0] : req.solicitante;
        acc[key] = {
          matricula: req.matricula_solicitante,
          nome: solicitanteData?.nome || 'Usuário não encontrado',
          total_requisicoes: 0
        };
      }
      acc[key].total_requisicoes++;
      return acc;
    }, {} as Record<string, UsuarioMaisAtivo>) || {};

    const topUsuarios = Object.values(usuariosAgrupados)
      .sort((a: UsuarioMaisAtivo, b: UsuarioMaisAtivo) => b.total_requisicoes - a.total_requisicoes)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      data: {
        periodo_dias: parseInt(periodo),
        resumo_geral: {
          total_itens: totalItens,
          itens_estoque_baixo: itensEstoqueBaixo,
          itens_zerados: itensZerados,
          total_requisicoes: totalRequisicoes,
          requisicoes_pendentes: requisicoesPendentes,
          requisicoes_aprovadas: requisicoesAprovadas,
          requisicoes_entregues: requisicoesEntregues,
          valor_total_requisicoes: valorTotalRequisicoes
        },
        movimentacoes: {
          total_entradas: totalEntradas,
          total_saidas: totalSaidas,
          saldo: totalEntradas - totalSaidas
        },
        top_itens_requisitados: topItensMaisRequisitados,
        requisicoes_por_dia: requisicoesporDia,
        alertas_estoque: alertasEstoque || [],
        usuarios_mais_ativos: topUsuarios
      }
    });

  } catch (error) {
    console.error('Erro na API de estatísticas:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}