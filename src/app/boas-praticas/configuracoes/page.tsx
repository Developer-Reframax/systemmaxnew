'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft,
  Settings,
  FolderOpen,
  Target,
  Columns,
  Tag,
  Users,
  Shield,
  FileText,
  Plus,
  Lightbulb
} from 'lucide-react';

function ConfiguracoesBoasPraticasPage() {
  const router = useRouter();
  const { user } = useAuth();

  const canManage = () => {
    return user && ['Admin', 'Editor'].includes(user.role);
  };

  if (!canManage()) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h1>
            <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
            <Button onClick={() => router.push('/boas-praticas')} className="mt-4">
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const catalogItems = [
    {
      title: 'Categorias',
      description: 'Gerencie as categorias de boas práticas',
      icon: FolderOpen,
      color: 'text-blue-600',
      href: '/boas-praticas/categorias',
      iconBg: 'bg-blue-100'
    },
    {
      title: 'Eliminação de Desperdício',
      description: 'Gerencie as opções de eliminação de desperdício',
      icon: Target,
      color: 'text-green-600',
      href: '/boas-praticas/elimina-desperdicio',
      iconBg: 'bg-green-100'
    },
    {
      title: 'Pilares',
      description: 'Gerencie os pilares de boas práticas',
      icon: Columns,
      color: 'text-purple-600',
      href: '/boas-praticas/pilares',
      iconBg: 'bg-purple-100'
    },
    {
      title: 'Tags do Catálogo',
      description: 'Gerencie as tags para categorizar boas práticas',
      icon: Tag,
      color: 'text-orange-600',
      href: '/boas-praticas/tags-catalogo',
      iconBg: 'bg-orange-100'
    }
  ];

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/boas-praticas')}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Configurações de Boas Práticas</h1>
            <p className="text-gray-600">Gerencie os catálogos e configurações do módulo de boas práticas</p>
          </div>
        </div>

        {/* Catálogos de Boas Práticas */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Catálogos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {catalogItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Card 
                  key={index} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(item.href)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-lg ${item.iconBg}`}>
                        <Icon className={`w-6 h-6 ${item.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{item.title}</h3>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <ArrowLeft className="w-4 h-4 rotate-180" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Informações do Sistema */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Informações do Sistema</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Permissões</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  <p>• Administradores: Acesso completo</p>
                  <p>• Editores: Podem criar e editar</p>
                  <p>• Visualizadores: Apenas leitura</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Documentação</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  <p>• Categorias: Classificação de boas práticas</p>
                  <p>• Pilares: Estrutura organizacional</p>
                  <p>• Tags: Marcadores para busca</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Ações Rápidas</h2>
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={() => router.push('/boas-praticas/novo')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Boa Prática
            </Button>
            <Button 
              variant="outline"
              onClick={() => router.push('/boas-praticas')}
            >
              <Lightbulb className="w-4 h-4 mr-2" />
              Ver Boas Práticas
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default ConfiguracoesBoasPraticasPage;