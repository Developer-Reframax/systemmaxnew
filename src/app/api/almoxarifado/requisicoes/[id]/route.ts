import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/almoxarifado/requisicoes/[id] - Buscar requisição específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token de acesso requerido' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    try {
      jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { id } = await params;

    const { data: requisicao, error } = await supabase
      .from('requisicoes')
      .select(`
        *,
        solicitante:usuarios!matricula_solicitante(matricula, nome),
        aprovador:usuarios!matricula_aprovador(matricula, nome),
        entregador:usuarios!matricula_entregador(matricula, nome),
        itens:requisicoes_itens(
          id,
          quantidade_solicitada,
          quantidade_entregue,
          preco_unitario,
          subtotal,
          item:itens_almoxarifado(id, nome, categoria, imagem_url, estoque_atual)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Requisição não encontrada' }, { status: 404 });
      }
      console.error('Erro ao buscar requisição:', error);
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: requisicao
    });

  } catch (error) {
    console.error('Erro na API de requisição:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT /api/almoxarifado/requisicoes/[id] - Atualizar requisição (apenas pendentes)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token de acesso requerido' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    interface DecodedToken {
      matricula: string;
    }
    let decoded: DecodedToken;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    } catch {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const body = await request.json();
    const { observacoes } = body;

    const { id } = await params;

    // Verificar se a requisição existe e está pendente
    const { data: requisicaoExistente, error: fetchError } = await supabase
      .from('requisicoes')
      .select('id, status, matricula_solicitante')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Requisição não encontrada' }, { status: 404 });
      }
      console.error('Erro ao buscar requisição:', fetchError);
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }

    // Verificar se o usuário é o solicitante
    if (requisicaoExistente.matricula_solicitante !== decoded.matricula) {
      return NextResponse.json({ 
        error: 'Você só pode editar suas próprias requisições' 
      }, { status: 403 });
    }

    // Verificar se a requisição ainda está pendente
    if (requisicaoExistente.status !== 'pendente') {
      return NextResponse.json({ 
        error: 'Apenas requisições pendentes podem ser editadas' 
      }, { status: 400 });
    }

    // Atualizar requisição
    const { data: requisicaoAtualizada, error: updateError } = await supabase
      .from('requisicoes')
      .update({
        observacoes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        solicitante:usuarios!matricula_solicitante(matricula, nome),
        itens:requisicoes_itens(
          id,
          quantidade_solicitada,
          preco_unitario,
          subtotal,
          item:itens_almoxarifado(id, nome, categoria, imagem_url)
        )
      `)
      .single();

    if (updateError) {
      console.error('Erro ao atualizar requisição:', updateError);
      return NextResponse.json({ error: 'Erro ao atualizar requisição' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: requisicaoAtualizada
    });

  } catch (error) {
    console.error('Erro na API de atualização de requisição:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}