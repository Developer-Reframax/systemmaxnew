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
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('boaspraticas_elimina_desperdicio')
      .select('*', { count: 'exact' })
      .order('nome');

    if (search) {
      query = query.or(`nome.ilike.%${search}%,descricao.ilike.%${search}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: opcoes, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar opções de eliminação de desperdício:', error);
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: opcoes,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Erro na API de eliminação de desperdício:', error);
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

    const { data: opcaoExistente } = await supabase
      .from('boaspraticas_elimina_desperdicio')
      .select('id')
      .eq('nome', nome)
      .single();

    if (opcaoExistente) {
      return NextResponse.json({
        error: 'Já existe uma opção de eliminação de desperdício com este nome'
      }, { status: 409 });
    }

    const { data: novaOpcao, error: insertError } = await supabase
      .from('boaspraticas_elimina_desperdicio')
      .insert({ nome, descricao })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir opção de eliminação de desperdício:', insertError);
      return NextResponse.json({ error: 'Erro ao criar opção de eliminação de desperdício' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: novaOpcao }, { status: 201 });
  } catch (error) {
    console.error('Erro na API de criação de opção de eliminação de desperdício:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
