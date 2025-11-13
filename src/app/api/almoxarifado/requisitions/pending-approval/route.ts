import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/almoxarifado/requisitions/pending-approval - Listar requisições pendentes de aprovação
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

    // Construir query para requisições pendentes de aprovação
    let query = supabase
      .from('requisicoes')
      .select(`
        *,
        solicitante:usuarios!matricula_solicitante(matricula, nome),
        itens:requisicoes_itens(
          id,
          quantidade_solicitada,
          item_id,
          item:itens_almoxarifado(id, nome, categoria, imagem_url)
        )
      `, { count: 'exact' })
      .eq('status', 'pendente') // Filtrar apenas requisições pendentes
      .order('created_at', { ascending: false });

    // Aplicar paginação
    query = query.range(offset, offset + limit - 1);

    const { data: requisicoes, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar requisições pendentes:', error);
      return NextResponse.json({ error: 'Erro ao buscar requisições pendentes' }, { status: 500 });
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
    console.error('Erro interno ao buscar requisições pendentes:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}