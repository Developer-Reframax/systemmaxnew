import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/almoxarifado/itens - Listar itens
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Parâmetros de consulta
    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get('categoria');
    const disponivel = searchParams.get('disponivel');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Construir query
    let query = supabase
      .from('itens_almoxarifado')
      .select('*', { count: 'exact' })
      .eq('ativo', true)
      .order('nome');

    // Aplicar filtros
    if (categoria) {
      query = query.eq('categoria', categoria);
    }

    if (disponivel === 'true') {
      query = query.gt('estoque_atual', 0);
    }

    if (search) {
      query = query.or(`nome.ilike.%${search}%,descricao.ilike.%${search}%`);
    }

    // Aplicar paginação
    query = query.range(offset, offset + limit - 1);

    const { data: itens, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar itens:', error);
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: itens,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Erro na API de itens:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST /api/almoxarifado/itens - Criar novo item
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Usuário autenticado pode criar itens

    const contentType = request.headers.get('content-type');
    let nome, descricao, categoria, preco_unitario, estoque_atual, estoque_minimo, imagem_url;
    let imageFile: File | null = null;

    if (contentType?.includes('multipart/form-data')) {
      // Processar FormData
      const formData = await request.formData();
      nome = formData.get('nome') as string;
      descricao = formData.get('descricao') as string;
      categoria = formData.get('categoria') as string;
      preco_unitario = parseFloat(formData.get('preco_unitario') as string);
      estoque_atual = parseInt(formData.get('estoque_atual') as string);
      estoque_minimo = parseInt(formData.get('estoque_minimo') as string);
      imageFile = formData.get('image') as File;
    } else {
      // Processar JSON
      const body = await request.json();
      ({ nome, descricao, categoria, preco_unitario, estoque_atual, estoque_minimo, imagem_url } = body);
    }

    // Validar campos obrigatórios
    if (!nome || !descricao || !categoria || preco_unitario === undefined || 
        estoque_atual === undefined || estoque_minimo === undefined) {
      return NextResponse.json({ 
        error: 'Campos obrigatórios: nome, descricao, categoria, preco_unitario, estoque_atual, estoque_minimo' 
      }, { status: 400 });
    }

    // Validar tipos
    if (isNaN(preco_unitario) || isNaN(estoque_atual) || isNaN(estoque_minimo)) {
      return NextResponse.json({ 
        error: 'preco_unitario, estoque_atual e estoque_minimo devem ser números válidos' 
      }, { status: 400 });
    }

    // Upload da imagem se fornecida
    if (imageFile && imageFile.size > 0) {
      try {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `itens/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('almoxarifado-images')
          .upload(filePath, imageFile, {
            contentType: imageFile.type,
            upsert: false
          });

        if (uploadError) {
          console.error('Erro no upload da imagem:', uploadError);
          return NextResponse.json({ error: 'Erro ao fazer upload da imagem' }, { status: 500 });
        }

        // Obter URL pública da imagem
        const { data: { publicUrl } } = supabase.storage
          .from('almoxarifado-images')
          .getPublicUrl(filePath);

        imagem_url = publicUrl;
      } catch (error) {
        console.error('Erro no processamento da imagem:', error);
        return NextResponse.json({ error: 'Erro ao processar imagem' }, { status: 500 });
      }
    }

    // Inserir item
    const { data: novoItem, error: insertError } = await supabase
      .from('itens_almoxarifado')
      .insert({
        nome,
        descricao,
        categoria,
        preco_unitario,
        estoque_atual,
        estoque_minimo,
        imagem_url
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir item:', insertError);
      return NextResponse.json({ error: 'Erro ao criar item' }, { status: 500 });
    }

    // Registrar movimentação inicial de estoque se houver estoque
    if (estoque_atual > 0) {
      await supabase
        .from('movimentacoes_estoque')
        .insert({
          item_id: novoItem.id,
          tipo: 'entrada',
          quantidade: estoque_atual,
          estoque_anterior: 0,
          estoque_atual: estoque_atual,
          motivo: 'Estoque inicial do item',
          matricula_responsavel: authResult.user?.matricula
        });
    }

    return NextResponse.json({
      success: true,
      data: novoItem
    }, { status: 201 });

  } catch (error) {
    console.error('Erro na API de criação de item:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}