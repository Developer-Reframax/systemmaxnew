import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PUT /api/almoxarifado/requisicoes/[id]/rejeitar - Rejeitar requisição
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
    const { observacoes_aprovacao } = body;

    const { id } = await params;

    // Buscar requisição
    const { data: requisicao, error: fetchError } = await supabase
      .from('requisicoes')
      .select('id, status')
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
        error: 'Apenas requisições pendentes podem ser rejeitadas' 
      }, { status: 400 });
    }

    // Atualizar status da requisição para rejeitada
    const { data: requisicaoAtualizada, error: updateError } = await supabase
      .from('requisicoes')
      .update({
        status: 'rejeitada',
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
      return NextResponse.json({ error: 'Erro ao rejeitar requisição' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: requisicaoAtualizada,
      message: 'Requisição rejeitada com sucesso'
    });

  } catch (error) {
    console.error('Erro na API de rejeição:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}