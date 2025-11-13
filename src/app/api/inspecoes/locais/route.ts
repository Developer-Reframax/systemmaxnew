import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/inspecoes/locais - Listar locais disponíveis
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Usuário não autenticado' }, { status: 401 });
    }

    // Buscar o contrato_raiz do usuário logado
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('contrato_raiz')
      .eq('matricula', authResult.user.matricula)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Parâmetros de consulta
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Construir query - filtrar por contrato_raiz do usuário
    let query = supabase
      .from('locais')
      .select('id, local, contrato, created_at, updated_at', { count: 'exact' })
      .eq('contrato', userData.contrato_raiz)
      .order('local', { ascending: true });

    // Aplicar filtros
    if (search) {
      query = query.ilike('local', `%${search}%`);
    }

    // Removido filtro 'ativo' - coluna não existe na tabela locais

    // Aplicar paginação
    query = query.range(offset, offset + limit - 1);

    const { data: locais, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar locais:', error);
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: locais || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Erro na API de locais:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}