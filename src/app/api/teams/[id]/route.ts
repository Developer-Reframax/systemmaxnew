import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';
import { userHasFunctionality } from '@/lib/permissions-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TEAMS_MANAGE_FUNCTIONALITY_SLUG = 'equipes-gestao';

type AuthenticatedUser = NonNullable<Awaited<ReturnType<typeof verifyJWTToken>>['user']>;

async function hasTeamsManagementPermission(user: AuthenticatedUser) {
  try {
    return await userHasFunctionality(user, TEAMS_MANAGE_FUNCTIONALITY_SLUG);
  } catch (error) {
    console.error('Erro ao verificar funcionalidade equipes-gestao:', error);
    return false;
  }
}

async function getUserContract(matricula: number | string) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('contrato_raiz')
    .eq('matricula', matricula)
    .single();

  if (error || !data) {
    return null;
  }

  return data.contrato_raiz;
}

// PUT - Atualizar equipe
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await verifyJWTToken(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Usuario nao autenticado' }, { status: 401 });
    }

    const hasPermission = await hasTeamsManagementPermission(authResult.user);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const contratoRaiz = await getUserContract(authResult.user.matricula);
    if (!contratoRaiz) {
      return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { equipe, supervisor } = body;
    const { id } = await params;

    if (!equipe || !supervisor) {
      return NextResponse.json({ error: 'Equipe e supervisor sao obrigatorios' }, { status: 400 });
    }

    const { data: equipeExistente, error: equipeError } = await supabase
      .from('equipes')
      .select('codigo_contrato')
      .eq('id', id)
      .single();

    if (equipeError || !equipeExistente) {
      return NextResponse.json({ error: 'Equipe nao encontrada' }, { status: 404 });
    }

    if (equipeExistente.codigo_contrato !== contratoRaiz) {
      return NextResponse.json({ error: 'Voce nao tem permissao para editar esta equipe' }, { status: 403 });
    }

    const equipeUpperCase = String(equipe).toUpperCase();

    const { data: existingEquipe, error: checkError } = await supabase
      .from('equipes')
      .select('id')
      .eq('equipe', equipeUpperCase)
      .eq('codigo_contrato', contratoRaiz)
      .neq('id', id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Erro ao verificar equipe existente' }, { status: 500 });
    }

    if (existingEquipe) {
      return NextResponse.json({ error: 'Ja existe uma equipe com este nome' }, { status: 400 });
    }

    const { data: equipeAtualizada, error } = await supabase
      .from('equipes')
      .update({
        equipe: equipeUpperCase,
        supervisor
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(equipeAtualizada);
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE - Excluir equipe
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await verifyJWTToken(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Usuario nao autenticado' }, { status: 401 });
    }

    const hasPermission = await hasTeamsManagementPermission(authResult.user);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const contratoRaiz = await getUserContract(authResult.user.matricula);
    if (!contratoRaiz) {
      return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 });
    }

    const { id } = await params;

    const { data: equipeExistente, error: equipeError } = await supabase
      .from('equipes')
      .select('codigo_contrato')
      .eq('id', id)
      .single();

    if (equipeError || !equipeExistente) {
      return NextResponse.json({ error: 'Equipe nao encontrada' }, { status: 404 });
    }

    if (equipeExistente.codigo_contrato !== contratoRaiz) {
      return NextResponse.json({ error: 'Voce nao tem permissao para excluir esta equipe' }, { status: 403 });
    }

    const { error } = await supabase
      .from('equipes')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Equipe excluida com sucesso' });
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
