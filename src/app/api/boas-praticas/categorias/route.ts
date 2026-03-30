import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';
import { userHasFunctionality } from '@/lib/permissions-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BOASPRATICAS_GESTAO_GERAL_SLUG = 'boaspraticas-gestao-geral';

async function ensureGestaoGeralAccess(request: NextRequest) {
  const authResult = await verifyJWTToken(request);
  if (!authResult.success) {
    return {
      authorized: false as const,
      response: NextResponse.json({ error: authResult.error }, { status: 401 })
    };
  }

  const allowed = await userHasFunctionality(authResult.user!, BOASPRATICAS_GESTAO_GERAL_SLUG);
  if (!allowed) {
    return {
      authorized: false as const,
      response: NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    };
  }

  return { authorized: true as const };
}

export async function GET(request: NextRequest) {
  try {
    const access = await ensureGestaoGeralAccess(request);
    if (!access.authorized) return access.response;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('boaspraticas_categoria')
      .select('*', { count: 'exact' })
      .order('nome');

    if (search) {
      query = query.or(`nome.ilike.%${search}%,descricao.ilike.%${search}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: categorias, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar categorias:', error);
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: categorias,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Erro na API de categorias:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await ensureGestaoGeralAccess(request);
    if (!access.authorized) return access.response;

    const body = await request.json();
    const { nome, descricao } = body;

    if (!nome) {
      return NextResponse.json({ error: 'Campo obrigatório: nome' }, { status: 400 });
    }

    const { data: categoriaExistente } = await supabase
      .from('boaspraticas_categoria')
      .select('id')
      .eq('nome', nome)
      .single();

    if (categoriaExistente) {
      return NextResponse.json({ error: 'Já existe uma categoria com este nome' }, { status: 409 });
    }

    const { data: novaCategoria, error: insertError } = await supabase
      .from('boaspraticas_categoria')
      .insert({ nome, descricao })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir categoria:', insertError);
      return NextResponse.json({ error: 'Erro ao criar categoria' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: novaCategoria }, { status: 201 });
  } catch (error) {
    console.error('Erro na API de criação de categoria:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
