import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';

interface EquipamentoInput {
  tag: string;
  nome: string;
  descricao: string;
  imagem_url: string;
}

interface Equipamento extends EquipamentoInput {
  id: string;
  created_at?: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = 'equipamentos-imagens';

function isAuthorized(role?: string | null) {
  return role === 'Admin' || role === 'Editor';
}

async function deleteImageIfNeeded(url?: string | null) {
  if (!url) return;
  try {
    const parts = url.split('/');
    const pathFromBucket = parts.slice(parts.findIndex((part) => part === BUCKET) + 1).join('/');
    if (!pathFromBucket) return;
    await supabase.storage.from(BUCKET).remove([pathFromBucket]);
  } catch (error) {
    console.warn('Falha ao remover imagem antiga:', error);
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id } = await context.params;

    const { data, error } = await supabase
      .from('equipamentos_inspecao')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      const notFound = error.code === 'PGRST116';
      return NextResponse.json(
        { error: notFound ? 'Equipamento não encontrado' : 'Erro ao buscar equipamento' },
        { status: notFound ? 404 : 500 }
      );
    }

    return NextResponse.json({ success: true, data: data as Equipamento });
  } catch (error) {
    console.error('Erro no GET de equipamento:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    if (!isAuthorized(authResult.user?.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await context.params;
    const formData = await request.formData();
    const tag = String(formData.get('tag') || '').trim();
    const nome = String(formData.get('nome') || '').trim();
    const descricao = String(formData.get('descricao') || '').trim();
    const imagemAtual = String(formData.get('imagem_atual') || '').trim();
    const imagem = formData.get('imagem') as File | null;

    if (!tag || !nome || !descricao || (!imagem && !imagemAtual)) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 });
    }

    let imagemUrl = imagemAtual;
    let uploadedPath: string | null = null;

    if (imagem) {
      const uploadPath = `${Date.now()}-${imagem.name}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(uploadPath, imagem, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Erro ao atualizar imagem do equipamento:', uploadError);
        return NextResponse.json({ error: 'Erro ao salvar imagem' }, { status: 500 });
      }

      const {
        data: { publicUrl }
      } = supabase.storage.from(BUCKET).getPublicUrl(uploadPath);
      imagemUrl = publicUrl;
      uploadedPath = uploadPath;
    }

    const { data, error: updateError } = await supabase
      .from('equipamentos_inspecao')
      .update({
        tag,
        nome,
        descricao,
        imagem_url: imagemUrl
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar equipamento:', updateError);
      if (uploadedPath) {
        await supabase.storage.from(BUCKET).remove([uploadedPath]);
      }
      return NextResponse.json({ error: 'Erro ao atualizar equipamento' }, { status: 500 });
    }

    if (uploadedPath && imagemAtual) {
      await deleteImageIfNeeded(imagemAtual);
    }

    return NextResponse.json({ success: true, data: data as Equipamento });
  } catch (error) {
    console.error('Erro no PUT de equipamento:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    if (!isAuthorized(authResult.user?.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await context.params;

    const { data: equipamento } = await supabase
      .from('equipamentos_inspecao')
      .select('imagem_url')
      .eq('id', id)
      .single();

    const { error: deleteError } = await supabase
      .from('equipamentos_inspecao')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erro ao excluir equipamento:', deleteError);
      return NextResponse.json({ error: 'Erro ao excluir equipamento' }, { status: 500 });
    }

    if (equipamento?.imagem_url) {
      await deleteImageIfNeeded(equipamento.imagem_url);
    }

    return NextResponse.json({ success: true, message: 'Equipamento excluído com sucesso' });
  } catch (error) {
    console.error('Erro no DELETE de equipamento:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
