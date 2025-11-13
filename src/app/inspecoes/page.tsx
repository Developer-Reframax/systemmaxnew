'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ClipboardCheck, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  Settings,
  Play,
  BarChart3,
  FolderOpen
} from 'lucide-react';
import { toast } from 'sonner';

interface DashboardStats {
  resumo_geral: {
    total_formularios: number;
    formularios_ativos: number;
    total_execucoes: number;
    execucoes_em_andamento: number;
    execucoes_concluidas: number;
    media_conformidade: number;
  };
  execucoes_recentes: Array<{
    id: string;
    formulario_titulo: string;
    categoria_nome: string;
    local_nome: string;
    executor_nome: string;
    status: string;
    nota_final: number | null;
    data_inicio: string;
  }>;
  formularios_mais_usados: Array<{
    id: string;
    titulo: string;
    categoria_nome: string;
    total_execucoes: number;
    media_conformidade: number;
  }>;
}

function InspecoesDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        return;
      }

      const response = await fetch('/api/inspecoes/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar dados do dashboard');
      }

      const data = await response.json();
      setStats(data.data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const canManageCategories = () => {
    return user && ['Admin', 'Editor'].includes(user.role);
  };

  const canManageForms = () => {
    return user && ['Admin', 'Editor'].includes(user.role);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concluida':
        return 'bg-green-100 text-green-800';
      case 'em_andamento':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelada':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inspeções e Checks</h1>
            <p className="text-gray-600">Sistema de inspeções e verificações de conformidade</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => router.push('/inspecoes/executar')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Play className="w-4 h-4 mr-2" />
              Executar Inspeção
            </Button>
            {canManageForms() && (
              <Button 
                onClick={() => router.push('/inspecoes/formularios/novo')}
                variant="outline"
              >
                <FileText className="w-4 h-4 mr-2" />
                Novo Formulário
              </Button>
            )}
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Formulários Ativos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.resumo_geral.formularios_ativos || 0}</div>
              <p className="text-xs text-muted-foreground">
                de {stats?.resumo_geral.total_formularios || 0} formulários
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Execuções em Andamento</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.resumo_geral.execucoes_em_andamento || 0}</div>
              <p className="text-xs text-muted-foreground">
                Aguardando conclusão
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Execuções Concluídas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.resumo_geral.execucoes_concluidas || 0}</div>
              <p className="text-xs text-muted-foreground">
                Últimos 30 dias
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Média de Conformidade</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.resumo_geral.media_conformidade ? 
                  `${stats.resumo_geral.media_conformidade.toFixed(1)}%` : '0%'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Últimos 30 dias
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Menu de Navegação */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/inspecoes/executar')}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ClipboardCheck className="w-5 h-5 mr-2 text-blue-600" />
                Executar Inspeções
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Visualize formulários disponíveis e execute inspeções</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/inspecoes/execucoes')}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-green-600" />
                Histórico de Execuções
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Acompanhe o histórico e resultados das inspeções</p>
            </CardContent>
          </Card>

          {canManageForms() && (
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/inspecoes/formularios/novo')}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-orange-600" />
                  Criar Formulário
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Criar novos formulários de inspeção</p>
              </CardContent>
            </Card>
          )}

          {canManageCategories() && (
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/inspecoes/categorias')}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FolderOpen className="w-5 h-5 mr-2 text-purple-600" />
                  Gestão de Categorias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Gerenciar categorias de formulários</p>
              </CardContent>
            </Card>
          )}

          {canManageForms() && (
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/inspecoes/formularios')}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-red-600" />
                  Gestão de Formulários
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Gerenciar formulários existentes</p>
              </CardContent>
            </Card>
          )}

          {/* Não Conformidades (Gestores) */}
          {(user && (['Admin', 'Editor', 'Gestor'].includes(user.role))) && (
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/inspecoes/nao-conformidades')}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
                  Não Conformidades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Acompanhe as não conformidades do seu contrato</p>
              </CardContent>
            </Card>
          )}

          {/* Minhas Ações (Responsáveis) */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/inspecoes/minhas-acoes')}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                Minhas Ações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Gerencie os planos de ação atribuídos a você</p>
            </CardContent>
          </Card>
        </div>

        {/* Execuções Recentes */}
        {stats?.execucoes_recentes && stats.execucoes_recentes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ClipboardCheck className="w-5 h-5 mr-2 text-blue-600" />
                Execuções Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.execucoes_recentes.slice(0, 5).map((execucao) => (
                  <div 
                    key={execucao.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                    onClick={() => router.push(`/inspecoes/execucoes/${execucao.id}`)}
                  >
                    <div>
                      <p className="font-medium">{execucao.formulario_titulo}</p>
                      <p className="text-sm text-gray-600">
                        {execucao.categoria_nome} • {execucao.local_nome}
                      </p>
                      <p className="text-sm text-gray-500">
                        Executor: {execucao.executor_nome}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(execucao.status)}>
                        {getStatusText(execucao.status)}
                      </Badge>
                      {execucao.nota_final !== null && (
                        <p className="text-sm text-gray-600 mt-1">
                          Nota: {execucao.nota_final.toFixed(1)}%
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(execucao.data_inicio).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
                {stats.execucoes_recentes.length > 5 && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push('/inspecoes/execucoes')}
                  >
                    Ver todas as execuções
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Formulários Mais Usados */}
        {stats?.formularios_mais_usados && stats.formularios_mais_usados.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                Formulários Mais Utilizados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.formularios_mais_usados.map((formulario, index) => (
                  <div key={formulario.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-medium text-green-600">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium">{formulario.titulo}</p>
                        <p className="text-sm text-gray-600">{formulario.categoria_nome}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">
                        {formulario.total_execucoes} execuções
                      </Badge>
                      <p className="text-sm text-gray-600 mt-1">
                        Média: {formulario.media_conformidade.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}

export default InspecoesDashboard;
