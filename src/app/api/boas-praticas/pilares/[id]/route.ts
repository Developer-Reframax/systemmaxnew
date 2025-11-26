import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/boas-praticas/pilares/[id] - Buscar pilar por ID
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

    // Buscar pilar
    const { data: pilar, error } = await supabase
      .from('boaspraticas_pilar')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Pilar não encontrado' }, { status: 404 });
      }
      console.error('Erro ao buscar pilar:', error);
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: pilar
    });

  } catch (error) {
    console.error('Erro na API de pilar:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT /api/boas-praticas/pilares/[id] - Atualizar pilar
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
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores e editores podem editar pilares.' }, { status: 403 });
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

    // Verificar se o pilar existe
    const { data: pilarExistente } = await supabase
      .from('boaspraticas_pilar')
      .select('id')
      .eq('id', id)
      .single();

    if (!pilarExistente) {
      return NextResponse.json({ error: 'Pilar não encontrado' }, { status: 404 });
    }

    // Verificar se já existe outro pilar com o mesmo nome
    const { data: pilarComMesmoNome } = await supabase
      .from('boaspraticas_pilar')
      .select('id')
      .eq('nome', nome)
      .neq('id', id)
      .single();

    if (pilarComMesmoNome) {
      return NextResponse.json({ 
        error: 'Já existe um pilar com este nome' 
      }, { status: 409 });
    }

    // Atualizar pilar
    const { data: pilarAtualizado, error: updateError } = await supabase
      .from('boaspraticas_pilar')
      .update({
        nome,
        descricao
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar pilar:', updateError);
      return NextResponse.json({ error: 'Erro ao atualizar pilar' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: pilarAtualizado
    });

  } catch (error) {
    console.error('Erro na API de atualização de pilar:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE /api/boas-praticas/pilares/[id] - Excluir pilar
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
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem excluir pilares.' }, { status: 403 });
    }

    const { id } = await params;

    // Verificar se o pilar existe
    const { data: pilar } = await supabase
      .from('boaspraticas_pilar')
      .select('id')
      .eq('id', id)
      .single();

    if (!pilar) {
      return NextResponse.json({ error: 'Pilar não encontrado' }, { status: 404 });
    }

    // Verificar se existem boas práticas vinculadas a este pilar
    const { data: boasPraticasVinculadas } = await supabase
      .from('boaspraticas')
      .select('id')
      .eq('pilar_id', id)
      .limit(1);

    if (boasPraticasVinculadas && boasPraticasVinculadas.length > 0) {
      return NextResponse.json({ 
        error: 'Não é possível excluir este pilar pois existem boas práticas vinculadas a ele' 
      }, { status: 409 });
    }

    // Excluir pilar
    const { error: deleteError } = await supabase
      .from('boaspraticas_pilar')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erro ao excluir pilar:', deleteError);
      return NextResponse.json({ error: 'Erro ao excluir pilar' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Pilar excluído com sucesso'
    });

  } catch (error) {
    console.error('Erro na API de exclusão de pilar:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}