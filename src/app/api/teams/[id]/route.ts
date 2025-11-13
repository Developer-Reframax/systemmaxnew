import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PUT - Atualizar equipe
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const { id } = await params

    if (!equipe || !supervisor) {
      return NextResponse.json({ error: 'Equipe e supervisor são obrigatórios' }, { status: 400 })
    }

    // Verificar se a equipe pertence ao mesmo contrato_raiz do usuário
    const { data: equipeExistente, error: equipeError } = await supabase
      .from('equipes')
      .select('codigo_contrato')
      .eq('id', id)
      .single();

    if (equipeError || !equipeExistente) {
      return NextResponse.json({ error: 'Equipe não encontrada' }, { status: 404 });
    }

    if (equipeExistente.codigo_contrato !== userData.contrato_raiz) {
      return NextResponse.json({ error: 'Você não tem permissão para editar esta equipe' }, { status: 403 });
    }

    // Converter equipe para caixa alta
    const equipeUpperCase = equipe.toUpperCase();

    // Verificar se já existe outra equipe com o mesmo nome no mesmo contrato
    const { data: existingEquipe, error: checkError } = await supabase
      .from('equipes')
      .select('id')
      .eq('equipe', equipeUpperCase)
      .eq('codigo_contrato', userData.contrato_raiz)
      .neq('id', id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Erro ao verificar equipe existente' }, { status: 500 });
    }

    if (existingEquipe) {
      return NextResponse.json({ error: 'Já existe uma equipe com este nome' }, { status: 400 });
    }

    // Atualizar equipe
    const { data: equipeAtualizada, error } = await supabase
      .from('equipes')
      .update({
        equipe: equipeUpperCase,
        supervisor: supervisor
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

    const { id } = await params

    // Verificar se a equipe pertence ao mesmo contrato_raiz do usuário
    const { data: equipeExistente, error: equipeError } = await supabase
      .from('equipes')
      .select('codigo_contrato')
      .eq('id', id)
      .single();

    if (equipeError || !equipeExistente) {
      return NextResponse.json({ error: 'Equipe não encontrada' }, { status: 404 });
    }

    if (equipeExistente.codigo_contrato !== userData.contrato_raiz) {
      return NextResponse.json({ error: 'Você não tem permissão para excluir esta equipe' }, { status: 403 });
    }

    // Excluir equipe
    const { error } = await supabase
      .from('equipes')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Equipe excluída com sucesso' });
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}