import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/almoxarifado/itens/[id] - Buscar item por ID
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
    const { data: item, error } = await supabase
      .from('itens_almoxarifado')
      .select('*')
      .eq('id', id)
      .eq('ativo', true)
      .single();

    if (error || !item) {
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: item
    });

  } catch (error) {
    console.error('Erro na API de item:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT /api/almoxarifado/itens/[id] - Atualizar item
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
    try {
      jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Usuário autenticado pode editar itens

    const { id } = await params;
    
    // Verificar se o item existe
    const { data: itemExistente, error: fetchError } = await supabase
      .from('itens_almoxarifado')
      .select('*')
      .eq('id', id)
      .eq('ativo', true)
      .single();

    if (fetchError || !itemExistente) {
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });
    }

    const contentType = request.headers.get('content-type');
    let nome, descricao, categoria, preco_unitario, estoque_minimo, imagem_url;
    let imageFile: File | null = null;

    if (contentType?.includes('multipart/form-data')) {
      // Processar FormData
      const formData = await request.formData();
      nome = formData.get('nome') as string;
      descricao = formData.get('descricao') as string;
      categoria = formData.get('categoria') as string;
      preco_unitario = parseFloat(formData.get('preco_unitario') as string);
      estoque_minimo = parseInt(formData.get('estoque_minimo') as string);
      imageFile = formData.get('image') as File;
      
      // Manter imagem atual se não houver nova imagem
      if (!imageFile || imageFile.size === 0) {
        imagem_url = itemExistente.imagem_url;
      }
    } else {
      // Processar JSON
      const body = await request.json();
      ({ nome, descricao, categoria, preco_unitario, estoque_minimo, imagem_url } = body);
    }

    // Validar campos obrigatórios
    if (!nome || !descricao || !categoria || isNaN(preco_unitario) || isNaN(estoque_minimo)) {
      return NextResponse.json({ 
        error: 'Campos obrigatórios: nome, descricao, categoria, preco_unitario, estoque_minimo' 
      }, { status: 400 });
    }

    // Upload da nova imagem se fornecida
    if (imageFile && imageFile.size > 0) {
      try {
        // Remover imagem anterior se existir
        if (itemExistente.imagem_url) {
          const oldImagePath = itemExistente.imagem_url.split('/').pop();
          if (oldImagePath && oldImagePath.includes('itens/')) {
            await supabase.storage
              .from('almoxarifado-images')
              .remove([`itens/${oldImagePath.split('/').pop()}`]);
          }
        }

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

        // Obter URL pública da nova imagem
        const { data: { publicUrl } } = supabase.storage
          .from('almoxarifado-images')
          .getPublicUrl(filePath);

        imagem_url = publicUrl;
      } catch (error) {
        console.error('Erro no processamento da imagem:', error);
        return NextResponse.json({ error: 'Erro ao processar imagem' }, { status: 500 });
      }
    }

    // Atualizar item
    const { data: itemAtualizado, error: updateError } = await supabase
      .from('itens_almoxarifado')
      .update({
        nome,
        descricao,
        categoria,
        preco_unitario,
        estoque_minimo,
        imagem_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar item:', updateError);
      return NextResponse.json({ error: 'Erro ao atualizar item' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: itemAtualizado
    });

  } catch (error) {
    console.error('Erro na API de atualização de item:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE /api/almoxarifado/itens/[id] - Desativar item
export async function DELETE(
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

    // Usuário autenticado pode excluir itens

    const { id } = await params;
    
    // Verificar se o item existe
    const { data: itemExistente } = await supabase
      .from('itens_almoxarifado')
      .select('id')
      .eq('id', id)
      .eq('ativo', true)
      .single();

    if (!itemExistente) {
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });
    }

    // Desativar item (soft delete)
    const { error: deleteError } = await supabase
      .from('itens_almoxarifado')
      .update({ 
        ativo: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (deleteError) {
      console.error('Erro ao desativar item:', deleteError);
      return NextResponse.json({ error: 'Erro ao desativar item' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Item desativado com sucesso'
    });

  } catch (error) {
    console.error('Erro na API de exclusão de item:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}