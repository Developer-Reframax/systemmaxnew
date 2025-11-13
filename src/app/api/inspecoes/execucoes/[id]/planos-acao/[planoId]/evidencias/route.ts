import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';
import { EvidenciaPlanoAcao } from '@/types/plano-acao';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/inspecoes/execucoes/[id]/planos-acao/[planoId]/evidencias - Upload de evidência
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; planoId: string }> }
) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id, planoId } = await context.params;

    // Buscar plano de ação existente com fallback de coluna de execução
    let planoValido: { id: string } | null = null;
    const { data: planoPorExecucaoNova, error: erroExecucaoNova } = await supabase
      .from('planos_acao')
      .select('id')
      .eq('id', planoId)
      .eq('execucao_inspecao_id', id)
      .single();

    if (planoPorExecucaoNova) {
      planoValido = planoPorExecucaoNova as { id: string };
    } else {
      const msgPlano = (erroExecucaoNova?.message || '') as string;
      if (msgPlano.includes('execucao_inspecao_id') || erroExecucaoNova?.code === 'PGRST204') {
        const { data: planoPorExecucaoAntiga } = await supabase
          .from('planos_acao')
          .select('id')
          .eq('id', planoId)
          .eq('execucao_id', id)
          .single();
        if (planoPorExecucaoAntiga) {
          planoValido = planoPorExecucaoAntiga as { id: string };
        }
      } else {
        // Caso não encontrado mas sem erro de coluna, tentar fallback por consistência
        const { data: planoPorExecucaoAntiga } = await supabase
          .from('planos_acao')
          .select('id')
          .eq('id', planoId)
          .eq('execucao_id', id)
          .single();
        if (planoPorExecucaoAntiga) {
          planoValido = planoPorExecucaoAntiga as { id: string };
        }
      }
    }

    if (!planoValido) {
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
    const podeUpload = 
      execucao.matricula_executor === authResult.user?.matricula ||
      authResult.user?.role === 'Admin';

    if (!podeUpload) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Não permitir upload em execuções concluídas ou canceladas (exceto admin)
    if (execucao.status !== 'em_andamento' && authResult.user?.role !== 'Admin') {
      return NextResponse.json({ error: 'Não é possível adicionar evidências em execuções que não estão em andamento' }, { status: 409 });
    }

    // Processar upload do arquivo
    const formData = await request.formData();
    const arquivo = formData.get('arquivo') as File;
    // 'descricao' não é utilizada; removida para evitar warning de lint

    if (!arquivo) {
      return NextResponse.json({ error: 'Arquivo não fornecido' }, { status: 400 });
    }

    // Validar tipo e tamanho do arquivo
    const tiposPermitidos = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!tiposPermitidos.includes(arquivo.type)) {
      return NextResponse.json({ error: 'Tipo de arquivo não permitido' }, { status: 400 });
    }

    const tamanhoMaximo = 50 * 1024 * 1024; // 50MB
    if (arquivo.size > tamanhoMaximo) {
      return NextResponse.json({ error: 'Arquivo muito grande (máximo 50MB)' }, { status: 400 });
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const nomeArquivo = `${planoId}/${timestamp}-${arquivo.name}`;

    try {
      // Fazer upload para o Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('evidencias-planos-acao')
        .upload(nomeArquivo, arquivo, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Erro ao fazer upload do arquivo:', uploadError);
        return NextResponse.json({ error: 'Erro ao fazer upload do arquivo' }, { status: 500 });
      }

      // Obter URL pública do arquivo
      const { data: { publicUrl } } = supabase.storage
        .from('evidencias-planos-acao')
        .getPublicUrl(nomeArquivo);

      // Criar registro da evidência no banco de dados com suporte a esquemas diferentes
      const tentarInsertEvidencia = async (payload: Record<string, unknown>) => {
        return supabase
          .from('evidencias_plano_acao')
          .insert([payload])
          .select('*')
          .single();
      };

      // Tentativa 1: schema novo (030) com caminho_arquivo/bucket/tamanho_bytes/tipo_evidencia
      const payloadSchemaNovo = {
        plano_acao_id: planoId,
        nome_arquivo: arquivo.name,
        caminho_arquivo: nomeArquivo,
        tamanho_bytes: arquivo.size,
        tipo_mime: arquivo.type,
        bucket: 'evidencias-planos-acao',
        tipo_evidencia: 'nao_conformidade',
      };
      const { data: evidenciaNovo, error: erroNovo } = await tentarInsertEvidencia(payloadSchemaNovo);

      let evidenciaFinal: EvidenciaPlanoAcao | null = null;
      if (!erroNovo) {
        evidenciaFinal = evidenciaNovo as EvidenciaPlanoAcao;
      } else {
        // Tentativa 2: schema antigo (20241213) com url_storage/tamanho/descricao
        const payloadSchemaAntigo = {
          plano_acao_id: planoId,
          nome_arquivo: arquivo.name,
          url_storage: publicUrl,
          tamanho: arquivo.size,
          tipo_mime: arquivo.type,
          descricao: '',
        };
        const { data: evidenciaAntigo, error: erroAntigo } = await tentarInsertEvidencia(payloadSchemaAntigo);
        if (!erroAntigo) {
          evidenciaFinal = evidenciaAntigo as EvidenciaPlanoAcao;
        } else {
          console.error('Erro ao salvar evidência no banco (ambos schemas falharam):', { erroNovo, erroAntigo });
          // Tentar deletar o arquivo do storage se o banco falhar
          await supabase.storage.from('evidencias-planos-acao').remove([nomeArquivo]);
          return NextResponse.json({ error: 'Erro ao salvar evidência' }, { status: 500 });
        }
      }

      return NextResponse.json({
        success: true,
        data: evidenciaFinal as EvidenciaPlanoAcao
      }, { status: 201 });

    } catch (uploadError) {
      console.error('Erro no processo de upload:', uploadError);
      return NextResponse.json({ error: 'Erro ao processar upload' }, { status: 500 });
    }

  } catch (error) {
    console.error('Erro na API de upload de evidência:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// GET /api/inspecoes/execucoes/[id]/planos-acao/[planoId]/evidencias - Listar evidências
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; planoId: string }> }
) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id, planoId } = await context.params;

    // Buscar plano de ação existente com fallback de coluna
    let planoValido: { id: string } | null = null;
    const { data: planoPorExecucaoNova, error: erroExecucaoNova } = await supabase
      .from('planos_acao')
      .select('id')
      .eq('id', planoId)
      .eq('execucao_inspecao_id', id)
      .single();

    if (planoPorExecucaoNova) {
      planoValido = planoPorExecucaoNova as { id: string };
    } else {
      const msgPlano = (erroExecucaoNova?.message || '') as string;
      if (msgPlano.includes('execucao_inspecao_id') || erroExecucaoNova?.code === 'PGRST204') {
        const { data: planoPorExecucaoAntiga } = await supabase
          .from('planos_acao')
          .select('id')
          .eq('id', planoId)
          .eq('execucao_id', id)
          .single();
        if (planoPorExecucaoAntiga) {
          planoValido = planoPorExecucaoAntiga as { id: string };
        }
      } else {
        const { data: planoPorExecucaoAntiga } = await supabase
          .from('planos_acao')
          .select('id')
          .eq('id', planoId)
          .eq('execucao_id', id)
          .single();
        if (planoPorExecucaoAntiga) {
          planoValido = planoPorExecucaoAntiga as { id: string };
        }
      }
    }

    if (!planoValido) {
      return NextResponse.json({ error: 'Plano de ação não encontrado' }, { status: 404 });
    }

    // Buscar execução para verificar acesso
    const { data: execucao } = await supabase
      .from('execucoes_inspecao')
      .select('id, matricula_executor')
      .eq('id', id)
      .single();

    if (!execucao) {
      return NextResponse.json({ error: 'Execução não encontrada' }, { status: 404 });
    }

    // Verificar permissões
    const podeVisualizar = 
      execucao.matricula_executor === authResult.user?.matricula ||
      authResult.user?.role === 'Admin' ||
      authResult.user?.role === 'Editor';

    if (!podeVisualizar) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Buscar evidências do plano
    const { data: evidencias, error } = await supabase
      .from('evidencias_plano_acao')
      .select('*')
      .eq('plano_acao_id', planoId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar evidências:', error);
      return NextResponse.json({ error: 'Erro ao buscar evidências' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: evidencias as EvidenciaPlanoAcao[]
    });

  } catch (error) {
    console.error('Erro na API de listagem de evidências:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}