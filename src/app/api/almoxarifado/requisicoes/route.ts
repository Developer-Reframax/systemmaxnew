import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/almoxarifado/requisicoes - Listar requisições
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Parâmetros de consulta
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const data_inicio = searchParams.get('data_inicio');
    const data_fim = searchParams.get('data_fim');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Construir query com joins
    let query = supabase
      .from('requisicoes')
      .select(`
        *,
        solicitante:usuarios!matricula_solicitante(matricula, nome),
        aprovador:usuarios!matricula_aprovador(matricula, nome),
        entregador:usuarios!matricula_entregador(matricula, nome),
        itens:requisicoes_itens(
          id,
          quantidade_solicitada,
          quantidade_entregue,
          preco_unitario,
          subtotal,
          item:itens_almoxarifado(id, nome, categoria, imagem_url)
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (status) {
      query = query.eq('status', status);
    }

    if (data_inicio) {
      query = query.gte('created_at', data_inicio);
    }

    if (data_fim) {
      query = query.lte('created_at', data_fim);
    }

    // Aplicar paginação
    query = query.range(offset, offset + limit - 1);

    const { data: requisicoes, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar requisições:', error);
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: requisicoes,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Erro na API de requisições:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST /api/almoxarifado/requisicoes - Criar nova requisição
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const body = await request.json();
    const { itens, observacoes } = body;

    // Validar campos obrigatórios
    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json({ 
        error: 'Lista de itens é obrigatória e deve conter pelo menos um item' 
      }, { status: 400 });
    }

    // Validar estrutura dos itens
    for (const item of itens) {
      if (!item.item_id || !item.quantidade || typeof item.quantidade !== 'number' || item.quantidade <= 0) {
        return NextResponse.json({ 
          error: 'Cada item deve ter item_id e quantidade válida (maior que 0)' 
        }, { status: 400 });
      }
    }

    // Verificar disponibilidade de estoque e calcular valores
    let valor_total = 0;
    const itensValidados = [];

    for (const item of itens) {
      const { data: itemEstoque, error: itemError } = await supabase
        .from('itens_almoxarifado')
        .select('id, nome, preco_unitario, estoque_atual')
        .eq('id', item.item_id)
        .eq('ativo', true)
        .single();

      if (itemError || !itemEstoque) {
        return NextResponse.json({ 
          error: `Item ${item.item_id} não encontrado ou inativo` 
        }, { status: 400 });
      }

      if (itemEstoque.estoque_atual < item.quantidade) {
        return NextResponse.json({ 
          error: `Estoque insuficiente para o item ${itemEstoque.nome}. Disponível: ${itemEstoque.estoque_atual}, Solicitado: ${item.quantidade}` 
        }, { status: 400 });
      }

      const subtotal = itemEstoque.preco_unitario * item.quantidade;
      valor_total += subtotal;

      itensValidados.push({
        item_id: item.item_id,
        quantidade_solicitada: item.quantidade,
        preco_unitario: itemEstoque.preco_unitario,
        subtotal: subtotal
      });
    }

    // Inserir requisição
    const { data: novaRequisicao, error: insertError } = await supabase
      .from('requisicoes')
      .insert({
        matricula_solicitante: authResult.user!.matricula,
        observacoes,
        valor_total,
        status: 'pendente'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir requisição:', insertError);
      return NextResponse.json({ error: 'Erro ao criar requisição' }, { status: 500 });
    }

    // Inserir itens da requisição
    const itensParaInserir = itensValidados.map(item => ({
      ...item,
      requisicao_id: novaRequisicao.id
    }));

    const { error: itensError } = await supabase
      .from('requisicoes_itens')
      .insert(itensParaInserir);

    if (itensError) {
      console.error('Erro ao inserir itens da requisição:', itensError);
      // Rollback: deletar a requisição criada
      await supabase.from('requisicoes').delete().eq('id', novaRequisicao.id);
      return NextResponse.json({ error: 'Erro ao criar itens da requisição' }, { status: 500 });
    }

    // Buscar requisição completa para retorno
    const { data: requisicaoCompleta } = await supabase
      .from('requisicoes')
      .select(`
        *,
        solicitante:usuarios!matricula_solicitante(matricula, nome),
        itens:requisicoes_itens(
          id,
          quantidade_solicitada,
          preco_unitario,
          subtotal,
          item:itens_almoxarifado(id, nome, categoria, imagem_url)
        )
      `)
      .eq('id', novaRequisicao.id)
      .single();

    return NextResponse.json({
      success: true,
      data: requisicaoCompleta
    }, { status: 201 });

  } catch (error) {
    console.error('Erro na API de criação de requisição:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}