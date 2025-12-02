import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/inspecoes/formularios - Listar formulários
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Parâmetros de consulta
    const { searchParams } = new URL(request.url);
    const categoria_id = searchParams.get('categoria_id');
    const corporativo = searchParams.get('corporativo');
    const ativo = searchParams.get('ativo');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Construir query com join para categoria
    let query = supabase
      .from('formularios_inspecao')
      .select(`
        *,
        categoria:categorias_inspecao(id, nome),
        perguntas:perguntas_formulario(count)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (categoria_id) {
      query = query.eq('categoria_id', categoria_id);
    }

    if (corporativo !== null) {
      query = query.eq('corporativo', corporativo === 'true');
    }

    if (ativo !== null) {
      query = query.eq('ativo', ativo === 'true');
    } else {
      // Por padrão, mostrar apenas formulários ativos
      query = query.eq('ativo', true);
    }

    if (search) {
      query = query.ilike('titulo', `%${search}%`);
    }

    // Aplicar paginação
    query = query.range(offset, offset + limit - 1);

    const { data: formularios, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar formulários:', error);
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: formularios,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Erro na API de formulários:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST /api/inspecoes/formularios - Criar novo formulário
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Verificar se o usuário tem permissão (Admin ou Editor)
    if (!authResult.user?.role || !['Admin', 'Editor'].includes(authResult.user.role)) {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores e editores podem criar formulários.' }, { status: 403 });
    }

    const body = await request.json();
    const { categoria_id, titulo, corporativo = false, check_list = false, perguntas = [] } = body;

    // Validar campos obrigatórios
    if (!categoria_id || !titulo) {
      return NextResponse.json({ 
        error: 'Campos obrigatórios: categoria_id, titulo' 
      }, { status: 400 });
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

    // Validar perguntas se fornecidas
    if (perguntas.length > 0) {
      for (let i = 0; i < perguntas.length; i++) {
        const pergunta = perguntas[i];
        if (!pergunta.pergunta) {
          return NextResponse.json({ 
            error: `Pergunta ${i + 1}: campo 'pergunta' é obrigatório` 
          }, { status: 400 });
        }
      }
    }

    // Iniciar transação
    const { data: novoFormulario, error: insertError } = await supabase
      .from('formularios_inspecao')
      .insert({
        categoria_id,
        titulo,
        corporativo,
        check_list,
        ativo: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir formulário:', insertError);
      return NextResponse.json({ error: 'Erro ao criar formulário' }, { status: 500 });
    }

    // Inserir perguntas se fornecidas
    if (perguntas.length > 0) {
      type PerguntaInserir = {
        pergunta: string
        permite_conforme?: boolean
        permite_nao_conforme?: boolean
        permite_nao_aplica?: boolean
        impeditivo?: boolean
      }
      const perguntasParaInserir = (perguntas as PerguntaInserir[]).map((pergunta, index: number) => ({
        formulario_id: novoFormulario.id,
        pergunta: pergunta.pergunta,
        ordem: index + 1,
        permite_conforme: pergunta.permite_conforme !== false,
        permite_nao_conforme: pergunta.permite_nao_conforme !== false,
        permite_nao_aplica: pergunta.permite_nao_aplica !== false,
        impeditivo: pergunta.impeditivo === true
      }));

      const { error: perguntasError } = await supabase
        .from('perguntas_formulario')
        .insert(perguntasParaInserir);

      if (perguntasError) {
        console.error('Erro ao inserir perguntas:', perguntasError);
        // Reverter criação do formulário
        await supabase
          .from('formularios_inspecao')
          .delete()
          .eq('id', novoFormulario.id);
        
        return NextResponse.json({ error: 'Erro ao criar perguntas do formulário' }, { status: 500 });
      }
    }

    // Buscar formulário completo com categoria e perguntas
    const { data: formularioCompleto } = await supabase
      .from('formularios_inspecao')
      .select(`
        *,
        categoria:categorias_inspecao(id, nome),
        perguntas:perguntas_formulario(*)
      `)
      .eq('id', novoFormulario.id)
      .single();

    return NextResponse.json({
      success: true,
      data: formularioCompleto
    }, { status: 201 });

  } catch (error) {
    console.error('Erro na API de criação de formulário:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
