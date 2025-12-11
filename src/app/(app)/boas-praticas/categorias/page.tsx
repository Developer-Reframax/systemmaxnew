'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  FolderOpen,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';

interface Categoria {
  id: string;
  nome: string;
  descricao: string;
  created_at: string;
}

interface NovaCategoria {
  nome: string;
  descricao: string;
}

function CategoriasBoasPraticasPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [formData, setFormData] = useState<NovaCategoria>({
    nome: '',
    descricao: ''
  });

  const fetchCategorias = useCallback(async () => {
    try {
    

      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/boas-praticas/categorias?${params}`, {
        method:'GET'
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar categorias');
      }

      const data = await response.json();
      setCategorias(data.data || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      toast.error('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchCategorias();
  }, [fetchCategorias]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast.error('Nome da categoria é obrigatório');
      return;
    }

    try {

      const url = editingCategoria 
        ? `/api/boas-praticas/categorias/${editingCategoria.id}`
        : '/api/boas-praticas/categorias';
      
      const method = editingCategoria ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar categoria');
      }

      toast.success(editingCategoria ? 'Categoria atualizada com sucesso!' : 'Categoria criada com sucesso!');
      setShowForm(false);
      setEditingCategoria(null);
      setFormData({ nome: '', descricao: '' });
      fetchCategorias();
    } catch (error: unknown) {
      console.error('Erro ao salvar categoria:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar categoria');
    }
  };

  const handleEdit = (categoria: Categoria) => {
    setEditingCategoria(categoria);
    setFormData({
      nome: categoria.nome,
      descricao: categoria.descricao
    });
    setShowForm(true);
  };

  const handleDelete = async (categoria: Categoria) => {
    if (!confirm(`Tem certeza que deseja excluir a categoria "${categoria.nome}"?`)) {
      return;
    }

    try {


      const response = await fetch(`/api/boas-praticas/categorias/${categoria.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir categoria');
      }

      toast.success('Categoria excluída com sucesso!');
      fetchCategorias();
    } catch (error: unknown) {
      console.error('Erro ao excluir categoria:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir categoria');
    }
  };

  const canManage = () => {
    return user && ['Admin', 'Editor'].includes(user.role);
  };

  if (!canManage()) {
    return (
        <div className="container mx-auto p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h1>
            <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
            <Button onClick={() => router.push('/boas-praticas')} className="mt-4">
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
    );
  }

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
              onClick={() => router.push('/boas-praticas')}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestão de Categorias</h1>
              <p className="text-gray-600">Gerencie as categorias de boas práticas</p>
            </div>
          </div>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Categoria
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar categorias..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulário */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>
                {editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome *
                  </label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Nome da categoria"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descrição da categoria"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setEditingCategoria(null);
                      setFormData({ nome: '', descricao: '' });
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    {editingCategoria ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Lista de Categorias */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categorias.map((categoria) => (
            <Card key={categoria.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{categoria.nome}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-4">
                  {categoria.descricao || 'Sem descrição'}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-500">
                    <FolderOpen className="w-4 h-4 mr-1" />
                    Categoria de boas práticas
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(categoria)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(categoria)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Criado em {new Date(categoria.created_at).toLocaleDateString('pt-BR')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {categorias.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma categoria encontrada
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'Tente ajustar os filtros de busca.' : 'Comece criando sua primeira categoria.'}
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Categoria
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
  );
}

export default CategoriasBoasPraticasPage;