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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await ensureGestaoGeralAccess(request);
    if (!access.authorized) return access.response;

    const { id } = await params;

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

    return NextResponse.json({ success: true, data: opcao });
  } catch (error) {
    console.error('Erro na API de opção de eliminação de desperdício:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await ensureGestaoGeralAccess(request);
    if (!access.authorized) return access.response;

    const { id } = await params;
    const body = await request.json();
    const { nome, descricao } = body;

    if (!nome) {
      return NextResponse.json({ error: 'Campo obrigatório: nome' }, { status: 400 });
    }

    const { data: opcaoExistente } = await supabase
      .from('boaspraticas_elimina_desperdicio')
      .select('id')
      .eq('id', id)
      .single();

    if (!opcaoExistente) {
      return NextResponse.json({ error: 'Opção de eliminação de desperdício não encontrada' }, { status: 404 });
    }

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

    const { data: opcaoAtualizada, error: updateError } = await supabase
      .from('boaspraticas_elimina_desperdicio')
      .update({ nome, descricao })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar opção de eliminação de desperdício:', updateError);
      return NextResponse.json({ error: 'Erro ao atualizar opção de eliminação de desperdício' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: opcaoAtualizada });
  } catch (error) {
    console.error('Erro na API de atualização de opção de eliminação de desperdício:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await ensureGestaoGeralAccess(request);
    if (!access.authorized) return access.response;

    const { id } = await params;

    const { data: opcao } = await supabase
      .from('boaspraticas_elimina_desperdicio')
      .select('id')
      .eq('id', id)
      .single();

    if (!opcao) {
      return NextResponse.json({ error: 'Opção de eliminação de desperdício não encontrada' }, { status: 404 });
    }

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
