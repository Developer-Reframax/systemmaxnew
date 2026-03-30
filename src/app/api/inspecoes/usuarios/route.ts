import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeNullableString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

// GET /api/inspecoes/usuarios - Listar usuarios disponiveis
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticacao
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }
    const contratoRaiz = authResult.user?.contrato_raiz;
    if (!contratoRaiz) {
      return NextResponse.json({ error: 'Contrato do usuario nao informado' }, { status: 400 });
    }

    // Parametros de consulta
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const ativo = searchParams.get('ativo');
    const role = searchParams.get('role');

    // Construir query
    let query = supabase
      .from('usuarios')
      .select('matricula, nome, email, role, status', { count: 'exact' })
      .order('nome', { ascending: true });

    // Filtrar por contrato_raiz do usuario
    query = query.eq('contrato_raiz', contratoRaiz);

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

    const { data: usuarios, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar usuarios:', error);
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }

    const usuariosNormalizados = (usuarios || []).map((usuario) => ({
      matricula: usuario?.matricula != null ? String(usuario.matricula) : '',
      nome: normalizeNullableString(usuario?.nome),
      email: normalizeNullableString(usuario?.email),
      role: normalizeNullableString(usuario?.role),
      status: normalizeNullableString(usuario?.status)
    }))
      .filter((usuario) => usuario.matricula !== '');

    const total = count ?? usuariosNormalizados.length;

    return NextResponse.json({
      success: true,
      data: usuariosNormalizados,
      pagination: {
        page: 1,
        limit: total,
        total,
        totalPages: 1
      }
    });
  } catch (error) {
    console.error('Erro na API de usuarios:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
