import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const desvioId = searchParams.get('id');
    
    if (!desvioId) {
      return NextResponse.json({ error: 'ID do desvio é obrigatório' }, { status: 400 });
    }

    console.log('🔍 Verificando desvio com ID:', desvioId);

    // Buscar o desvio
    const { data: desvio, error } = await supabase
      .from('desvios')
      .select('id, descricao, matricula_user, status, created_at')
      .eq('id', desvioId)
      .single();

    console.log('📊 Resultado da busca:', { desvio, error });

    if (error) {
      console.log('❌ Erro na busca:', error);
      return NextResponse.json({ 
        exists: false, 
        error: error.message,
        details: error 
      });
    }

    if (!desvio) {
      console.log('❌ Desvio não encontrado');
      return NextResponse.json({ 
        exists: false, 
        message: 'Desvio não encontrado' 
      });
    }

    console.log('✅ Desvio encontrado:', desvio);
    return NextResponse.json({ 
      exists: true, 
      desvio 
    });

  } catch (error) {
    console.error('💥 Erro geral:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error 
    }, { status: 500 });
  }
}
