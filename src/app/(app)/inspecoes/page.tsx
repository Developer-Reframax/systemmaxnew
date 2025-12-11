'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import {
  ClipboardList,
  ClipboardCheck,
  FileText,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Package,
  Layers,
  Play
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

export default function InspecoesDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inspeções</h1>
            <p className="text-gray-600">
              Olá, {user?.nome || 'colaborador'}! Visão geral, atalhos rápidos e estatísticas das inspeções.
            </p>
          </div>
          <Button onClick={() => router.push('/inspecoes/executar')}>
            Iniciar inspeção
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => (
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
                    {stats.resumo_geral.media_conformidade.toFixed(1)}%
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
                            Média {form.media_conformidade.toFixed(1)}%
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
                            {execucao.nota_final !== null && (
                              <p className="text-xs text-gray-600 mt-1">
                                Nota {execucao.nota_final.toFixed(1)}%
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
