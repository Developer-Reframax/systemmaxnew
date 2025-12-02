'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Camera,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';

interface Equipamento {
  id: string;
  tag: string;
  nome: string;
  descricao: string;
  imagem_url: string;
  created_at?: string;
}

function EquipamentosPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const canManage = user && (user.role === 'Admin' || user.role === 'Editor');

  const fetchEquipamentos = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/inspecoes/equipamentos?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar equipamentos');
      }

      const data = await response.json();
      setEquipamentos(data.data || []);
    } catch (error) {
      console.error('Erro ao carregar equipamentos:', error);
      toast.error('Erro ao carregar equipamentos');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchEquipamentos();
  }, [fetchEquipamentos]);

  const handleDelete = async (id: string) => {
    if (!canManage) return;
    if (!confirm('Deseja realmente excluir este equipamento?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch(`/api/inspecoes/equipamentos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir equipamento');
      }

      toast.success('Equipamento excluído com sucesso');
      fetchEquipamentos();
    } catch (error) {
      console.error('Erro ao excluir equipamento:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir equipamento');
    }
  };

  if (!loading && !equipamentos.length && searchTerm) {
    // Apenas garantir UX, sem retorno antecipado para manter layout
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/inspecoes')}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Equipamentos</h1>
              <p className="text-gray-600">Cadastro de equipamentos utilizados nas inspeções</p>
            </div>
          </div>
          {canManage && (
            <Button onClick={() => router.push('/inspecoes/equipamentos/novo')} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Equipamento
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por nome ou tag..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={fetchEquipamentos}>
                  Atualizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-3 flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
          ) : equipamentos.length === 0 ? (
            <Card className="col-span-3">
              <CardContent className="text-center py-12">
                <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum equipamento encontrado
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm
                    ? 'Tente ajustar a busca.'
                    : 'Cadastre o primeiro equipamento para começar.'}
                </p>
                {canManage && (
                  <Button onClick={() => router.push('/inspecoes/equipamentos/novo')} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Equipamento
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            equipamentos.map((equipamento) => (
              <Card key={equipamento.id} className="hover:shadow-lg transition-shadow">
                <div className="h-40 w-full overflow-hidden rounded-t-lg bg-gray-100">
                  {equipamento.imagem_url ? (
                    <img
                      src={equipamento.imagem_url}
                      alt={equipamento.nome}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-gray-400">
                      <Camera className="w-10 h-10" />
                    </div>
                  )}
                </div>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{equipamento.nome}</CardTitle>
                    <Badge variant="outline">{equipamento.tag}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600 line-clamp-3">{equipamento.descricao}</p>
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                      {equipamento.created_at
                        ? new Date(equipamento.created_at).toLocaleDateString('pt-BR')
                        : ''}
                    </div>
                    {canManage && (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/inspecoes/equipamentos/${equipamento.id}`)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(equipamento.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}

export default EquipamentosPage;
