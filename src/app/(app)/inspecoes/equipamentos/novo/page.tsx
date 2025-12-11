'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';

interface FormState {
  tag: string;
  nome: string;
  descricao: string;
  imagem: File | null;
}

function NovoEquipamentoPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    tag: '',
    nome: '',
    descricao: '',
    imagem: null
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.tag.trim() || !form.nome.trim() || !form.descricao.trim() || !form.imagem) {
      toast.error('Preencha todos os campos e selecione uma imagem');
      return;
    }

    setSaving(true);
    try {
      
      const formData = new FormData();
      formData.append('tag', form.tag.trim());
      formData.append('nome', form.nome.trim());
      formData.append('descricao', form.descricao.trim());
      if (form.imagem) {
        formData.append('imagem', form.imagem);
      }

      const response = await fetch('/api/inspecoes/equipamentos', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar equipamento');
      }

      toast.success('Equipamento criado com sucesso!');
      router.push('/inspecoes/equipamentos');
    } catch (error) {
      console.error('Erro ao criar equipamento:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar equipamento');
    } finally {
      setSaving(false);
    }
  };

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
              <h1 className="text-3xl font-bold text-gray-900">Novo Equipamento</h1>
              <p className="text-gray-600">Cadastre um novo equipamento para inspeções</p>
            </div>
          </div>
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
                    value={form.tag}
                    onChange={(e) => setForm({ ...form, tag: e.target.value })}
                    placeholder="TAG-001"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <Input
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="Nome do equipamento"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
                <Textarea
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Descreva o equipamento"
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
                      <p className="text-sm">Clique para enviar ou arraste uma imagem</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setForm({ ...form, imagem: file });
                          setPreview(URL.createObjectURL(file));
                        }
                      }}
                      required
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
                    <UploadCloud className="w-4 h-4 mr-2" />
                  )}
                  Salvar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
  );
}

export default NovoEquipamentoPage;
