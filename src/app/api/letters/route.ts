import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';
import { userHasFunctionality } from '@/lib/permissions-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const LETTERS_MANAGE_FUNCTIONALITY_SLUG = 'letras-gestao';

type AuthenticatedUser = NonNullable<Awaited<ReturnType<typeof verifyJWTToken>>['user']>;

async function hasLettersManagementPermission(user: AuthenticatedUser) {
  try {
    return await userHasFunctionality(user, LETTERS_MANAGE_FUNCTIONALITY_SLUG);
  } catch (error) {
    console.error('Erro ao verificar funcionalidade letras-gestao:', error);
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

// GET - Buscar letras
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Usuario nao autenticado' }, { status: 401 });
    }

    const hasPermission = await hasLettersManagementPermission(authResult.user);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const contratoRaiz = await getUserContract(authResult.user.matricula);
    if (!contratoRaiz) {
      return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 });
    }

    const { data: letras, error } = await supabase
      .from('letras')
      .select(`
        id,
        letra,
        codigo_contrato,
        lider,
        created_at,
        usuarios!letras_lider_fkey(nome)
      `)
      .eq('codigo_contrato', contratoRaiz)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(letras);
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar nova letra
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Usuario nao autenticado' }, { status: 401 });
    }

    const hasPermission = await hasLettersManagementPermission(authResult.user);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const contratoRaiz = await getUserContract(authResult.user.matricula);
    if (!contratoRaiz) {
      return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 });
    }

    const { letra, lider } = await request.json();

    if (!letra || !lider) {
      return NextResponse.json({ error: 'Letra e lider sao obrigatorios' }, { status: 400 });
    }

    const letraUpperCase = String(letra).toUpperCase();

    const { data: existingLetter, error: existingLetterError } = await supabase
      .from('letras')
      .select('id')
      .eq('letra', letraUpperCase)
      .eq('codigo_contrato', contratoRaiz)
      .single();

    if (existingLetterError && existingLetterError.code !== 'PGRST116') {
      return NextResponse.json({ error: existingLetterError.message }, { status: 500 });
    }

    if (existingLetter) {
      return NextResponse.json({ error: 'Esta letra ja existe para este contrato' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('letras')
      .insert({
        letra: letraUpperCase,
        codigo_contrato: contratoRaiz,
        lider
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT - Atualizar letra
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Usuario nao autenticado' }, { status: 401 });
    }

    const hasPermission = await hasLettersManagementPermission(authResult.user);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id, letra, lider } = await request.json();

    if (!id || !letra || !lider) {
      return NextResponse.json({ error: 'ID, letra e lider sao obrigatorios' }, { status: 400 });
    }

    const contratoRaiz = await getUserContract(authResult.user.matricula);
    if (!contratoRaiz) {
      return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 });
    }

    const { data: existingLetter, error: letterError } = await supabase
      .from('letras')
      .select('codigo_contrato')
      .eq('id', id)
      .single();

    if (letterError || !existingLetter) {
      return NextResponse.json({ error: 'Letra nao encontrada' }, { status: 404 });
    }

    if (existingLetter.codigo_contrato !== contratoRaiz) {
      return NextResponse.json({ error: 'Sem permissao para editar esta letra' }, { status: 403 });
    }

    const letraUpperCase = String(letra).toUpperCase();

    const { data: duplicateLetter, error: duplicateLetterError } = await supabase
      .from('letras')
      .select('id')
      .eq('letra', letraUpperCase)
      .eq('codigo_contrato', contratoRaiz)
      .neq('id', id)
      .single();

    if (duplicateLetterError && duplicateLetterError.code !== 'PGRST116') {
      return NextResponse.json({ error: duplicateLetterError.message }, { status: 500 });
    }

    if (duplicateLetter) {
      return NextResponse.json({ error: 'Ja existe outra letra com este nome para este contrato' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('letras')
      .update({ letra: letraUpperCase, lider })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE - Excluir letra
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Usuario nao autenticado' }, { status: 401 });
    }

    const hasPermission = await hasLettersManagementPermission(authResult.user);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID e obrigatorio' }, { status: 400 });
    }

    const contratoRaiz = await getUserContract(authResult.user.matricula);
    if (!contratoRaiz) {
      return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 });
    }

    const { data: existingLetter, error: letterError } = await supabase
      .from('letras')
      .select('codigo_contrato')
      .eq('id', id)
      .single();

    if (letterError || !existingLetter) {
      return NextResponse.json({ error: 'Letra nao encontrada' }, { status: 404 });
    }

    if (existingLetter.codigo_contrato !== contratoRaiz) {
      return NextResponse.json({ error: 'Sem permissao para excluir esta letra' }, { status: 403 });
    }

    const { error } = await supabase
      .from('letras')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Letra excluida com sucesso' });
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
