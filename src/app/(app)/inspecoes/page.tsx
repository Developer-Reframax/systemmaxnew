'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/contexts/PermissionsContext';
import * as ExcelJS from 'exceljs';
import { toast } from 'sonner';
import {
  ClipboardList,
  ClipboardCheck,
  FileText,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Package,
  Layers,
  Play,
  Download
} from 'lucide-react';

interface ExecucaoRecente {
  id: string;
  formulario_titulo: string;
  categoria_nome: string;
  local_nome: string;
  executor_nome: string;
  status: string;
  nota_final: number | null;
  data_inicio: string;
}

interface FormularioMaisUsado {
  id: string;
  titulo: string;
  categoria_nome: string;
  total_execucoes: number;
  media_conformidade: number;
}

interface ResumoGeral {
  total_formularios: number;
  formularios_ativos: number;
  total_execucoes: number;
  execucoes_em_andamento: number;
  execucoes_concluidas: number;
  media_conformidade: number;
}

interface StatsData {
  resumo_geral: ResumoGeral;
  execucoes_recentes: ExecucaoRecente[];
  formularios_mais_usados: FormularioMaisUsado[];
}

interface InspecaoExportParticipante {
  matricula: number | string | null;
  nome: string | null;
  email: string | null;
  funcao: string | null;
  contrato_raiz: string | null;
}

interface InspecaoExportResposta {
  pergunta: string | null;
  resposta: string | null;
  observacoes: string | null;
}

interface InspecaoExportExecucao {
  referencia: string;
  contrato: string;
  status: string | null;
  data_inicio: string | null;
  data_conclusao: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
  nota_final: number | null;
  observacoes_gerais: string | null;
  tag_equipamento: string | null;
  formulario: string;
  categoria: string | null;
  tipo_formulario: string;
  local: string;
  executor: {
    matricula: number | null;
    nome: string | null;
    email: string | null;
    funcao: string | null;
    contrato_raiz: string | null;
  };
  participantes: InspecaoExportParticipante[];
  respostas: InspecaoExportResposta[];
}

interface InspecaoExportResponse {
  contrato: string;
  exportado_em: string;
  execucoes: InspecaoExportExecucao[];
}

export default function InspecoesDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { permissions, loading: permissionsLoading } = usePermissions();
  const INSPECAO_SESMT_FUNC_SLUG = 'inspecao-sesmt';

  const canAccessInspecaoSesmt = !!permissions?.modulos.some((modulo) =>
    modulo.funcionalidades.some((funcionalidade) => funcionalidade.slug === INSPECAO_SESMT_FUNC_SLUG)
  );

  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/inspecoes/stats', {
       method: 'GET'
      });

      if (!response.ok) {
        throw new Error('Não foi possível carregar as estatísticas.');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Erro ao carregar estatísticas.');
      }

      setStats(data.data as StatsData);
    } catch (err) {
      console.error('Erro ao carregar dashboard de inspeções:', err);
      setError(err instanceof Error ? err.message : 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const quickActions = [
    {
      title: 'Formulários',
      description: 'Gerencie formulários de inspeção',
      icon: <ClipboardList className="w-5 h-5 text-blue-600" />,
      href: '/inspecoes/formularios'
    },
    {
      title: 'Executar inspeção',
      description: 'Inicie uma nova inspeção',
      icon: <Play className="w-5 h-5 text-green-600" />,
      href: '/inspecoes/executar'
    },
    {
      title: 'Execuções',
      description: 'Acompanhe inspeções em andamento',
      icon: <ClipboardCheck className="w-5 h-5 text-indigo-600" />,
      href: '/inspecoes/execucoes'
    },
    {
      title: 'Não conformidades',
      description: 'Trate registros de não conformidade',
      icon: <AlertCircle className="w-5 h-5 text-red-600" />,
      href: '/inspecoes/nao-conformidades'
    },
    {
      title: 'Minhas ações',
      description: 'Acompanhe planos de ação',
      icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
      href: '/inspecoes/minhas-acoes'
    },
    {
      title: 'Equipamentos',
      description: 'Cadastro e gestão de equipamentos',
      icon: <Package className="w-5 h-5 text-purple-600" />,
      href: '/inspecoes/equipamentos'
    }
  ];

  const filteredQuickActions = quickActions.filter((action) => {
    const isRestrictedCard =
      action.href === '/inspecoes/formularios' || action.href === '/inspecoes/equipamentos';

    if (!isRestrictedCard) {
      return true;
    }

    return !permissionsLoading && canAccessInspecaoSesmt;
  });

  const getStatusProps = (status: string) => {
    switch (status) {
      case 'em_andamento':
        return {
          label: 'Em andamento',
          className: 'bg-amber-100 text-amber-800 border-amber-200'
        };
      case 'concluida':
        return {
          label: 'Concluída',
          className: 'bg-emerald-100 text-emerald-800 border-emerald-200'
        };
      default:
        return {
          label: 'Indefinido',
          className: 'bg-gray-100 text-gray-700 border-gray-200'
        };
    }
  };

  const formatPercentage = (value: number | null | undefined) => (
    typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : '0.0'
  );

  const formatDateTimeForExport = (value: string | null | undefined) => {
    if (!value) {
      return '-';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleString('pt-BR');
  };

  const formatStatusForExport = (status: string | null | undefined) => {
    if (!status) {
      return '-';
    }

    switch (status) {
      case 'em_andamento':
        return 'Em andamento';
      case 'concluida':
        return 'Concluida';
      case 'cancelada':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);

      const response = await fetch('/api/inspecoes/export', {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error('Nao foi possivel gerar o arquivo de inspecoes.');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Erro ao exportar inspecoes.');
      }

      const exportData = result.data as InspecaoExportResponse;
      const workbook = new ExcelJS.Workbook();
      const execucoesSheet = workbook.addWorksheet('Execucoes');
      const participantesSheet = workbook.addWorksheet('Participantes');
      const respostasSheet = workbook.addWorksheet('Respostas');

      execucoesSheet.columns = [
        { header: 'Referencia', key: 'referencia', width: 44 },
        { header: 'Formulario', key: 'formulario', width: 28 },
        { header: 'Categoria', key: 'categoria', width: 20 },
        { header: 'Tipo Formulario', key: 'tipo_formulario', width: 18 },
        { header: 'Contrato', key: 'contrato', width: 16 },
        { header: 'Local', key: 'local', width: 24 },
        { header: 'Status', key: 'status', width: 16 },
        { header: 'Data Inicio', key: 'data_inicio', width: 20 },
        { header: 'Data Conclusao', key: 'data_conclusao', width: 20 },
        { header: 'Criado Em', key: 'criado_em', width: 20 },
        { header: 'Atualizado Em', key: 'atualizado_em', width: 20 },
        { header: 'Nota Final (%)', key: 'nota_final', width: 16 },
        { header: 'Executor', key: 'executor_nome', width: 24 },
        { header: 'Executor Matricula', key: 'executor_matricula', width: 18 },
        { header: 'Executor Email', key: 'executor_email', width: 30 },
        { header: 'Executor Funcao', key: 'executor_funcao', width: 22 },
        { header: 'Executor Contrato', key: 'executor_contrato', width: 18 },
        { header: 'Qtd Participantes', key: 'qtd_participantes', width: 18 },
        { header: 'Participantes', key: 'participantes', width: 45 },
        { header: 'Qtd Respostas', key: 'qtd_respostas', width: 16 },
        { header: 'Tag Equipamento', key: 'tag_equipamento', width: 20 },
        { header: 'Observacoes Gerais', key: 'observacoes_gerais', width: 50 }
      ];

      participantesSheet.columns = [
        { header: 'Referencia', key: 'referencia', width: 44 },
        { header: 'Formulario', key: 'formulario', width: 28 },
        { header: 'Local', key: 'local', width: 24 },
        { header: 'Status', key: 'status', width: 16 },
        { header: 'Executor', key: 'executor', width: 24 },
        { header: 'Participante', key: 'participante_nome', width: 24 },
        { header: 'Matricula', key: 'participante_matricula', width: 18 },
        { header: 'Email', key: 'participante_email', width: 30 },
        { header: 'Funcao', key: 'participante_funcao', width: 22 },
        { header: 'Contrato Raiz', key: 'participante_contrato', width: 18 }
      ];

      respostasSheet.columns = [
        { header: 'Referencia', key: 'referencia', width: 44 },
        { header: 'Formulario', key: 'formulario', width: 28 },
        { header: 'Local', key: 'local', width: 24 },
        { header: 'Executor', key: 'executor', width: 24 },
        { header: 'Status', key: 'status', width: 16 },
        { header: 'Pergunta', key: 'pergunta', width: 50 },
        { header: 'Resposta', key: 'resposta', width: 20 },
        { header: 'Observacoes', key: 'observacoes', width: 50 }
      ];

      exportData.execucoes.forEach((execucao) => {
        const participantesResumo = execucao.participantes.length > 0
          ? execucao.participantes
              .map((participante) => {
                const nome = participante.nome || 'Participante sem nome';
                const matricula = participante.matricula || '-';
                return `${nome} (${matricula})`;
              })
              .join('; ')
          : '-';

        execucoesSheet.addRow({
          referencia: execucao.referencia,
          formulario: execucao.formulario,
          categoria: execucao.categoria || '-',
          tipo_formulario: execucao.tipo_formulario,
          contrato: execucao.contrato,
          local: execucao.local,
          status: formatStatusForExport(execucao.status),
          data_inicio: formatDateTimeForExport(execucao.data_inicio),
          data_conclusao: formatDateTimeForExport(execucao.data_conclusao),
          criado_em: formatDateTimeForExport(execucao.criado_em),
          atualizado_em: formatDateTimeForExport(execucao.atualizado_em),
          nota_final: typeof execucao.nota_final === 'number' ? execucao.nota_final.toFixed(1) : '-',
          executor_nome: execucao.executor.nome || '-',
          executor_matricula: execucao.executor.matricula || '-',
          executor_email: execucao.executor.email || '-',
          executor_funcao: execucao.executor.funcao || '-',
          executor_contrato: execucao.executor.contrato_raiz || '-',
          qtd_participantes: execucao.participantes.length,
          participantes: participantesResumo,
          qtd_respostas: execucao.respostas.length,
          tag_equipamento: execucao.tag_equipamento || '-',
          observacoes_gerais: execucao.observacoes_gerais || '-'
        });

        if (execucao.participantes.length === 0) {
          participantesSheet.addRow({
            referencia: execucao.referencia,
            formulario: execucao.formulario,
            local: execucao.local,
            status: formatStatusForExport(execucao.status),
            executor: execucao.executor.nome || '-',
            participante_nome: '-',
            participante_matricula: '-',
            participante_email: '-',
            participante_funcao: '-',
            participante_contrato: '-'
          });
        } else {
          execucao.participantes.forEach((participante) => {
            participantesSheet.addRow({
              referencia: execucao.referencia,
              formulario: execucao.formulario,
              local: execucao.local,
              status: formatStatusForExport(execucao.status),
              executor: execucao.executor.nome || '-',
              participante_nome: participante.nome || '-',
              participante_matricula: participante.matricula || '-',
              participante_email: participante.email || '-',
              participante_funcao: participante.funcao || '-',
              participante_contrato: participante.contrato_raiz || '-'
            });
          });
        }

        if (execucao.respostas.length === 0) {
          respostasSheet.addRow({
            referencia: execucao.referencia,
            formulario: execucao.formulario,
            local: execucao.local,
            executor: execucao.executor.nome || '-',
            status: formatStatusForExport(execucao.status),
            pergunta: '-',
            resposta: '-',
            observacoes: '-'
          });
        } else {
          execucao.respostas.forEach((resposta) => {
            respostasSheet.addRow({
              referencia: execucao.referencia,
              formulario: execucao.formulario,
              local: execucao.local,
              executor: execucao.executor.nome || '-',
              status: formatStatusForExport(execucao.status),
              pergunta: resposta.pergunta || '-',
              resposta: resposta.resposta || '-',
              observacoes: resposta.observacoes || '-'
            });
          });
        }
      });

      [execucoesSheet, participantesSheet, respostasSheet].forEach((sheet) => {
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6F3FF' }
        };
        sheet.views = [{ state: 'frozen', ySplit: 1 }];
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
      const fileName = `inspecoes_execucoes_${exportData.contrato}_${timestamp}.xlsx`;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success(`Arquivo ${fileName} exportado com sucesso.`);
    } catch (err) {
      console.error('Erro ao exportar execucoes de inspecao:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao exportar execucoes de inspecao.');
    } finally {
      setExporting(false);
    }
  };

  return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inspeções</h1>
            <p className="text-gray-600">
              Olá, {user?.nome || 'colaborador'}! Visão geral, atalhos rápidos e estatísticas das inspeções.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleExportExcel} disabled={exporting}>
              <Download className="w-4 h-4 mr-2" />
              {exporting ? 'Exportando...' : 'Exportar Excel'}
            </Button>
            <Button onClick={() => router.push('/inspecoes/executar')}>
            Iniciar inspeção
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuickActions.map((action) => (
            <Card
              key={action.href}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push(action.href)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold text-gray-900">
                  {action.title}
                </CardTitle>
                <div className="p-2 bg-gray-100 rounded-lg">
                  {action.icon}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{action.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-sm text-gray-800 font-medium">Erro ao carregar dashboard</p>
                  <p className="text-sm text-gray-600">{error}</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={fetchStats}>
                    Tentar novamente
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : stats ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-500">Formulários</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-semibold text-gray-900">
                    {stats.resumo_geral.total_formularios}
                  </div>
                  <p className="text-xs text-gray-500">
                    {stats.resumo_geral.formularios_ativos} ativos
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-500">Execuções</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-semibold text-gray-900">
                    {stats.resumo_geral.total_execucoes}
                  </div>
                  <p className="text-xs text-gray-500">histórico total</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-500">Em andamento</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-semibold text-gray-900">
                    {stats.resumo_geral.execucoes_em_andamento}
                  </div>
                  <p className="text-xs text-gray-500">execuções ativas</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-500">Concluídas (30d)</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-semibold text-gray-900">
                    {stats.resumo_geral.execucoes_concluidas}
                  </div>
                  <p className="text-xs text-gray-500">últimos 30 dias</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-500">Média conformidade</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-semibold text-gray-900">
                    {formatPercentage(stats.resumo_geral.media_conformidade)}%
                  </div>
                  <p className="text-xs text-gray-500">últimos 30 dias</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-500">Categorias</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-700">Organize seus formulários</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => router.push('/inspecoes/categorias')}
                  >
                    Ver categorias
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                      <span>Formulários mais usados</span>
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push('/inspecoes/formularios')}
                    >
                      Ver todos
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stats.formularios_mais_usados.length === 0 ? (
                    <p className="text-sm text-gray-600">Nenhum dado disponível.</p>
                  ) : (
                    stats.formularios_mais_usados.map((form) => (
                      <div key={form.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{form.titulo}</p>
                          <p className="text-xs text-gray-500">{form.categoria_nome}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-900">
                            {form.total_execucoes} execuções
                          </p>
                          <p className="text-xs text-gray-500">
                            Média {formatPercentage(form.media_conformidade)}%
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      <span>Execuções recentes</span>
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push('/inspecoes/execucoes')}
                    >
                      Ver todas
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stats.execucoes_recentes.length === 0 ? (
                    <p className="text-sm text-gray-600">Nenhuma execução registrada.</p>
                  ) : (
                    stats.execucoes_recentes.map((execucao) => {
                      const statusProps = getStatusProps(execucao.status);
                      return (
                        <div key={execucao.id} className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {execucao.formulario_titulo}
                            </p>
                            <p className="text-xs text-gray-500">
                              {execucao.categoria_nome} - {execucao.local_nome}
                            </p>
                            <p className="text-xs text-gray-500">
                              Executor: {execucao.executor_nome}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className={statusProps.className}>
                              {statusProps.label}
                            </Badge>
                            {typeof execucao.nota_final === 'number' && Number.isFinite(execucao.nota_final) && (
                              <p className="text-xs text-gray-600 mt-1">
                                Nota {formatPercentage(execucao.nota_final)}%
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </div>
  );
}
