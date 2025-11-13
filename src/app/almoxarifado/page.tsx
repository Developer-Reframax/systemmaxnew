'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  ShoppingCart, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  Users,
  FileText,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

interface DashboardStats {
  resumo_geral: {
    total_itens: number;
    itens_estoque_baixo: number;
    itens_zerados: number;
    total_requisicoes: number;
    requisicoes_pendentes: number;
    requisicoes_aprovadas: number;
    requisicoes_entregues: number;
    valor_total_requisicoes: number;
  };
  alertas_estoque: Array<{
    id: string;
    nome: string;
    categoria: string;
    estoque_atual: number;
    estoque_minimo: number;
  }>;
  usuarios_mais_ativos: Array<{
    matricula: string;
    nome: string;
    total_requisicoes: number;
  }>;
}

function AlmoxarifadoDashboard() {
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

      const response = await fetch('/api/almoxarifado/stats', {
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

  const canManageItems = () => {
    return user && ['Admin', 'Editor'].includes(user.role);
  };

  const canManageDeliveries = () => {
    return user && ['Admin', 'Editor'].includes(user.role);
  };

  const canApprove = () => {
    return user && ['Admin', 'Editor'].includes(user.role);
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
            <h1 className="text-3xl font-bold text-gray-900">Almoxarifado</h1>
            <p className="text-gray-600">Gestão de estoque e requisições</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => router.push('/almoxarifado/catalogo')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Nova Requisição
            </Button>
            {canManageItems() && (
              <Button 
                onClick={() => router.push('/almoxarifado/itens')}
                variant="outline"
              >
                <Settings className="w-4 h-4 mr-2" />
                Gerenciar Itens
              </Button>
            )}
          </div>
        </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.resumo_geral.total_itens || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.resumo_geral.itens_estoque_baixo || 0} com estoque baixo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requisições Pendentes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.resumo_geral.requisicoes_pendentes || 0}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando aprovação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requisições Entregues</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.resumo_geral.requisicoes_entregues || 0}</div>
            <p className="text-xs text-muted-foreground">
              Últimos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(stats?.resumo_geral.valor_total_requisicoes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Últimos 30 dias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Menu de Navegação */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/almoxarifado/catalogo')}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2 text-blue-600" />
              Catálogo de Itens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Visualize itens disponíveis e crie novas requisições</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/almoxarifado/minhas-requisicoes')}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2 text-green-600" />
              Minhas Requisições
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Acompanhe o status das suas requisições</p>
          </CardContent>
        </Card>

        {canApprove() && (
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/almoxarifado/aprovacoes')}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-orange-600" />
                Aprovações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Aprovar ou rejeitar requisições pendentes</p>
            </CardContent>
          </Card>
        )}

        {canManageDeliveries() && (
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/almoxarifado/entregas')}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="w-5 h-5 mr-2 text-purple-600" />
                Gestão de Entregas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Registrar entregas de itens requisitados</p>
            </CardContent>
          </Card>
        )}

        {canManageItems() && (
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/almoxarifado/itens')}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2 text-red-600" />
                Gestão de Itens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Cadastrar e gerenciar itens do almoxarifado</p>
            </CardContent>
          </Card>
        )}

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/almoxarifado/estoque')}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-indigo-600" />
              Controle de Estoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Visualizar movimentações e histórico de estoque</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de Estoque */}
      {stats?.alertas_estoque && stats.alertas_estoque.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
              Alertas de Estoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.alertas_estoque.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium">{item.nome}</p>
                    <p className="text-sm text-gray-600">{item.categoria}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive">
                      {item.estoque_atual === 0 ? 'Zerado' : 'Estoque Baixo'}
                    </Badge>
                    <p className="text-sm text-gray-600 mt-1">
                      Atual: {item.estoque_atual} | Mín: {item.estoque_minimo}
                    </p>
                  </div>
                </div>
              ))}
              {stats.alertas_estoque.length > 5 && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => router.push('/almoxarifado/estoque')}
                >
                  Ver todos os alertas ({stats.alertas_estoque.length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usuários Mais Ativos */}
      {stats?.usuarios_mais_ativos && stats.usuarios_mais_ativos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2 text-blue-600" />
              Usuários Mais Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.usuarios_mais_ativos.map((usuario, index) => (
                <div key={usuario.matricula} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium">{usuario.nome}</p>
                      <p className="text-sm text-gray-600">Mat: {usuario.matricula}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {usuario.total_requisicoes} requisições
                  </Badge>
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

export default AlmoxarifadoDashboard;