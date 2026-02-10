'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Trash2, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface Equipamento {
  id: string;
  tag: string;
  nome: string;
  descricao: string;
  imagem_url: string;
}

function EditarEquipamentoPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [equipamento, setEquipamento] = useState<Equipamento | null>(null);
  const [imagemNova, setImagemNova] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canManage = user && (user.role === 'Admin' || user.role === 'Editor');

  const fetchEquipamento = useCallback(async () => {
    try {
      if (!params?.id) return;

      const response = await fetch(`/api/inspecoes/equipamentos/${params.id}`, {
        method: 'GET'
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 404) {
          toast.error('Equipamento não encontrado');
          router.push('/inspecoes/equipamentos');
          return;
        }
        throw new Error('Erro ao carregar equipamento');
      }

      const data = await response.json();
      setEquipamento(data.data as Equipamento);
      setPreview(data.data?.imagem_url || null);
    } catch (error) {
      console.error('Erro ao carregar equipamento:', error);
      toast.error('Erro ao carregar equipamento');
      router.push('/inspecoes/equipamentos');
    } finally {
      setLoading(false);
    }
  }, [params?.id, router]);

  useEffect(() => {
    fetchEquipamento();
  }, [fetchEquipamento]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!equipamento) return;

    if (!equipamento.tag.trim() || !equipamento.nome.trim() || !equipamento.descricao.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (!preview && !imagemNova) {
      toast.error('Selecione uma imagem');
      return;
    }

    setSaving(true);
    try {
 
      const formData = new FormData();
      formData.append('tag', equipamento.tag.trim());
      formData.append('nome', equipamento.nome.trim());
      formData.append('descricao', equipamento.descricao.trim());
      if (imagemNova) {
        formData.append('imagem', imagemNova);
      }
      if (preview && !imagemNova) {
        formData.append('imagem_atual', preview);
      } else if (equipamento.imagem_url) {
        formData.append('imagem_atual', equipamento.imagem_url);
      }

      const response = await fetch(`/api/inspecoes/equipamentos/${equipamento.id}`, {
        method: 'PUT',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar equipamento');
      }

      toast.success('Equipamento atualizado com sucesso!');
      router.push('/inspecoes/equipamentos');
    } catch (error) {
      console.error('Erro ao atualizar equipamento:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar equipamento');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canManage || !equipamento) return;
    if (!confirm('Deseja realmente excluir este equipamento?')) return;

    try {


      const response = await fetch(`/api/inspecoes/equipamentos/${equipamento.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir equipamento');
      }

      toast.success('Equipamento excluído com sucesso');
      router.push('/inspecoes/equipamentos');
    } catch (error) {
      console.error('Erro ao excluir equipamento:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir equipamento');
    }
  };

  if (loading) {
    return (
        <div className="container mx-auto p-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
    );
  }

  if (!equipamento) {
    return (
        <div className="container mx-auto p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Equipamento não encontrado</h1>
            <Button onClick={() => router.push('/inspecoes/equipamentos')} className="mt-4">
              Voltar
            </Button>
          </div>
        </div>
    );
  }

  return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/inspecoes/equipamentos')}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Editar Equipamento</h1>
              <p className="text-gray-600">Atualize os dados do equipamento</p>
            </div>
          </div>
          {canManage && (
            <Button
              onClick={handleDelete}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados do Equipamento</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tag *</label>
                  <Input
                    value={equipamento.tag}
                    onChange={(e) => setEquipamento({ ...equipamento, tag: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <Input
                    value={equipamento.nome}
                    onChange={(e) => setEquipamento({ ...equipamento, nome: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
                <Textarea
                  value={equipamento.descricao}
                  onChange={(e) => setEquipamento({ ...equipamento, descricao: e.target.value })}
                  rows={4}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Imagem *</label>
                <div className="flex items-center space-x-4">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-gray-600">
                      <UploadCloud className="w-6 h-6 mb-2" />
                      <p className="text-sm">Clique para substituir a imagem</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setImagemNova(file);
                          setPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                  {preview && (
                    <div className="w-32 h-32 rounded-lg overflow-hidden border">
                      <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/inspecoes/equipamentos')}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar alterações
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
  );
}

export default EditarEquipamentoPage;
