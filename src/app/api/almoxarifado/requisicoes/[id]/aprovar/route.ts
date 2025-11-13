import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PUT /api/almoxarifado/requisicoes/[id]/aprovar - Aprovar ou rejeitar requisição
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

    const body = await request.json();
    const { acao, observacoes_aprovacao } = body;

    // Validar ação
    if (!acao || !['aprovar', 'rejeitar'].includes(acao)) {
      return NextResponse.json({ 
        error: 'Ação deve ser "aprovar" ou "rejeitar"' 
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

    // Verificar se a requisição está pendente
    if (requisicao.status !== 'pendente') {
      return NextResponse.json({ 
        error: 'Apenas requisições pendentes podem ser aprovadas/rejeitadas' 
      }, { status: 400 });
    }

    // Se for aprovação, verificar estoque disponível
    if (acao === 'aprovar') {
      for (const itemReq of requisicao.requisicoes_itens) {
        const itemData = Array.isArray(itemReq.item) ? itemReq.item[0] : itemReq.item;
        if (itemData && itemData.estoque_atual < itemReq.quantidade_solicitada) {
          return NextResponse.json({ 
            error: `Estoque insuficiente para o item ${itemData.nome}. Disponível: ${itemData.estoque_atual}, Solicitado: ${itemReq.quantidade_solicitada}` 
          }, { status: 400 });
        }
      }
    }

    // Atualizar status da requisição
    const novoStatus = acao === 'aprovar' ? 'aprovada' : 'rejeitada';
    const { data: requisicaoAtualizada, error: updateError } = await supabase
      .from('requisicoes')
      .update({
        status: novoStatus,
        matricula_aprovador: authResult.user?.matricula,
        data_aprovacao: new Date().toISOString(),
        observacoes_aprovacao,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        solicitante:usuarios!requisicoes_matricula_solicitante_fkey(matricula, nome),
        aprovador:usuarios!requisicoes_matricula_aprovador_fkey(matricula, nome),
        itens:requisicoes_itens(
          id,
          quantidade_solicitada,
          preco_unitario,
          subtotal,
          item:itens_almoxarifado(id, nome, categoria, imagem_url)
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
      message: acao === 'aprovar' ? 'Requisição aprovada com sucesso' : 'Requisição rejeitada'
    });

  } catch (error) {
    console.error('Erro na API de aprovação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}