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
  ArrowLeft,
  Target
} from 'lucide-react';
import { toast } from 'sonner';

interface EliminacaoDesperdicio {
  id: string;
  nome: string;
  descricao: string;
  created_at: string;
}

interface NovaEliminacaoDesperdicio {
  nome: string;
  descricao: string;
}

function EliminacaoDesperdicioPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [opcoes, setOpcoes] = useState<EliminacaoDesperdicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingOpcao, setEditingOpcao] = useState<EliminacaoDesperdicio | null>(null);
  const [formData, setFormData] = useState<NovaEliminacaoDesperdicio>({
    nome: '',
    descricao: ''
  });

  const fetchOpcoes = useCallback(async () => {
    try {


      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/boas-praticas/elimina-desperdicio?${params}`, {
        method:'GET'
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar opções de eliminação de desperdício');
      }

      const data = await response.json();
      setOpcoes(data.data || []);
    } catch (error) {
      console.error('Erro ao carregar opções:', error);
      toast.error('Erro ao carregar opções de eliminação de desperdício');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchOpcoes();
  }, [fetchOpcoes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast.error('Nome da opção de eliminação de desperdício é obrigatório');
      return;
    }

    try {
    

      const url = editingOpcao 
        ? `/api/boas-praticas/elimina-desperdicio/${editingOpcao.id}`
        : '/api/boas-praticas/elimina-desperdicio';
      
      const method = editingOpcao ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar opção de eliminação de desperdício');
      }

      toast.success(editingOpcao ? 'Opção atualizada com sucesso!' : 'Opção criada com sucesso!');
      setShowForm(false);
      setEditingOpcao(null);
      setFormData({ nome: '', descricao: '' });
      fetchOpcoes();
    } catch (error: unknown) {
      console.error('Erro ao salvar opção:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar opção de eliminação de desperdício');
    }
  };

  const handleEdit = (opcao: EliminacaoDesperdicio) => {
    setEditingOpcao(opcao);
    setFormData({
      nome: opcao.nome,
      descricao: opcao.descricao
    });
    setShowForm(true);
  };

  const handleDelete = async (opcao: EliminacaoDesperdicio) => {
    if (!confirm(`Tem certeza que deseja excluir a opção "${opcao.nome}"?`)) {
      return;
    }

    try {
      

      const response = await fetch(`/api/boas-praticas/elimina-desperdicio/${opcao.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir opção de eliminação de desperdício');
      }

      toast.success('Opção excluída com sucesso!');
      fetchOpcoes();
    } catch (error: unknown) {
      console.error('Erro ao excluir opção:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir opção de eliminação de desperdício');
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
              <h1 className="text-3xl font-bold text-gray-900">Gestão de Eliminação de Desperdício</h1>
              <p className="text-gray-600">Gerencie as opções de eliminação de desperdício para boas práticas</p>
            </div>
          </div>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Opção
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
                    placeholder="Buscar opções de eliminação de desperdício..."
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
                {editingOpcao ? 'Editar Opção de Eliminação de Desperdício' : 'Nova Opção de Eliminação de Desperdício'}
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
                    placeholder="Nome da opção de eliminação de desperdício"
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
                    placeholder="Descrição da opção de eliminação de desperdício"
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
                      setEditingOpcao(null);
                      setFormData({ nome: '', descricao: '' });
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    {editingOpcao ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Lista de Opções */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {opcoes.map((opcao) => (
            <Card key={opcao.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    <CardTitle className="text-lg">{opcao.nome}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-4">
                  {opcao.descricao || 'Sem descrição'}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-500">
                    <Target className="w-4 h-4 mr-1" />
                    Opção de eliminação de desperdício
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(opcao)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(opcao)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Criado em {new Date(opcao.created_at).toLocaleDateString('pt-BR')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {opcoes.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma opção de eliminação de desperdício encontrada
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'Tente ajustar os filtros de busca.' : 'Comece criando sua primeira opção de eliminação de desperdício.'}
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Opção
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
  );
}

export default EliminacaoDesperdicioPage;