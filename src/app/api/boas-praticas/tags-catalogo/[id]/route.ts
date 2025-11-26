import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/boas-praticas/tags-catalogo/[id] - Buscar tag por ID
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

    // Buscar tag do catálogo
    const { data: tag, error } = await supabase
      .from('boaspraticas_tags_catalogo')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Tag do catálogo não encontrada' }, { status: 404 });
      }
      console.error('Erro ao buscar tag do catálogo:', error);
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: tag
    });

  } catch (error) {
    console.error('Erro na API de tag do catálogo:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT /api/boas-praticas/tags-catalogo/[id] - Atualizar tag
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
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores e editores podem editar tags do catálogo.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { nome, descricao, cor } = body;

    // Validar campos obrigatórios
    if (!nome) {
      return NextResponse.json({ 
        error: 'Campo obrigatório: nome' 
      }, { status: 400 });
    }

    // Verificar se a tag existe
    const { data: tagExistente } = await supabase
      .from('boaspraticas_tags_catalogo')
      .select('id')
      .eq('id', id)
      .single();

    if (!tagExistente) {
      return NextResponse.json({ error: 'Tag do catálogo não encontrada' }, { status: 404 });
    }

    // Verificar se já existe outra tag com o mesmo nome
    const { data: tagComMesmoNome } = await supabase
      .from('boaspraticas_tags_catalogo')
      .select('id')
      .eq('nome', nome)
      .neq('id', id)
      .single();

    if (tagComMesmoNome) {
      return NextResponse.json({ 
        error: 'Já existe uma tag do catálogo com este nome' 
      }, { status: 409 });
    }

    // Atualizar tag
    const { data: tagAtualizada, error: updateError } = await supabase
      .from('boaspraticas_tags_catalogo')
      .update({
        nome,
        descricao,
        cor: cor || '#6B7280'
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar tag do catálogo:', updateError);
      return NextResponse.json({ error: 'Erro ao atualizar tag do catálogo' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: tagAtualizada
    });

  } catch (error) {
    console.error('Erro na API de atualização de tag do catálogo:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE /api/boas-praticas/tags-catalogo/[id] - Excluir tag
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
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem excluir tags do catálogo.' }, { status: 403 });
    }

    const { id } = await params;

    // Verificar se a tag existe
    const { data: tag } = await supabase
      .from('boaspraticas_tags_catalogo')
      .select('id')
      .eq('id', id)
      .single();

    if (!tag) {
      return NextResponse.json({ error: 'Tag do catálogo não encontrada' }, { status: 404 });
    }

    // Verificar se existem boas práticas vinculadas a esta tag (através da tabela de relacionamento)
    const { data: boasPraticasVinculadas } = await supabase
      .from('boaspraticas_tags')
      .select('id')
      .eq('tag_id', id)
      .limit(1);

    if (boasPraticasVinculadas && boasPraticasVinculadas.length > 0) {
      return NextResponse.json({ 
        error: 'Não é possível excluir esta tag pois existem boas práticas vinculadas a ela' 
      }, { status: 409 });
    }

    // Excluir tag
    const { error: deleteError } = await supabase
      .from('boaspraticas_tags_catalogo')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erro ao excluir tag do catálogo:', deleteError);
      return NextResponse.json({ error: 'Erro ao excluir tag do catálogo' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Tag do catálogo excluída com sucesso'
    });

  } catch (error) {
    console.error('Erro na API de exclusão de tag do catálogo:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}