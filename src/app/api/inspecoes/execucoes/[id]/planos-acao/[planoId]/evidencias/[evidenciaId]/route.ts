import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// DELETE /api/inspecoes/execucoes/[id]/planos-acao/[planoId]/evidencias/[evidenciaId] - Deletar evidência
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; planoId: string; evidenciaId: string }> }
) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id, planoId, evidenciaId } = await context.params;

    // Buscar evidência existente
    const { data: evidenciaExistente } = await supabase
      .from('evidencias_plano_acao')
      .select('id, plano_acao_id, nome_arquivo')
      .eq('id', evidenciaId)
      .eq('plano_acao_id', planoId)
      .single();

    if (!evidenciaExistente) {
      return NextResponse.json({ error: 'Evidência não encontrada' }, { status: 404 });
    }

    // Buscar plano de ação existente
    const { data: planoExistente } = await supabase
      .from('planos_acao')
      .select('id, execucao_id')
      .eq('id', planoId)
      .eq('execucao_id', id)
      .single();

    if (!planoExistente) {
      return NextResponse.json({ error: 'Plano de ação não encontrado' }, { status: 404 });
    }

    // Buscar execução para verificar acesso
    const { data: execucao } = await supabase
      .from('execucoes_inspecao')
      .select('id, matricula_executor, status')
      .eq('id', id)
      .single();

    if (!execucao) {
      return NextResponse.json({ error: 'Execução não encontrada' }, { status: 404 });
    }

    // Verificar permissões
    const podeDeletar = 
      execucao.matricula_executor === authResult.user?.matricula ||
      authResult.user?.role === 'Admin';

    if (!podeDeletar) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Não permitir deletar evidências em execuções concluídas ou canceladas (exceto admin)
    if (execucao.status !== 'em_andamento' && authResult.user?.role !== 'Admin') {
      return NextResponse.json({ error: 'Não é possível deletar evidências em execuções que não estão em andamento' }, { status: 409 });
    }

    // Extrair o caminho do arquivo do URL
    const urlParts = evidenciaExistente.nome_arquivo.split('/');
    const filePath = urlParts.length > 1 ? urlParts.slice(1).join('/') : evidenciaExistente.nome_arquivo;

    // Deletar arquivo do storage
    const { error: storageError } = await supabase.storage
      .from('evidencias-planos-acao')
      .remove([filePath]);

    if (storageError) {
      console.error('Erro ao deletar arquivo do storage:', storageError);
      // Continuar mesmo se houver erro no storage, mas registrar
    }

    // Deletar evidência do banco de dados
    const { error: dbError } = await supabase
      .from('evidencias_plano_acao')
      .delete()
      .eq('id', evidenciaId)
      .eq('plano_acao_id', planoId);

    if (dbError) {
      console.error('Erro ao deletar evidência do banco:', dbError);
      return NextResponse.json({ error: 'Erro ao deletar evidência' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Evidência deletada com sucesso'
    });

  } catch (error) {
    console.error('Erro na API de deleção de evidência:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}