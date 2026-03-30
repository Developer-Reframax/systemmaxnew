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

    const { data: categoria, error } = await supabase
      .from('boaspraticas_categoria')
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

    return NextResponse.json({ success: true, data: categoria });
  } catch (error) {
    console.error('Erro na API de categoria:', error);
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

    const { data: categoriaExistente } = await supabase
      .from('boaspraticas_categoria')
      .select('id')
      .eq('id', id)
      .single();

    if (!categoriaExistente) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
    }

    const { data: categoriaComMesmoNome } = await supabase
      .from('boaspraticas_categoria')
      .select('id')
      .eq('nome', nome)
      .neq('id', id)
      .single();

    if (categoriaComMesmoNome) {
      return NextResponse.json({ error: 'Já existe uma categoria com este nome' }, { status: 409 });
    }

    const { data: categoriaAtualizada, error: updateError } = await supabase
      .from('boaspraticas_categoria')
      .update({ nome, descricao })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar categoria:', updateError);
      return NextResponse.json({ error: 'Erro ao atualizar categoria' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: categoriaAtualizada });
  } catch (error) {
    console.error('Erro na API de atualização de categoria:', error);
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

    const { data: categoria } = await supabase
      .from('boaspraticas_categoria')
      .select('id')
      .eq('id', id)
      .single();

    if (!categoria) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
    }

    const { data: boasPraticasVinculadas } = await supabase
      .from('boaspraticas')
      .select('id')
      .eq('categoria_id', id)
      .limit(1);

    if (boasPraticasVinculadas && boasPraticasVinculadas.length > 0) {
      return NextResponse.json({
        error: 'Não é possível excluir esta categoria pois existem boas práticas vinculadas a ela'
      }, { status: 409 });
    }

    const { error: deleteError } = await supabase
      .from('boaspraticas_categoria')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erro ao excluir categoria:', deleteError);
      return NextResponse.json({ error: 'Erro ao excluir categoria' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Categoria excluída com sucesso' });
  } catch (error) {
    console.error('Erro na API de exclusão de categoria:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
