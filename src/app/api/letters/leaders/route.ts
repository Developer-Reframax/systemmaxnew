import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Buscar líderes do mesmo contrato_raiz
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

    // Buscar usuários com o mesmo contrato_raiz
    const { data: lideres, error } = await supabase
      .from('usuarios')
      .select('matricula, nome')
      .eq('contrato_raiz', userData.contrato_raiz)
      .eq('status', 'ativo')
      .order('nome', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(lideres);
  } catch  {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
