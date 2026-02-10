import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/boas-praticas/categorias - Listar categorias
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Construir query
    let query = supabase
      .from('boaspraticas_categoria')
      .select('*', { count: 'exact' })
      .order('nome');

    // Aplicar filtro de busca
    if (search) {
      query = query.or(`nome.ilike.%${search}%,descricao.ilike.%${search}%`);
    }

    // Aplicar paginação
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

// POST /api/boas-praticas/categorias - Criar nova categoria
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Verificar se o usuário tem permissão (Admin ou Editor)
    if (!authResult.user?.role || !['Admin', 'Editor'].includes(authResult.user.role)) {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores e editores podem criar categorias.' }, { status: 403 });
    }

    const body = await request.json();
    const { nome, descricao } = body;

    // Validar campos obrigatórios
    if (!nome) {
      return NextResponse.json({ 
        error: 'Campo obrigatório: nome' 
      }, { status: 400 });
    }

    // Verificar se já existe categoria com o mesmo nome
    const { data: categoriaExistente } = await supabase
      .from('boaspraticas_categoria')
      .select('id')
      .eq('nome', nome)
      .single();

    if (categoriaExistente) {
      return NextResponse.json({ 
        error: 'Já existe uma categoria com este nome' 
      }, { status: 409 });
    }

    // Inserir categoria
    const { data: novaCategoria, error: insertError } = await supabase
      .from('boaspraticas_categoria')
      .insert({
        nome,
        descricao
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir categoria:', insertError);
      return NextResponse.json({ error: 'Erro ao criar categoria' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: novaCategoria
    }, { status: 201 });

  } catch (error) {
    console.error('Erro na API de criação de categoria:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}