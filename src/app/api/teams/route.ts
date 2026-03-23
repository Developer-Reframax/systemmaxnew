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
type SupervisorLookup = { nome: string };
type TeamRow = {
  id: string;
  equipe: string;
  codigo_contrato: string;
  supervisor: string;
  created_at: string;
  usuarios?: SupervisorLookup | SupervisorLookup[] | null;
};

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

// GET - Buscar equipes
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

    const { data: equipes, error } = await supabase
      .from('equipes')
      .select(`
        id,
        equipe,
        codigo_contrato,
        supervisor,
        created_at,
        usuarios!equipes_supervisor_fkey(nome)
      `)
      .eq('codigo_contrato', contratoRaiz)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const equipesNormalizadas = ((equipes || []) as TeamRow[]).map((equipe) => ({
      ...equipe,
      supervisor_nome: Array.isArray(equipe.usuarios) ? equipe.usuarios[0]?.nome ?? null : equipe.usuarios?.nome ?? null
    }));

    return NextResponse.json(equipesNormalizadas);
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar nova equipe
export async function POST(request: NextRequest) {
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

    if (!equipe || !supervisor) {
      return NextResponse.json({ error: 'Equipe e supervisor sao obrigatorios' }, { status: 400 });
    }

    const equipeUpperCase = String(equipe).toUpperCase();

    const { data: existingEquipe, error: checkError } = await supabase
      .from('equipes')
      .select('id')
      .eq('equipe', equipeUpperCase)
      .eq('codigo_contrato', contratoRaiz)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Erro ao verificar equipe existente' }, { status: 500 });
    }

    if (existingEquipe) {
      return NextResponse.json({ error: 'Ja existe uma equipe com este nome' }, { status: 400 });
    }

    const { data: novaEquipe, error } = await supabase
      .from('equipes')
      .insert({
        equipe: equipeUpperCase,
        codigo_contrato: contratoRaiz,
        supervisor
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(novaEquipe, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
