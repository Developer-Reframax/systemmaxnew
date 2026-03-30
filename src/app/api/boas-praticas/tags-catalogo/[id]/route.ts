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

    return NextResponse.json({ success: true, data: tag });
  } catch (error) {
    console.error('Erro na API de tag do catálogo:', error);
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
    const { nome, descricao, cor } = body;

    if (!nome) {
      return NextResponse.json({ error: 'Campo obrigatório: nome' }, { status: 400 });
    }

    const { data: tagExistente } = await supabase
      .from('boaspraticas_tags_catalogo')
      .select('id')
      .eq('id', id)
      .single();

    if (!tagExistente) {
      return NextResponse.json({ error: 'Tag do catálogo não encontrada' }, { status: 404 });
    }

    const { data: tagComMesmoNome } = await supabase
      .from('boaspraticas_tags_catalogo')
      .select('id')
      .eq('nome', nome)
      .neq('id', id)
      .single();

    if (tagComMesmoNome) {
      return NextResponse.json({ error: 'Já existe uma tag do catálogo com este nome' }, { status: 409 });
    }

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

    return NextResponse.json({ success: true, data: tagAtualizada });
  } catch (error) {
    console.error('Erro na API de atualização de tag do catálogo:', error);
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

    const { data: tag } = await supabase
      .from('boaspraticas_tags_catalogo')
      .select('id')
      .eq('id', id)
      .single();

    if (!tag) {
      return NextResponse.json({ error: 'Tag do catálogo não encontrada' }, { status: 404 });
    }

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

    const { error: deleteError } = await supabase
      .from('boaspraticas_tags_catalogo')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erro ao excluir tag do catálogo:', deleteError);
      return NextResponse.json({ error: 'Erro ao excluir tag do catálogo' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Tag do catálogo excluída com sucesso' });
  } catch (error) {
    console.error('Erro na API de exclusão de tag do catálogo:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
