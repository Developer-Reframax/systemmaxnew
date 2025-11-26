'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  ArrowLeft,
  Tag
} from 'lucide-react';
import { toast } from 'sonner';

interface TagCatalogo {
  id: string;
  nome: string;
  cor: string;
  created_at: string;
}

interface NovaTagCatalogo {
  nome: string;
  cor: string;
}

function TagsCatalogoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tags, setTags] = useState<TagCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTag, setEditingTag] = useState<TagCatalogo | null>(null);
  const [formData, setFormData] = useState<NovaTagCatalogo>({
    nome: '',
    cor: '#6B7280'
  });

  const fetchTags = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/boas-praticas/tags-catalogo?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar tags do catálogo');
      }

      const data = await response.json();
      setTags(data.data || []);
    } catch (error) {
      console.error('Erro ao carregar tags:', error);
      toast.error('Erro ao carregar tags do catálogo');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast.error('Nome da tag é obrigatório');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const url = editingTag 
        ? `/api/boas-praticas/tags-catalogo/${editingTag.id}`
        : '/api/boas-praticas/tags-catalogo';
      
      const method = editingTag ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar tag do catálogo');
      }

      toast.success(editingTag ? 'Tag atualizada com sucesso!' : 'Tag criada com sucesso!');
      setShowForm(false);
      setEditingTag(null);
      setFormData({ nome: '', cor: '#6B7280' });
      fetchTags();
    } catch (error: unknown) {
      console.error('Erro ao salvar tag:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar tag do catálogo');
    }
  };

  const handleEdit = (tag: TagCatalogo) => {
    setEditingTag(tag);
    setFormData({
      nome: tag.nome,
      cor: tag.cor
    });
    setShowForm(true);
  };

  const handleDelete = async (tag: TagCatalogo) => {
    if (!confirm(`Tem certeza que deseja excluir a tag "${tag.nome}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch(`/api/boas-praticas/tags-catalogo/${tag.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir tag do catálogo');
      }

      toast.success('Tag excluída com sucesso!');
      fetchTags();
    } catch (error: unknown) {
      console.error('Erro ao excluir tag:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir tag do catálogo');
    }
  };

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
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/boas-praticas')}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestão de Tags do Catálogo</h1>
              <p className="text-gray-600">Gerencie as tags para categorizar boas práticas</p>
            </div>
          </div>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Tag
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
                    placeholder="Buscar tags do catálogo..."
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
                {editingTag ? 'Editar Tag do Catálogo' : 'Nova Tag do Catálogo'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome *
                    </label>
                    <Input
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Nome da tag"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cor
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={formData.cor}
                        onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                        className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <Input
                        value={formData.cor}
                        onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                        placeholder="#6B7280"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setEditingTag(null);
                      setFormData({ nome: '', cor: '#6B7280' });
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    {editingTag ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Lista de Tags */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tags.map((tag) => (
            <Card key={tag.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: tag.cor }}
                    />
                    <CardTitle className="text-lg">{tag.nome}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-500">
                    <Tag className="w-4 h-4 mr-1" />
                    Tag do catálogo
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(tag)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(tag)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Criado em {new Date(tag.created_at).toLocaleDateString('pt-BR')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {tags.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma tag do catálogo encontrada
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'Tente ajustar os filtros de busca.' : 'Comece criando sua primeira tag do catálogo.'}
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Tag
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}

export default TagsCatalogoPage;