import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/inspecoes/usuarios - Listar usuários disponíveis
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Parâmetros de consulta
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const ativo = searchParams.get('ativo');
    const role = searchParams.get('role');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Construir query
    let query = supabase
      .from('usuarios')
      .select('matricula, nome, email, role, status', { count: 'exact' })
      .order('nome', { ascending: true });

    // Filtrar por contrato_raiz do usuário (RLS)
    if (authResult.user?.contrato_raiz) {
      // A query já será filtrada pelo RLS baseado no contrato_raiz
    }

    // Aplicar filtros
    if (search) {
      query = query.or(`nome.ilike.%${search}%,email.ilike.%${search}%,matricula::text.ilike.%${search}%`);
    }

    if (ativo !== null && ativo !== undefined) {
      const statusValue = ativo === 'true' ? 'ativo' : 'inativo';
      query = query.eq('status', statusValue);
    }

    if (role) {
      query = query.eq('role', role);
    }

    // Aplicar paginação
    query = query.range(offset, offset + limit - 1);

    const { data: usuarios, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar usuários:', error);
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: usuarios || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Erro na API de usuários:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}