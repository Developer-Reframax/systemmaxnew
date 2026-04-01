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
      .from('boaspraticas_tags_catalogo')
      .select('*', { count: 'exact' })
      .order('nome');

    if (search) {
      query = query.or(`nome.ilike.%${search}%,descricao.ilike.%${search}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: tags, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar tags do catalogo:', error);
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: tags,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Erro na API de tags do catalogo:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await ensureGestaoGeralAccess(request);
    if (!access.authorized) return access.response;

    const body = await request.json();
    const { nome, descricao, cor } = body;

    const formatName = (value: unknown) => {
      const text = typeof value === 'string' ? value.trim() : '';
      if (!text) return '';
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    };

    const normalizedName = formatName(nome);

    if (!normalizedName) {
      return NextResponse.json({ error: 'Campo obrigatorio: nome' }, { status: 400 });
    }

    const { data: tagExistente } = await supabase
      .from('boaspraticas_tags_catalogo')
      .select('id')
      .eq('nome', normalizedName)
      .single();

    if (tagExistente) {
      return NextResponse.json({ error: 'Ja existe uma tag do catalogo com este nome' }, { status: 409 });
    }

    const { data: novaTag, error: insertError } = await supabase
      .from('boaspraticas_tags_catalogo')
      .insert({
        nome: normalizedName,
        descricao,
        cor: cor || '#6B7280'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir tag do catalogo:', insertError);
      return NextResponse.json({ error: 'Erro ao criar tag do catalogo' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: novaTag }, { status: 201 });
  } catch (error) {
    console.error('Erro na API de criacao de tag do catalogo:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
