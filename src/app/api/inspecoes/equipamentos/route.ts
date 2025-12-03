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

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const contrato = searchParams.get('contrato');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    let query = supabase
      .from('equipamentos_inspecao')
      .select('*', { count: 'exact' })
      .order('impedido', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`nome.ilike.%${search}%,tag.ilike.%${search}%`);
    }

    if (contrato && contrato !== 'todos') {
      query = query.eq('contrato', contrato);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Erro ao listar equipamentos:', error);
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data as Equipamento[],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Erro no GET de equipamentos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    if (!isAuthorized(authResult.user?.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const formData = await request.formData();
    const tag = String(formData.get('tag') || '').trim();
    const nome = String(formData.get('nome') || '').trim();
    const descricao = String(formData.get('descricao') || '').trim();
    const imagem = formData.get('imagem') as File | null;

    if (!tag || !nome || !descricao || !imagem) {
      return NextResponse.json({ error: 'Todos os campos sao obrigatorios' }, { status: 400 });
    }

    const contratoRaiz = authResult.user?.contrato_raiz;
    if (!contratoRaiz) {
      return NextResponse.json({ error: 'Contrato do usuario nao encontrado' }, { status: 400 });
    }

    const uploadPath = `${Date.now()}-${imagem.name}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(uploadPath, imagem, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Erro ao fazer upload da imagem:', uploadError);
      return NextResponse.json({ error: 'Erro ao salvar imagem' }, { status: 500 });
    }

    const {
      data: { publicUrl }
    } = supabase.storage.from(BUCKET).getPublicUrl(uploadPath);

    const { data: inserted, error: insertError } = await supabase
      .from('equipamentos_inspecao')
      .insert({
        tag,
        nome,
        descricao,
        imagem_url: publicUrl,
        contrato: contratoRaiz
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir equipamento:', insertError);
      await supabase.storage.from(BUCKET).remove([uploadPath]);
      return NextResponse.json({ error: 'Erro ao salvar equipamento' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: inserted as Equipamento }, { status: 201 });
  } catch (error) {
    console.error('Erro no POST de equipamentos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}







