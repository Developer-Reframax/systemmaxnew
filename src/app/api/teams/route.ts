import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Buscar equipes
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Usuário não autenticado' }, { status: 401 })
    }

    // Buscar o contrato_raiz do usuário logado
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('contrato_raiz')
      .eq('matricula', authResult.user.matricula)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Buscar equipes do mesmo contrato_raiz
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
      .eq('codigo_contrato', userData.contrato_raiz)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(equipes);
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar nova equipe
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Usuário não autenticado' }, { status: 401 })
    }

    // Verificar se o usuário tem permissão (Admin ou Editor)
    if (!['Admin', 'Editor'].includes(authResult.user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Buscar o contrato_raiz do usuário logado
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('contrato_raiz')
      .eq('matricula', authResult.user.matricula)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const body = await request.json()
    const { equipe, supervisor } = body

    if (!equipe || !supervisor) {
      return NextResponse.json({ error: 'Equipe e supervisor são obrigatórios' }, { status: 400 })
    }

    // Converter equipe para caixa alta
    const equipeUpperCase = equipe.toUpperCase();

    // Verificar se já existe uma equipe com o mesmo nome no mesmo contrato
    const { data: existingEquipe, error: checkError } = await supabase
      .from('equipes')
      .select('id')
      .eq('equipe', equipeUpperCase)
      .eq('codigo_contrato', userData.contrato_raiz)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Erro ao verificar equipe existente' }, { status: 500 });
    }

    if (existingEquipe) {
      return NextResponse.json({ error: 'Já existe uma equipe com este nome' }, { status: 400 });
    }

    // Criar nova equipe
    const { data: novaEquipe, error } = await supabase
      .from('equipes')
      .insert({
        equipe: equipeUpperCase,
        codigo_contrato: userData.contrato_raiz,
        supervisor: supervisor
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
