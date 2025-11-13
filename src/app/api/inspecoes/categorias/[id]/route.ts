import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/inspecoes/categorias/[id] - Buscar categoria por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id } = await params;

    // Buscar categoria
    const { data: categoria, error } = await supabase
      .from('categorias_inspecao')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
      }
      console.error('Erro ao buscar categoria:', error);
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: categoria
    });

  } catch (error) {
    console.error('Erro na API de categoria:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT /api/inspecoes/categorias/[id] - Atualizar categoria
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Verificar se o usuário tem permissão (Admin ou Editor)
    if (!authResult.user?.role || !['Admin', 'Editor'].includes(authResult.user.role)) {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores e editores podem editar categorias.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { nome, descricao } = body;

    // Validar campos obrigatórios
    if (!nome) {
      return NextResponse.json({ 
        error: 'Campo obrigatório: nome' 
      }, { status: 400 });
    }

    // Verificar se a categoria existe
    const { data: categoriaExistente } = await supabase
      .from('categorias_inspecao')
      .select('id')
      .eq('id', id)
      .single();

    if (!categoriaExistente) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
    }

    // Verificar se já existe outra categoria com o mesmo nome
    const { data: categoriaComMesmoNome } = await supabase
      .from('categorias_inspecao')
      .select('id')
      .eq('nome', nome)
      .neq('id', id)
      .single();

    if (categoriaComMesmoNome) {
      return NextResponse.json({ 
        error: 'Já existe uma categoria com este nome' 
      }, { status: 409 });
    }

    // Atualizar categoria
    const { data: categoriaAtualizada, error: updateError } = await supabase
      .from('categorias_inspecao')
      .update({
        nome,
        descricao
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar categoria:', updateError);
      return NextResponse.json({ error: 'Erro ao atualizar categoria' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: categoriaAtualizada
    });

  } catch (error) {
    console.error('Erro na API de atualização de categoria:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE /api/inspecoes/categorias/[id] - Excluir categoria
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Verificar se o usuário tem permissão (Admin)
    if (!authResult.user?.role || authResult.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem excluir categorias.' }, { status: 403 });
    }

    const { id } = await params;

    // Verificar se a categoria existe
    const { data: categoria } = await supabase
      .from('categorias_inspecao')
      .select('id')
      .eq('id', id)
      .single();

    if (!categoria) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
    }

    // Verificar se existem formulários vinculados a esta categoria
    const { data: formulariosVinculados } = await supabase
      .from('formularios_inspecao')
      .select('id')
      .eq('categoria_id', id)
      .limit(1);

    if (formulariosVinculados && formulariosVinculados.length > 0) {
      return NextResponse.json({ 
        error: 'Não é possível excluir esta categoria pois existem formulários vinculados a ela' 
      }, { status: 409 });
    }

    // Excluir categoria
    const { error: deleteError } = await supabase
      .from('categorias_inspecao')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erro ao excluir categoria:', deleteError);
      return NextResponse.json({ error: 'Erro ao excluir categoria' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Categoria excluída com sucesso'
    });

  } catch (error) {
    console.error('Erro na API de exclusão de categoria:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}