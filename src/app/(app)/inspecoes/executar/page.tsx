'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import { 
  Search, 
  FileText,
  ArrowLeft,
  Play,
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

function ExecutarInspecaoPage() {
  const router = useRouter();
  const [formularios, setFormularios] = useState<Formulario[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('');

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
      params.append('ativo', 'true'); // Sempre buscar apenas formulários ativos
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategoria) params.append('categoria_id', selectedCategoria);

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
  }, [searchTerm, selectedCategoria]);

  useEffect(() => {
    fetchCategorias();
  }, [fetchCategorias]);

  useEffect(() => {
    fetchFormularios();
  }, [fetchFormularios]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategoria('');
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
              <h1 className="text-3xl font-bold text-gray-900">Executar Inspeção</h1>
              <p className="text-gray-600">Escolha um formulário para executar a inspeção</p>
            </div>
          </div>
        </div>

        {/* Filtros simplificados */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <div className="flex gap-2">
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

        {/* Lista de Formulários - apenas para execução */}
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
                      <Badge variant="default" className="text-xs">
                        Ativo
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
                


                <div className="flex justify-center">
                  <Button
                    size="lg"
                    onClick={() => router.push(`/inspecoes/executar/${formulario.id}`)}
                    className="bg-green-600 hover:bg-green-700 px-8"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Executar
                  </Button>
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
                Nenhum formulário ativo encontrado
              </h3>
              <p className="text-gray-600">
                {searchTerm || selectedCategoria
                  ? 'Tente ajustar os filtros de busca.'
                  : 'Não há formulários ativos disponíveis para execução.'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
  );
}

export default ExecutarInspecaoPage;