import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/boas-praticas/elimina-desperdicio/[id] - Buscar opção por ID
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

    // Buscar opção de eliminação de desperdício
    const { data: opcao, error } = await supabase
      .from('boaspraticas_elimina_desperdicio')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Opção de eliminação de desperdício não encontrada' }, { status: 404 });
      }
      console.error('Erro ao buscar opção de eliminação de desperdício:', error);
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: opcao
    });

  } catch (error) {
    console.error('Erro na API de opção de eliminação de desperdício:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT /api/boas-praticas/elimina-desperdicio/[id] - Atualizar opção
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
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores e editores podem editar opções de eliminação de desperdício.' }, { status: 403 });
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

    // Verificar se a opção existe
    const { data: opcaoExistente } = await supabase
      .from('boaspraticas_elimina_desperdicio')
      .select('id')
      .eq('id', id)
      .single();

    if (!opcaoExistente) {
      return NextResponse.json({ error: 'Opção de eliminação de desperdício não encontrada' }, { status: 404 });
    }

    // Verificar se já existe outra opção com o mesmo nome
    const { data: opcaoComMesmoNome } = await supabase
      .from('boaspraticas_elimina_desperdicio')
      .select('id')
      .eq('nome', nome)
      .neq('id', id)
      .single();

    if (opcaoComMesmoNome) {
      return NextResponse.json({ 
        error: 'Já existe uma opção de eliminação de desperdício com este nome' 
      }, { status: 409 });
    }

    // Atualizar opção
    const { data: opcaoAtualizada, error: updateError } = await supabase
      .from('boaspraticas_elimina_desperdicio')
      .update({
        nome,
        descricao
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar opção de eliminação de desperdício:', updateError);
      return NextResponse.json({ error: 'Erro ao atualizar opção de eliminação de desperdício' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: opcaoAtualizada
    });

  } catch (error) {
    console.error('Erro na API de atualização de opção de eliminação de desperdício:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE /api/boas-praticas/elimina-desperdicio/[id] - Excluir opção
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
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem excluir opções de eliminação de desperdício.' }, { status: 403 });
    }

    const { id } = await params;

    // Verificar se a opção existe
    const { data: opcao } = await supabase
      .from('boaspraticas_elimina_desperdicio')
      .select('id')
      .eq('id', id)
      .single();

    if (!opcao) {
      return NextResponse.json({ error: 'Opção de eliminação de desperdício não encontrada' }, { status: 404 });
    }

    // Verificar se existem boas práticas vinculadas a esta opção
    const { data: boasPraticasVinculadas } = await supabase
      .from('boaspraticas')
      .select('id')
      .eq('elimina_desperdicio_id', id)
      .limit(1);

    if (boasPraticasVinculadas && boasPraticasVinculadas.length > 0) {
      return NextResponse.json({ 
        error: 'Não é possível excluir esta opção pois existem boas práticas vinculadas a ela' 
      }, { status: 409 });
    }

    // Excluir opção
    const { error: deleteError } = await supabase
      .from('boaspraticas_elimina_desperdicio')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erro ao excluir opção de eliminação de desperdício:', deleteError);
      return NextResponse.json({ error: 'Erro ao excluir opção de eliminação de desperdício' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Opção de eliminação de desperdício excluída com sucesso'
    });

  } catch (error) {
    console.error('Erro na API de exclusão de opção de eliminação de desperdício:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}