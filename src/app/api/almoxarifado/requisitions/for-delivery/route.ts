import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/almoxarifado/requisitions/for-delivery - Listar requisições aprovadas pendentes de entrega
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Parâmetros de consulta
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Construir query para requisições relevantes para entrega (aprovadas, entregues e parcialmente entregues)
    let query = supabase
      .from('requisicoes')
      .select(`
        *,
        solicitante:usuarios!matricula_solicitante(matricula, nome),
        aprovador:usuarios!matricula_aprovador(matricula, nome),
        entregue_por:usuarios!matricula_entregador(matricula, nome),
        itens:requisicoes_itens(
          id,
          quantidade_solicitada,
          quantidade_entregue,
          preco_unitario,
          subtotal,
          item:itens_almoxarifado(id, nome, categoria, imagem_url)
        )
      `, { count: 'exact' })
      .in('status', ['pendente', 'aprovada', 'entregue', 'parcialmente_entregue']) // Incluir todos os status relevantes
      .order('data_aprovacao', { ascending: true }); // Ordenar por data de aprovação (mais antigas primeiro)

    // Aplicar paginação
    query = query.range(offset, offset + limit - 1);

    const { data: requisicoes, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar requisições para entrega:', error);
      return NextResponse.json({ error: 'Erro ao buscar requisições para entrega' }, { status: 500 });
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
    console.error('Erro interno ao buscar requisições para entrega:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}