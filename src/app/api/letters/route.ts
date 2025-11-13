import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Buscar letras
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

    // Buscar letras do mesmo contrato_raiz
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
      .eq('codigo_contrato', userData.contrato_raiz)
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
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    // Verificar se o usuário tem permissão (Admin ou Editor)
    if (!authResult.user || (authResult.user.role !== 'Admin' && authResult.user.role !== 'Editor')) {
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

    const { letra, lider } = await request.json();

    if (!letra || !lider) {
      return NextResponse.json({ error: 'Letra e líder são obrigatórios' }, { status: 400 });
    }

    // Converter letra para caixa alta
    const letraUpperCase = letra.toUpperCase();

    // Verificar se a letra já existe para este contrato
    const { data: existingLetter } = await supabase
      .from('letras')
      .select('id')
      .eq('letra', letraUpperCase)
      .eq('codigo_contrato', userData.contrato_raiz)
      .single();

    if (existingLetter) {
      return NextResponse.json({ error: 'Esta letra já existe para este contrato' }, { status: 400 });
    }

    // Criar nova letra
    const { data, error } = await supabase
      .from('letras')
      .insert({
        letra: letraUpperCase,
        codigo_contrato: userData.contrato_raiz,
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
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    // Verificar se o usuário tem permissão (Admin ou Editor)
    if (!authResult.user || (authResult.user.role !== 'Admin' && authResult.user.role !== 'Editor')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { id, letra, lider } = await request.json();

    if (!id || !letra || !lider) {
      return NextResponse.json({ error: 'ID, letra e líder são obrigatórios' }, { status: 400 });
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

    // Verificar se a letra pertence ao contrato do usuário
    const { data: existingLetter, error: letterError } = await supabase
      .from('letras')
      .select('codigo_contrato')
      .eq('id', id)
      .single();

    if (letterError || !existingLetter) {
      return NextResponse.json({ error: 'Letra não encontrada' }, { status: 404 });
    }

    if (existingLetter.codigo_contrato !== userData.contrato_raiz) {
      return NextResponse.json({ error: 'Sem permissão para editar esta letra' }, { status: 403 });
    }

    // Converter letra para caixa alta
    const letraUpperCase = letra.toUpperCase();

    // Verificar se já existe outra letra com o mesmo nome para este contrato
    const { data: duplicateLetter } = await supabase
      .from('letras')
      .select('id')
      .eq('letra', letraUpperCase)
      .eq('codigo_contrato', userData.contrato_raiz)
      .neq('id', id)
      .single();

    if (duplicateLetter) {
      return NextResponse.json({ error: 'Já existe outra letra com este nome para este contrato' }, { status: 400 });
    }

    // Atualizar letra
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
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    // Verificar se o usuário tem permissão (Admin ou Editor)
    if (!authResult.user || (authResult.user.role !== 'Admin' && authResult.user.role !== 'Editor')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
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

    // Verificar se a letra pertence ao contrato do usuário
    const { data: existingLetter, error: letterError } = await supabase
      .from('letras')
      .select('codigo_contrato')
      .eq('id', id)
      .single();

    if (letterError || !existingLetter) {
      return NextResponse.json({ error: 'Letra não encontrada' }, { status: 404 });
    }

    if (existingLetter.codigo_contrato !== userData.contrato_raiz) {
      return NextResponse.json({ error: 'Sem permissão para excluir esta letra' }, { status: 403 });
    }

    // Excluir letra
    const { error } = await supabase
      .from('letras')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Letra excluída com sucesso' });
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
