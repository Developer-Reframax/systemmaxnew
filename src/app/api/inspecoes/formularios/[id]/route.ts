import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/inspecoes/formularios/[id] - Buscar formulário por ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id } = await context.params;

    // Buscar formulário com categoria e perguntas
    const { data: formulario, error } = await supabase
      .from('formularios_inspecao')
      .select(`
        *,
        categoria:categorias_inspecao(id, nome),
        perguntas:perguntas_formulario(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Formulário não encontrado' }, { status: 404 });
      }
      console.error('Erro ao buscar formulário:', error);
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }

    // Ordenar perguntas por ordem
    if (formulario.perguntas) {
      formulario.perguntas.sort((a: PerguntaOrdenavel, b: PerguntaOrdenavel) => a.ordem - b.ordem);
    }

    return NextResponse.json({
      success: true,
      data: formulario
    });

  } catch (error) {
    console.error('Erro na API de formulário:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT /api/inspecoes/formularios/[id] - Atualizar formulário
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Verificar se o usuário tem permissão (Admin ou Editor)
    if (!authResult.user?.role || !['Admin', 'Editor'].includes(authResult.user.role)) {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores e editores podem editar formulários.' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { categoria_id, titulo, corporativo, ativo, perguntas } = body;

    // Validar campos obrigatórios
    if (!categoria_id || !titulo) {
      return NextResponse.json({ 
        error: 'Campos obrigatórios: categoria_id, titulo' 
      }, { status: 400 });
    }

    // Verificar se o formulário existe
    const { data: formularioExistente } = await supabase
      .from('formularios_inspecao')
      .select('id')
      .eq('id', id)
      .single();

    if (!formularioExistente) {
      return NextResponse.json({ error: 'Formulário não encontrado' }, { status: 404 });
    }

    // Validar se a categoria existe
    const { data: categoria } = await supabase
      .from('categorias_inspecao')
      .select('id')
      .eq('id', categoria_id)
      .single();

    if (!categoria) {
      return NextResponse.json({ 
        error: 'Categoria não encontrada' 
      }, { status: 400 });
    }

    // Verificar se existem execuções vinculadas (não permite editar se houver)
    const { data: execucoesVinculadas } = await supabase
      .from('execucoes_inspecao')
      .select('id')
      .eq('formulario_id', id)
      .limit(1);

    if (execucoesVinculadas && execucoesVinculadas.length > 0) {
      return NextResponse.json({ 
        error: 'Não é possível editar este formulário pois existem execuções vinculadas a ele' 
      }, { status: 409 });
    }

    // Atualizar formulário
    const { error: updateError } = await supabase
      .from('formularios_inspecao')
      .update({
        categoria_id,
        titulo,
        corporativo: corporativo !== undefined ? corporativo : false,
        ativo: ativo !== undefined ? ativo : true
      })
      .eq('id', id);

    if (updateError) {
      console.error('Erro ao atualizar formulário:', updateError);
      return NextResponse.json({ error: 'Erro ao atualizar formulário' }, { status: 500 });
    }

    // Atualizar perguntas se fornecidas
    if (perguntas && Array.isArray(perguntas)) {
      // Validar perguntas
      for (let i = 0; i < perguntas.length; i++) {
        const pergunta = perguntas[i];
        if (!pergunta.pergunta) {
          return NextResponse.json({ 
            error: `Pergunta ${i + 1}: campo 'pergunta' é obrigatório` 
          }, { status: 400 });
        }
      }

      // Remover perguntas existentes
      await supabase
        .from('perguntas_formulario')
        .delete()
        .eq('formulario_id', id);

      // Inserir novas perguntas
      if (perguntas.length > 0) {
        const perguntasParaInserir = perguntas.map((pergunta: PerguntaInput, index: number) => ({
          formulario_id: id,
          pergunta: pergunta.pergunta,
          ordem: index + 1,
          permite_conforme: pergunta.permite_conforme !== false,
          permite_nao_conforme: pergunta.permite_nao_conforme !== false,
          permite_nao_aplica: pergunta.permite_nao_aplica !== false
        }));

        const { error: perguntasError } = await supabase
          .from('perguntas_formulario')
          .insert(perguntasParaInserir);

        if (perguntasError) {
          console.error('Erro ao inserir perguntas:', perguntasError);
          return NextResponse.json({ error: 'Erro ao atualizar perguntas do formulário' }, { status: 500 });
        }
      }
    }

    // Buscar formulário completo atualizado
    const { data: formularioCompleto } = await supabase
      .from('formularios_inspecao')
      .select(`
        *,
        categoria:categorias_inspecao(id, nome),
        perguntas:perguntas_formulario(*)
      `)
      .eq('id', id)
      .single();

    // Ordenar perguntas por ordem
    if (formularioCompleto?.perguntas) {
      formularioCompleto.perguntas.sort((a: PerguntaOrdenavel, b: PerguntaOrdenavel) => a.ordem - b.ordem);
    }

    return NextResponse.json({
      success: true,
      data: formularioCompleto
    });

  } catch (error) {
    console.error('Erro na API de atualização de formulário:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE /api/inspecoes/formularios/[id] - Excluir formulário
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Verificar se o usuário tem permissão (Admin)
    if (!authResult.user?.role || authResult.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem excluir formulários.' }, { status: 403 });
    }

    const { id } = await context.params;

    // Verificar se o formulário existe
    const { data: formulario } = await supabase
      .from('formularios_inspecao')
      .select('id')
      .eq('id', id)
      .single();

    if (!formulario) {
      return NextResponse.json({ error: 'Formulário não encontrado' }, { status: 404 });
    }

    // Verificar se existem execuções vinculadas
    const { data: execucoesVinculadas } = await supabase
      .from('execucoes_inspecao')
      .select('id')
      .eq('formulario_id', id)
      .limit(1);

    if (execucoesVinculadas && execucoesVinculadas.length > 0) {
      return NextResponse.json({ 
        error: 'Não é possível excluir este formulário pois existem execuções vinculadas a ele' 
      }, { status: 409 });
    }

    // Excluir formulário (as perguntas serão excluídas automaticamente por CASCADE)
    const { error: deleteError } = await supabase
      .from('formularios_inspecao')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erro ao excluir formulário:', deleteError);
      return NextResponse.json({ error: 'Erro ao excluir formulário' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Formulário excluído com sucesso'
    });

  } catch (error) {
    console.error('Erro na API de exclusão de formulário:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// Tipos auxiliares para evitar 'any'
interface PerguntaOrdenavel { ordem: number }
interface PerguntaInput {
  pergunta: string;
  permite_conforme?: boolean;
  permite_nao_conforme?: boolean;
  permite_nao_aplica?: boolean;
}