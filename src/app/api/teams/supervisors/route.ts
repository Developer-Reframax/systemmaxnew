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

// GET - Buscar supervisores do mesmo contrato_raiz
export async function GET(request: NextRequest) {
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

    const { data: supervisores, error } = await supabase
      .from('usuarios')
      .select('matricula, nome')
      .eq('contrato_raiz', contratoRaiz)
      .eq('status', 'ativo')
      .order('nome', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(supervisores);
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
