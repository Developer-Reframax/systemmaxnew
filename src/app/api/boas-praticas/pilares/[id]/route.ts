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

    return NextResponse.json({ success: true, data: pilar });
  } catch (error) {
    console.error('Erro na API de pilar:', error);
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

    const { data: pilarExistente } = await supabase
      .from('boaspraticas_pilar')
      .select('id')
      .eq('id', id)
      .single();

    if (!pilarExistente) {
      return NextResponse.json({ error: 'Pilar não encontrado' }, { status: 404 });
    }

    const { data: pilarComMesmoNome } = await supabase
      .from('boaspraticas_pilar')
      .select('id')
      .eq('nome', nome)
      .neq('id', id)
      .single();

    if (pilarComMesmoNome) {
      return NextResponse.json({ error: 'Já existe um pilar com este nome' }, { status: 409 });
    }

    const { data: pilarAtualizado, error: updateError } = await supabase
      .from('boaspraticas_pilar')
      .update({ nome, descricao })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar pilar:', updateError);
      return NextResponse.json({ error: 'Erro ao atualizar pilar' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: pilarAtualizado });
  } catch (error) {
    console.error('Erro na API de atualização de pilar:', error);
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

    const { data: pilar } = await supabase
      .from('boaspraticas_pilar')
      .select('id')
      .eq('id', id)
      .single();

    if (!pilar) {
      return NextResponse.json({ error: 'Pilar não encontrado' }, { status: 404 });
    }

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

    const { error: deleteError } = await supabase
      .from('boaspraticas_pilar')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erro ao excluir pilar:', deleteError);
      return NextResponse.json({ error: 'Erro ao excluir pilar' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Pilar excluído com sucesso' });
  } catch (error) {
    console.error('Erro na API de exclusão de pilar:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
