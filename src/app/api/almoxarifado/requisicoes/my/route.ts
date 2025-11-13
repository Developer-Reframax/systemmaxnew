import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/almoxarifado/requisicoes/my - Listar minhas requisições
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

    // Construir query com joins - filtrar apenas requisições do usuário logado
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
      .eq('matricula_solicitante', authResult.user?.matricula) // Filtrar por matrícula do usuário
      .order('created_at', { ascending: false });

    // Aplicar filtros adicionais
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
      console.error('Erro ao buscar minhas requisições:', error);
      return NextResponse.json({ error: 'Erro ao buscar requisições' }, { status: 500 });
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
    console.error('Erro interno ao buscar minhas requisições:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}