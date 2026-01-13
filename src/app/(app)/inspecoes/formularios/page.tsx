'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  FileText,
  ArrowLeft,
  Play,
  Eye,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';

interface Categoria {
  id: string;
  nome: string;
  cor: string;
}

interface Formulario {
  id: string;
  titulo: string;
  descricao: string;
  categoria_id: string;
  categoria: Categoria;
  corporativo: boolean;
  ativo: boolean;
  created_at: string;
  _count?: {
    perguntas: number;
    execucoes: number;
  };
}

function FormulariosPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [formularios, setFormularios] = useState<Formulario[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [corporativoFilter, setCorporativoFilter] = useState<string>('');

  const fetchCategorias = useCallback(async () => {
    try {
     

      const response = await fetch('/api/inspecoes/categorias?limit=100', {
       method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        setCategorias(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  }, []);

  const fetchFormularios = useCallback(async () => {
    try {
     
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategoria) params.append('categoria_id', selectedCategoria);
      if (statusFilter) params.append('ativo', statusFilter);
      if (corporativoFilter) params.append('corporativo', corporativoFilter);

      const response = await fetch(`/api/inspecoes/formularios?${params}`, {
       method: 'GET'
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar formulários');
      }

      const data = await response.json();
      setFormularios(data.data || []);
    } catch (error) {
      console.error('Erro ao carregar formulários:', error);
      toast.error('Erro ao carregar formulários');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCategoria, statusFilter, corporativoFilter]);

  useEffect(() => {
    fetchCategorias();
  }, [fetchCategorias]);

  useEffect(() => {
    fetchFormularios();
  }, [fetchFormularios]);

  const handleDelete = async (formulario: Formulario) => {
    if (!confirm(`Tem certeza que deseja excluir o formulário "${formulario.titulo}"?`)) {
      return;
    }

    try {
      

      const response = await fetch(`/api/inspecoes/formularios/${formulario.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir formulário');
      }

      toast.success('Formulário excluído com sucesso!');
      fetchFormularios();
    } catch (error: unknown) {
      console.error('Erro ao excluir formulário:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir formulário');
    }
  };

  const canManage = () => {
    return user && ['Admin', 'Editor', 'Usuario'].includes(user.role);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategoria('');
    setStatusFilter('');
    setCorporativoFilter('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/inspecoes')}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Formulários de Inspeção</h1>
              <p className="text-gray-600">Gerencie e execute formulários de inspeção</p>
            </div>
          </div>
          <div className="flex gap-2">
            {canManage() && (
              <Button 
                onClick={() => router.push('/inspecoes/formularios/novo')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Formulário
              </Button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar formulários..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <select 
                value={selectedCategoria} 
                onChange={(e) => setSelectedCategoria(e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Todas as categorias</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </option>
                ))}
              </select>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Todos</option>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
              <div className="flex gap-2">
                <select 
                  value={corporativoFilter} 
                  onChange={(e) => setCorporativoFilter(e.target.value)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">Todos</option>
                  <option value="true">Corporativo</option>
                  <option value="false">Local</option>
                </select>
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="px-3"
                >
                  <Filter className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Formulários */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {formularios.map((formulario) => (
            <Card key={formulario.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: formulario.categoria.cor }}
                      />
                      <Badge variant="outline" className="text-xs">
                        {formulario.categoria.nome}
                      </Badge>
                      {formulario.corporativo && (
                        <Badge variant="secondary" className="text-xs">
                          Corporativo
                        </Badge>
                      )}
                      <Badge variant={formulario.ativo ? "default" : "secondary"} className="text-xs">
                        {formulario.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg leading-tight">
                      {formulario.titulo}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {formulario.descricao || 'Sem descrição'}
                </p>
                


                <div className="flex justify-between items-center">
                  <div className="flex space-x-2">
                    {formulario.ativo && (
                      <Button
                        size="sm"
                        onClick={() => router.push(`/inspecoes/executar/${formulario.id}`)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Executar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/inspecoes/formularios/${formulario.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Ver
                    </Button>
                  </div>
                  
                  {canManage() && (
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/inspecoes/formularios/${formulario.id}/editar`)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(formulario)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {formularios.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum formulário encontrado
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || selectedCategoria || statusFilter || corporativoFilter
                  ? 'Tente ajustar os filtros de busca.'
                  : 'Comece criando seu primeiro formulário de inspeção.'
                }
              </p>
              {!searchTerm && !selectedCategoria && !statusFilter && !corporativoFilter && canManage() && (
                <Button 
                  onClick={() => router.push('/inspecoes/formularios/novo')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Formulário
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
  );
}

export default FormulariosPage;