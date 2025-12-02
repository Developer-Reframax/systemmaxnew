'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  GripVertical,
  Save
} from 'lucide-react';
import { toast } from 'sonner';

interface Categoria {
  id: string;
  nome: string;
  cor: string;
}

interface Pergunta {
  id: string;
  pergunta: string;
  obrigatoria: boolean;
  ordem: number;
  permite_conforme: boolean;
  permite_nao_conforme: boolean;
  permite_nao_aplica: boolean;
  impeditivo: boolean;
}

interface FormularioData {
  titulo: string;
  descricao: string;
  categoria_id: string;
  corporativo: boolean;
  check_list: boolean;
  ativo: boolean;
  perguntas: Pergunta[];
}

function NovoFormularioPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormularioData>({
    titulo: '',
    descricao: '',
    categoria_id: '',
    corporativo: false,
    check_list: false,
    ativo: true,
    perguntas: []
  });

  const fetchCategorias = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/inspecoes/categorias?limit=100&ativo=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCategorias(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      toast.error('Erro ao carregar categorias');
    }
  }, []);

  useEffect(() => {
    fetchCategorias();
  }, [fetchCategorias]);

  const canManage = () => {
    return user && ['Admin', 'Editor'].includes(user.role);
  };

  const addPergunta = () => {
    const novaPergunta: Pergunta = {
      id: `temp_${Date.now()}`,
      pergunta: '',
      obrigatoria: true,
      ordem: formData.perguntas.length + 1,
      permite_conforme: true,
      permite_nao_conforme: true,
      permite_nao_aplica: true,
      impeditivo: false
    };
    setFormData({
      ...formData,
      perguntas: [...formData.perguntas, novaPergunta]
    });
  };

  const removePergunta = (perguntaId: string) => {
    const perguntasAtualizadas = formData.perguntas
      .filter(p => p.id !== perguntaId)
      .map((p, index) => ({ ...p, ordem: index + 1 }));
    
    setFormData({
      ...formData,
      perguntas: perguntasAtualizadas
    });
  };

  const updatePergunta = (perguntaId: string, campo: keyof Pergunta, valor: string | boolean | number) => {
    const perguntasAtualizadas = formData.perguntas.map(p => 
      p.id === perguntaId ? { ...p, [campo]: valor } : p
    );
    setFormData({
      ...formData,
      perguntas: perguntasAtualizadas
    });
  };

  const movePergunta = (perguntaId: string, direcao: 'up' | 'down') => {
    const perguntaIndex = formData.perguntas.findIndex(p => p.id === perguntaId);
    if (perguntaIndex === -1) return;

    const novoIndex = direcao === 'up' ? perguntaIndex - 1 : perguntaIndex + 1;
    if (novoIndex < 0 || novoIndex >= formData.perguntas.length) return;

    const perguntasAtualizadas = [...formData.perguntas];
    [perguntasAtualizadas[perguntaIndex], perguntasAtualizadas[novoIndex]] = 
    [perguntasAtualizadas[novoIndex], perguntasAtualizadas[perguntaIndex]];

    // Reordenar
    perguntasAtualizadas.forEach((p, index) => {
      p.ordem = index + 1;
    });

    setFormData({
      ...formData,
      perguntas: perguntasAtualizadas
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo.trim()) {
      toast.error('Título do formulário é obrigatório');
      return;
    }

    if (!formData.categoria_id) {
      toast.error('Categoria é obrigatória');
      return;
    }

    if (formData.perguntas.length === 0) {
      toast.error('Adicione pelo menos uma pergunta');
      return;
    }

    // Validar perguntas
    const perguntasInvalidas = formData.perguntas.filter(p => !p.pergunta.trim());
    if (perguntasInvalidas.length > 0) {
      toast.error('Todas as perguntas devem ter texto');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/inspecoes/formularios', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar formulário');
      }

      const data = await response.json();
      toast.success('Formulário criado com sucesso!');
      router.push(`/inspecoes/formularios/${data.data.id}`);
    } catch (error: unknown) {
      console.error('Erro ao criar formulário:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar formulário');
    } finally {
      setLoading(false);
    }
  };

  if (!canManage()) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h1>
            <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
            <Button onClick={() => router.push('/inspecoes')} className="mt-4">
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/inspecoes/formularios')}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Novo Formulário</h1>
            <p className="text-gray-600">Crie um novo formulário de inspeção</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título *
                  </label>
                  <Input
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    placeholder="Título do formulário"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria *
                  </label>
                  <select 
                    value={formData.categoria_id} 
                    onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">Selecione uma categoria...</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição do formulário"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="corporativo"
                    checked={formData.corporativo}
                    onCheckedChange={(checked) => setFormData({ ...formData, corporativo: !!checked })}
                  />
                  <label htmlFor="corporativo" className="text-sm font-medium text-gray-700">
                    Formulário Corporativo
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="check_list"
                    checked={formData.check_list}
                    onCheckedChange={(checked) => setFormData({ ...formData, check_list: !!checked })}
                  />
                  <label htmlFor="check_list" className="text-sm font-medium text-gray-700">
                    Checklist
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData({ ...formData, ativo: !!checked })}
                  />
                  <label htmlFor="ativo" className="text-sm font-medium text-gray-700">
                    Ativo
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Perguntas */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Perguntas</CardTitle>
                <Button
                  type="button"
                  onClick={addPergunta}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Pergunta
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {formData.perguntas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Nenhuma pergunta adicionada ainda.</p>
                  <Button
                    type="button"
                    onClick={addPergunta}
                    className="mt-4"
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Primeira Pergunta
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.perguntas.map((pergunta, index) => (
                    <div key={pergunta.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start space-x-4">
                        <div className="flex flex-col space-y-1 mt-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => movePergunta(pergunta.id, 'up')}
                            disabled={index === 0}
                            className="p-1 h-6 w-6"
                          >
                            ↑
                          </Button>
                          <GripVertical className="w-4 h-4 text-gray-400" />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => movePergunta(pergunta.id, 'down')}
                            disabled={index === formData.perguntas.length - 1}
                            className="p-1 h-6 w-6"
                          >
                            ↓
                          </Button>
                        </div>
                        
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-600">
                              Pergunta {pergunta.ordem}
                            </span>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`obrigatoria_${pergunta.id}`}
                                checked={pergunta.obrigatoria}
                                onCheckedChange={(checked) => 
                                  updatePergunta(pergunta.id, 'obrigatoria', !!checked)
                                }
                              />
                              <label 
                                htmlFor={`obrigatoria_${pergunta.id}`} 
                                className="text-sm text-gray-600"
                              >
                                Obrigatória
                              </label>
                            </div>
                          </div>
                          
                          <Input
                            value={pergunta.pergunta}
                            onChange={(e) => updatePergunta(pergunta.id, 'pergunta', e.target.value)}
                            placeholder="Digite a pergunta..."
                            className="w-full"
                          />
                          
                          <div className="mt-3">
                            <label className="text-sm font-medium text-gray-600 mb-2 block">
                              Opções de Resposta Habilitadas:
                            </label>
                            <div className="flex flex-wrap gap-4">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`conforme_${pergunta.id}`}
                                  checked={pergunta.permite_conforme}
                                  onCheckedChange={(checked) => 
                                    updatePergunta(pergunta.id, 'permite_conforme', !!checked)
                                  }
                                />
                                <label 
                                  htmlFor={`conforme_${pergunta.id}`} 
                                  className="text-sm text-gray-600"
                                >
                                  Conforme
                                </label>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`nao_conforme_${pergunta.id}`}
                                  checked={pergunta.permite_nao_conforme}
                                  onCheckedChange={(checked) => 
                                    updatePergunta(pergunta.id, 'permite_nao_conforme', !!checked)
                                  }
                                />
                                <label 
                                  htmlFor={`nao_conforme_${pergunta.id}`} 
                                  className="text-sm text-gray-600"
                                >
                                  Não conforme
                                </label>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`nao_aplica_${pergunta.id}`}
                                  checked={pergunta.permite_nao_aplica}
                                  onCheckedChange={(checked) => 
                                    updatePergunta(pergunta.id, 'permite_nao_aplica', !!checked)
                                  }
                                />
                                <label 
                                  htmlFor={`nao_aplica_${pergunta.id}`} 
                                  className="text-sm text-gray-600"
                                >
                                  Não se aplica
                                </label>
                              </div>
                            </div>
                          </div>
                          {formData.check_list && (
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`impeditivo_${pergunta.id}`}
                                checked={pergunta.impeditivo}
                                onCheckedChange={(checked) =>
                                  updatePergunta(pergunta.id, "impeditivo", !!checked)
                                }
                              />
                              <label 
                                htmlFor={`impeditivo_${pergunta.id}`}
                                className="text-sm text-gray-700"
                              >
                                Pergunta impeditiva
                              </label>
                            </div>
                          )}
                        </div>
                        
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePergunta(pergunta.id)}
                          className="text-red-600 hover:text-red-700 mt-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/inspecoes/formularios')}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Criar Formulário
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}

export default NovoFormularioPage;
