'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  User,
  MessageSquare,
  Download,
  Edit
} from 'lucide-react';
import { toast } from 'sonner';
import PlanosAcaoList from '@/components/inspecoes/PlanosAcaoList';
import jsPDF from 'jspdf';
import { PlanoAcaoWithRelations } from '@/types/plano-acao';

interface ExecucaoDetalhes {
  id: string;
  formulario: {
    id: string;
    titulo: string;
    check_list?: boolean;
    categoria: {
      nome: string;
    };
    perguntas?: Array<{
      id: string;
      pergunta: string;
      ordem: number;
      resposta_atual?: {
        resposta: string;
        observacoes?: string;
      } | null;
    }>;
  };
  local: {
    id: string;
    local: string;
    contrato?: string | null;
    contrato_nome?: string | null;
  };
  tag_equipamento?: string | null;
  equipamento?: {
    id?: string;
    tag: string;
    nome?: string | null;
  } | null;
  executor: {
    matricula: string;
    nome: string;
    email: string;
  };
  contrato?: string | null;
  contrato_info?: {
    codigo: string;
    nome?: string | null;
  } | null;
  status: 'em_andamento' | 'concluida' | 'cancelada';
  nota_conformidade: number | null;
  nota_final?: number | null;
  data_inicio: string;
  data_conclusao: string | null;
  participantes: Array<{
    matricula_participante: string;
    participante: {
      matricula: string;
      nome: string;
      email: string;
    };
  }>;
  respostas: Array<{
    pergunta_id: string;
    resposta: 'conforme' | 'nao_conforme' | 'nao_aplica';
    observacoes: string | null;
    pergunta: {
      id: string;
      pergunta: string;
      ordem: number;
    };
  }>;
}

function DetalhesExecucaoPage() {
  const router = useRouter();
  const params = useParams();
  const [execucao, setExecucao] = useState<ExecucaoDetalhes | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchExecucao = useCallback(async () => {
    try {
      if (!params?.id) {
        console.log('ID não encontrado:', { id: params?.id });
        return;
      }
      
      const response = await fetch(`/api/inspecoes/execucoes/${params.id}`, {
       method: 'GET'
      });

      console.log('Resposta da API:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        let errorMessage = 'Erro ao carregar execu+º+úo';
        
        try {
          const errorData = await response.json();
          console.error('Erro da API:', errorData);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('Erro ao fazer parse da resposta de erro:', parseError);
        }

        if (response.status === 404) {
          toast.error('Execu+º+úo n+úo encontrada');
          router.push('/inspecoes/execucoes');
          return;
        } else if (response.status === 401) {
          toast.error('Acesso n+úo autorizado');
          router.push('/login');
          return;
        } else if (response.status === 403) {
          toast.error('Acesso negado a esta execu+º+úo');
          router.push('/inspecoes/execucoes');
          return;
        }
        
        toast.error(errorMessage);
        router.push('/inspecoes/execucoes');
        return;
      }

      const data = await response.json();
      console.log('Dados recebidos da API:', data);
      
      if (!data.success || !data.data) {
        console.error('Estrutura de resposta inv+ílida:', data);
        toast.error('Dados da execu+º+úo inv+ílidos');
        router.push('/inspecoes/execucoes');
        return;
      }

      setExecucao(data.data);
    } catch (error) {
      console.error('Erro ao carregar execu+º+úo:', error);
      toast.error('Erro de conex+úo ao carregar execu+º+úo');
      router.push('/inspecoes/execucoes');
    } finally {
      setLoading(false);
    }
  }, [params?.id, router]);

  useEffect(() => {
    fetchExecucao();
  }, [fetchExecucao]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'concluida':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'em_andamento':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'cancelada':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'concluida':
        return 'Concluída';
      case 'em_andamento':
        return 'Em Andamento';
      case 'cancelada':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concluida':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'em_andamento':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelada':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRespostaIcon = (valor: string) => {
    switch (valor) {
      case 'conforme':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'nao_conforme':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'nao_aplica':
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const getRespostaLabel = (valor: string) => {
    switch (valor) {
      case 'conforme':
        return 'Conforme';
      case 'nao_conforme':
        return 'Não Conforme';
      case 'nao_aplica':
        return 'Não se Aplica';
      default:
        return valor;
    }
  };

  const getRespostaColor = (valor: string) => {
    switch (valor) {
      case 'conforme':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'nao_conforme':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'nao_aplica':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const fetchPlanosAcao = useCallback(async (): Promise<PlanoAcaoWithRelations[]> => {
    if (!execucao?.id) return [];
    try {
      const response = await fetch(`/api/inspecoes/execucoes/${execucao.id}/planos-acao`, {
        method: 'GET'
      });
      if (!response.ok) return [];
      const data = await response.json();
      return (data.data as PlanoAcaoWithRelations[]) || [];
    } catch (error) {
      console.error('Erro ao buscar planos de ação para PDF:', error);
      return [];
    }
  }, [execucao?.id]);

  const loadImageAsDataUrl = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const blob = await response.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Erro ao carregar imagem da evidência:', error);
      return null;
    }
  };

  const addNewPageIfNeeded = (doc: jsPDF, currentY: number, margin: number) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (currentY > pageHeight - margin) {
      doc.addPage();
      return margin;
    }
    return currentY;
  };

  const addInfoRow = (doc: jsPDF, label: string, value: string, x: number, y: number, width: number) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(label, x, y);
    doc.setFont('helvetica', 'normal');
    const wrapped = doc.splitTextToSize(value || '-', width);
    doc.text(wrapped, x, y + 14);
    return y + 14 + wrapped.length * 12;
  };

  const notaFinalValor = typeof execucao?.nota_final === 'number'
    ? execucao.nota_final
    : (typeof execucao?.nota_conformidade === 'number' ? execucao.nota_conformidade : null);
  const notaFinalTexto = notaFinalValor != null ? `${notaFinalValor.toFixed(1)}%` : 'N/A';
  const notaFinalCor = (() => {
    if (notaFinalValor == null) return 'bg-gray-100 text-gray-700 border-gray-200';
    if (notaFinalValor >= 90) return 'bg-green-100 text-green-800 border-green-200';
    if (notaFinalValor >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  })();

  const canEdit = () => {
    return execucao?.status === 'em_andamento';
  };

  const handleExportPDF = async () => {
    if (!execucao) {
      toast.error('Execução não carregada');
      return;
    }
    setExporting(true);
    try {
      const planos = await fetchPlanosAcao();
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const margin = 40;
      const contentWidth = doc.internal.pageSize.getWidth() - margin * 2;
      let y = margin;
      const pageHeight = doc.internal.pageSize.getHeight();

      const ensureSpace = (needed: number) => {
        if (y + needed > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
      };

      const sectionTitle = (title: string) => {
        ensureSpace(32);
        doc.setDrawColor(220);
        doc.setFillColor(245, 247, 250);
        doc.rect(margin, y, contentWidth, 26, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(title, margin + 6, y + 17);
        y += 32;
      };

      const perguntaTexto = (perguntaId: string | undefined, perguntaAtual?: { id?: string; pergunta?: string }) => {
        const id = perguntaId || perguntaAtual?.id || '';
        if (perguntaAtual?.pergunta) return perguntaAtual.pergunta;
        const fallback = execucao.formulario.perguntas?.find((p) => p.id === id);
        return fallback?.pergunta || 'Pergunta não informada';
      };

      // Cabeçalho
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('Relatório de Inspeção', margin, y);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      y += 20;
      doc.setTextColor(90);
      doc.text(`ID: ${execucao.id}`, margin, y);
      y += 14;
      doc.text(`Formulário: ${execucao.formulario.titulo}`, margin, y);
      y += 14;
      doc.text(`Categoria: ${execucao.formulario.categoria.nome}`, margin, y);
      y += 10;
      doc.setDrawColor(200);
      doc.line(margin, y, margin + contentWidth, y);
      y += 12;
      doc.setTextColor(0);

      // Dados da Execução
      sectionTitle('Dados da Execução');
      y += 8;
      const blocoWidth = contentWidth / 2 - 10;
      const bloco2X = margin + blocoWidth + 20;
      let leftY = y;
      let rightY = y;

      leftY = addInfoRow(doc, 'Status', getStatusLabel(execucao.status), margin, leftY, blocoWidth);
      leftY = addInfoRow(doc, 'Início', formatDate(execucao.data_inicio), margin, leftY, blocoWidth);
      if (execucao.data_conclusao) {
        leftY = addInfoRow(doc, 'Conclusão', formatDate(execucao.data_conclusao), margin, leftY, blocoWidth);
      }
      leftY = addInfoRow(doc, 'Local', execucao.local.local, margin, leftY, blocoWidth);
      const contratoCodigo = execucao.contrato || 'N/A';
      const contratoNome = execucao.contrato_info?.nome ? ` - ${execucao.contrato_info.nome}` : '';
      leftY = addInfoRow(doc, 'Contrato', `${contratoCodigo}${contratoNome}`, margin, leftY, blocoWidth);

      rightY = addInfoRow(doc, 'Executor', `${execucao.executor.nome} (${execucao.executor.matricula})`, bloco2X, rightY, blocoWidth);
      rightY = addInfoRow(doc, 'E-mail', execucao.executor.email, bloco2X, rightY, blocoWidth);
      rightY = addInfoRow(doc, 'Participantes', execucao.participantes.map((p) => p.participante.nome).join(', ') || 'Nenhum', bloco2X, rightY, blocoWidth);
      rightY = addInfoRow(doc, 'Nota Final', notaFinalTexto, bloco2X, rightY, blocoWidth);

      y = Math.max(leftY, rightY) + 10;
      y = addNewPageIfNeeded(doc, y, margin);

      // Equipamento (apenas se execucao possui tag de equipamento preenchida)
      if (execucao.tag_equipamento && execucao.tag_equipamento.trim() !== '') {
        sectionTitle('Equipamento');
        y += 8; // espaçamento após o título do bloco
        const blocoWidthEquip = contentWidth / 2 - 10;
        const bloco2XEquip = margin + blocoWidthEquip + 20;
        const nomeEquipamento = execucao.equipamento?.nome || 'Nao informado';
        const tagEquipamento = execucao.equipamento?.tag || execucao.tag_equipamento || 'Nao informado';
        let equipLeftY = y;
    let equipRightY = y;

    equipLeftY = addInfoRow(doc, 'Equipamento', nomeEquipamento, margin, equipLeftY, blocoWidthEquip);
    equipRightY = addInfoRow(doc, 'Tag', tagEquipamento, bloco2XEquip, equipRightY, blocoWidthEquip);

    y = Math.max(equipLeftY, equipRightY) + 6;
    y = addNewPageIfNeeded(doc, y, margin);
  }

      // Perguntas e Respostas
      sectionTitle('Perguntas e Respostas');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setFillColor(240, 243, 247);
      doc.rect(margin, y, contentWidth, 22, 'F');
      doc.text('Pergunta', margin + 8, y + 15);
      doc.text('Resposta', margin + contentWidth / 2, y + 15);
      y += 28;
      doc.setFont('helvetica', 'normal');

      const respostasOrdenadas = [...execucao.respostas].sort((a, b) => a.pergunta.ordem - b.pergunta.ordem);
      for (const resp of respostasOrdenadas) {
        const ordem = resp.pergunta?.ordem ?? execucao.formulario.perguntas?.find((p) => p.id === resp.pergunta_id)?.ordem ?? 0;
        const perguntaLabel = `${ordem}. ${perguntaTexto(resp.pergunta_id, resp.pergunta)}`;
        const respostaLabel = getRespostaLabel(resp.resposta);
        const obsTexto = resp.observacoes ? `Obs: ${resp.observacoes}` : '';

        const perguntaLines = doc.splitTextToSize(perguntaLabel, contentWidth / 2 - 12);
        const respostaLines = doc.splitTextToSize([respostaLabel, obsTexto].filter(Boolean).join(' | '), contentWidth / 2 - 12);
        const blockHeight = Math.max(perguntaLines.length, respostaLines.length) * 14 + 10;
        ensureSpace(blockHeight);
        doc.text(perguntaLines, margin + 8, y + 12);
        doc.text(respostaLines, margin + contentWidth / 2, y + 12);
        doc.setDrawColor(235);
        doc.line(margin, y + blockHeight - 6, margin + contentWidth, y + blockHeight - 6);
        y += blockHeight;
      }

      y = addNewPageIfNeeded(doc, y, margin);

      // Planos de Ação
      sectionTitle('Planos de Ação');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setFillColor(240, 243, 247);
      doc.rect(margin, y, contentWidth, 22, 'F');
      doc.text('Plano', margin + 8, y + 15);
      doc.text('Detalhes', margin + contentWidth / 2, y + 15);
      y += 34;
      doc.setFont('helvetica', 'normal');

      const planosComPergunta = planos as Array<PlanoAcaoWithRelations & { pergunta?: string | { pergunta?: string } }>;

      if (planosComPergunta.length === 0) {
        doc.text('Nenhum plano de ação cadastrado.', margin, y);
        y += 14;
      } else {
        for (const plano of planosComPergunta) {
          const perguntaPlano = (() => {
            const raw = plano.pergunta as unknown;
            if (typeof raw === 'string') return raw;
            if (raw && typeof raw === 'object' && 'pergunta' in (raw as Record<string, unknown>)) {
              const texto = (raw as { pergunta?: string }).pergunta;
              if (typeof texto === 'string') return texto;
            }
            const fallback = execucao.formulario.perguntas?.find((p) => p.id === plano.pergunta_id)?.pergunta;
            return fallback || '—';
          })();

          const linhas = [
            `Descrição: ${plano.desvio || '—'}`,
            `O que fazer: ${plano.o_que_fazer || '—'}`,
            `Como fazer: ${plano.como_fazer || '—'}`,
            `Status: ${plano.status} | Prioridade: ${plano.prioridade}`,
            `Prazo: ${plano.prazo ? new Date(plano.prazo).toLocaleDateString('pt-BR') : 'N/A'}`,
            `Responsável: ${plano.responsavel_info?.nome || plano.responsavel_matricula}`,
            `Pergunta: ${perguntaPlano}`
          ];

          const alturaLinhas = linhas.reduce((acc, linha) => acc + doc.splitTextToSize(linha, contentWidth - 16).length * 14 + 6, 0);
          ensureSpace(alturaLinhas + 10);
          doc.setFont('helvetica', 'normal');

          linhas.forEach((linha) => {
            const wrapped = doc.splitTextToSize(linha, contentWidth - 16);
            doc.text(wrapped, margin + 8, y);
            y += wrapped.length * 14 + 6;
          });

          if (plano.evidencias && plano.evidencias.length > 0) {
            for (const evidencia of plano.evidencias) {
              const legenda = `Evidência: ${evidencia.nome_arquivo}`;
              const wrapLegenda = doc.splitTextToSize(legenda, contentWidth);
              ensureSpace(wrapLegenda.length * 14 + 6);
              doc.text(wrapLegenda, margin, y);
              y += wrapLegenda.length * 14 + 4;

              const urlEvidencia = evidencia.url_storage || null;
              if (urlEvidencia) {
                const dataUrl = await loadImageAsDataUrl(urlEvidencia);
                if (dataUrl) {
                  const imgHeight = 120;
                  ensureSpace(imgHeight + 10);
                  doc.addImage(dataUrl, 'JPEG', margin, y, contentWidth, imgHeight);
                  y += imgHeight + 8;
                }
              }
            }
          }

          doc.setDrawColor(230);
          doc.line(margin, y, margin + contentWidth, y);
          y += 12;
          y = addNewPageIfNeeded(doc, y, margin);
        }
      }

      doc.save(`inspecao-${execucao.id}.pdf`);
      toast.success('PDF gerado com sucesso');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
        <div className="container mx-auto p-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
    );
  }

  if (!execucao) {
    return (
        <div className="container mx-auto p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Execu+º+úo n+úo encontrada</h1>
            <Button onClick={() => router.push('/inspecoes/execucoes')} className="mt-4">
              Voltar ao Hist+¦rico
            </Button>
          </div>
        </div>
    );
  }

  return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/inspecoes/execucoes')}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{execucao.formulario.titulo}</h1>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-gray-600">{execucao.formulario.categoria.nome}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={handleExportPDF} disabled={exporting}>
              {exporting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Exportar PDF
            </Button>
            {canEdit() && (
              <Button
                onClick={() => router.push(`/inspecoes/execucoes/continuar/${execucao.id}`)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                Continuar Edição
              </Button>
            )}
          </div>
        </div>

        {/* Status e Informa+º+Áes Gerais */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <Card className="relative">
            <CardHeader className="relative">
              <CardTitle className="flex items-center space-x-2">
                {getStatusIcon(execucao.status)}
                <span>Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative space-y-3">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(execucao.status)}`}>
                {getStatusLabel(execucao.status)}
              </div>
              <p className="text-xs text-gray-600">Situação atual da execução.</p>
            </CardContent>
          </Card>

          <Card className="relative">
            <CardHeader className="relative">
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-emerald-700" />
                <span>Datas</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Início</div>
                  <div className="font-semibold text-gray-900">{formatDate(execucao.data_inicio)}</div>
                </div>
              </div>
              {execucao.data_conclusao && (
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Conclusão</div>
                    <div className="font-semibold text-gray-900">{formatDate(execucao.data_conclusao)}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="relative">
            <CardHeader className="relative">
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-indigo-700" />
                <span>Local</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-indigo-700" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{execucao.local.local}</div>
                  <p className="text-xs text-gray-600">Local da execução</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 relative">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>Nota da Inspeção</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resultado final</p>
                <p className="text-xs text-gray-500">Média ponderada da execução</p>
              </div>
              <div className={`flex items-center justify-center w-20 h-20 rounded-full border-4 ${notaFinalCor}`}>
                <span className="text-xl font-bold">{notaFinalTexto}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Executor e Participantes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Executor</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium">{execucao.executor.nome}</div>
                  <div className="text-sm text-gray-600">{execucao.executor.email}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Participantes ({execucao.participantes.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {execucao.participantes.map((participante, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{participante.participante.nome}</div>
                      <div className="text-xs text-gray-600">{participante.participante.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Respostas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Respostas ({execucao.respostas.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {execucao.respostas
                .sort((a, b) => a.pergunta.ordem - b.pergunta.ordem)
                .map((resposta) => (
                  <div key={resposta.pergunta.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            Pergunta {resposta.pergunta.ordem}
                          </span>
                        </div>
                        <h4 className="font-medium text-gray-900 mb-3">
                          {resposta.pergunta.pergunta}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getRespostaColor(resposta.resposta)}`}>
                        {getRespostaIcon(resposta.resposta)}
                        <span className="ml-2">{getRespostaLabel(resposta.resposta)}</span>
                      </div>
                    </div>

                    {resposta.observacoes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <MessageSquare className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-700">Observa+º+úo</span>
                        </div>
                        <p className="text-sm text-gray-600">{resposta.observacoes}</p>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Planos de A+º+úo */}
        <PlanosAcaoList
          execucaoId={execucao.id}
          usuarios={[execucao.executor, ...execucao.participantes.map(p => p.participante)].map(user => ({
            ...user,
            matricula: parseInt(user.matricula)
          }))}
          canEdit={canEdit()}
          execucaoStatus={execucao.status}
        />

      </div>
  );
}

export default DetalhesExecucaoPage;






