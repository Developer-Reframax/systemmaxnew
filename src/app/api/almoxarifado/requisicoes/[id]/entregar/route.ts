import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ItemEntregue {
  requisicao_item_id: string;
  quantidade_entregue: number;
}



// PUT /api/almoxarifado/requisicoes/[id]/entregar - Registrar entrega de requisição
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Verificar se o usuário tem permissão (Admin ou Editor)
    if (!authResult.user || !['Admin', 'Editor'].includes(authResult.user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Parse do body da requisição com tratamento de erro
    let itens_entregues: ItemEntregue[] = [];
    let observacoes_entrega = '';
    
    try {
      const body = await request.text();
      if (body.trim()) {
        const parsedBody = JSON.parse(body);
        itens_entregues = parsedBody.itens_entregues || [];
        observacoes_entrega = parsedBody.observacoes_entrega || '';
      }
    } catch {
      // Se não conseguir fazer parse do JSON, continua com valores padrão
      console.log('Body vazio ou inválido, usando valores padrão');
    }

    // Validar dados de entrada
    if (!itens_entregues || !Array.isArray(itens_entregues) || itens_entregues.length === 0) {
      return NextResponse.json({ 
        error: 'Lista de itens entregues é obrigatória' 
      }, { status: 400 });
    }

    const { id } = await params;

    // Buscar requisição com itens
    const { data: requisicao, error: fetchError } = await supabase
      .from('requisicoes')
      .select(`
        id,
        status,
        matricula_solicitante,
        requisicoes_itens(
          id,
          quantidade_solicitada,
          quantidade_entregue,
          item_id,
          item:itens_almoxarifado(id, nome, estoque_atual)
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Requisição não encontrada' }, { status: 404 });
      }
      console.error('Erro ao buscar requisição:', fetchError);
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }

    // Verificar se a requisição está aprovada
    if (requisicao.status !== 'aprovada') {
      return NextResponse.json({ 
        error: 'Apenas requisições aprovadas podem ser entregues' 
      }, { status: 400 });
    }

    // Validar itens entregues
    interface ItemRequisicaoMap {
      id: string;
      quantidade_solicitada: number;
      quantidade_entregue: number;
      item_id: string;
      item: {
        id: string;
        nome: string;
        estoque_atual: number;
      } | {
        id: string;
        nome: string;
        estoque_atual: number;
      }[];
    }
    
    const itensMap = new Map(requisicao.requisicoes_itens.map((item: ItemRequisicaoMap) => [item.id, item]));
    
    for (const itemEntregue of itens_entregues) {
      if (!itemEntregue.requisicao_item_id || typeof itemEntregue.quantidade_entregue !== 'number') {
        return NextResponse.json({ 
          error: 'Cada item deve ter requisicao_item_id e quantidade_entregue válidos' 
        }, { status: 400 });
      }

      const itemRequisicao = itensMap.get(itemEntregue.requisicao_item_id);
      if (!itemRequisicao) {
        return NextResponse.json({ 
          error: `Item da requisição ${itemEntregue.requisicao_item_id} não encontrado` 
        }, { status: 400 });
      }

      // Verificar se a quantidade entregue não excede a solicitada
      if (itemEntregue.quantidade_entregue > itemRequisicao.quantidade_solicitada) {
        const itemData = Array.isArray(itemRequisicao.item) ? itemRequisicao.item[0] : itemRequisicao.item;
        return NextResponse.json({ 
          error: `Quantidade entregue (${itemEntregue.quantidade_entregue}) não pode ser maior que a solicitada (${itemRequisicao.quantidade_solicitada}) para o item ${itemData?.nome || 'desconhecido'}` 
        }, { status: 400 });
      }

      // Verificar estoque disponível
      const itemData = Array.isArray(itemRequisicao.item) ? itemRequisicao.item[0] : itemRequisicao.item;
      if (itemData && itemData.estoque_atual < itemEntregue.quantidade_entregue) {
        return NextResponse.json({ 
          error: `Estoque insuficiente para o item ${itemData.nome}. Disponível: ${itemData.estoque_atual}, Tentando entregar: ${itemEntregue.quantidade_entregue}` 
        }, { status: 400 });
      }
    }

    // Iniciar transação - atualizar itens da requisição e estoque
    const movimentacoes = [];
    
    for (const itemEntregue of itens_entregues) {
      const itemRequisicao = itensMap.get(itemEntregue.requisicao_item_id);
      
      if (!itemRequisicao) {
        return NextResponse.json({ 
          error: `Item da requisição ${itemEntregue.requisicao_item_id} não encontrado` 
        }, { status: 400 });
      }
      
      // Atualizar quantidade entregue no item da requisição
      const { error: updateItemError } = await supabase
        .from('requisicoes_itens')
        .update({
          quantidade_entregue: itemEntregue.quantidade_entregue
        })
        .eq('id', itemEntregue.requisicao_item_id);

      if (updateItemError) {
        console.error('Erro ao atualizar item da requisição:', updateItemError);
        return NextResponse.json({ error: 'Erro ao atualizar itens da requisição' }, { status: 500 });
      }

      // Atualizar estoque do item
      const itemData = Array.isArray(itemRequisicao.item) ? itemRequisicao.item[0] : itemRequisicao.item;
      const novoEstoque = itemData.estoque_atual - itemEntregue.quantidade_entregue;
      const { error: updateEstoqueError } = await supabase
        .from('itens_almoxarifado')
        .update({
          estoque_atual: novoEstoque,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemRequisicao.item_id);

      if (updateEstoqueError) {
        console.error('Erro ao atualizar estoque:', updateEstoqueError);
        return NextResponse.json({ error: 'Erro ao atualizar estoque' }, { status: 500 });
      }

      // Preparar movimentação de estoque
      if (itemEntregue.quantidade_entregue > 0) {
        movimentacoes.push({
          item_id: itemRequisicao.item_id,
          tipo: 'saida',
          quantidade: itemEntregue.quantidade_entregue,
          motivo: `Entrega da requisição #${requisicao.id}`,
          matricula_responsavel: authResult.user.matricula,
          estoque_anterior: itemData.estoque_atual,
          estoque_atual: novoEstoque
        });
      }
    }

    // Inserir movimentações de estoque
    if (movimentacoes.length > 0) {
      const { error: movError } = await supabase
        .from('movimentacoes_estoque')
        .insert(movimentacoes);

      if (movError) {
        console.error('Erro ao inserir movimentações:', movError);
        return NextResponse.json({ error: 'Erro ao registrar movimentações de estoque' }, { status: 500 });
      }
    }

    // Verificar se todos os itens foram entregues para determinar o status
    const totalItensEntregues = itens_entregues.reduce((acc: number, item: ItemEntregue) => acc + item.quantidade_entregue, 0);
    const totalItensSolicitados = requisicao.requisicoes_itens.reduce((acc: number, item: ItemRequisicaoMap) => acc + item.quantidade_solicitada, 0);
    
    const novoStatus = totalItensEntregues === totalItensSolicitados ? 'entregue' : 'parcialmente_entregue';

    // Atualizar status da requisição
    const { data: requisicaoAtualizada, error: updateError } = await supabase
      .from('requisicoes')
      .update({
        status: novoStatus,
        matricula_entregador: authResult.user.matricula,
        data_entrega: new Date().toISOString(),
        observacoes_entrega,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
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
          item:itens_almoxarifado(id, nome, categoria, imagem_url, estoque_atual)
        )
      `)
      .single();

    if (updateError) {
      console.error('Erro ao atualizar requisição:', updateError);
      return NextResponse.json({ error: 'Erro ao atualizar requisição' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: requisicaoAtualizada,
      message: novoStatus === 'entregue' ? 'Entrega registrada com sucesso' : 'Entrega parcial registrada com sucesso'
    });

  } catch (error) {
    console.error('Erro na API de entrega:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}