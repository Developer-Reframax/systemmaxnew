'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Textarea não existe, usar textarea nativo
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import {
  AlertTriangle,
  CheckCircle,
  FileText,
  Upload,
  Trash2,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { CreatePlanoAcaoData, UpdatePlanoAcaoData, PlanoAcaoWithRelations, EvidenciaPlanoAcao } from '@/types/plano-acao';
import { useAuth } from '@/hooks/useAuth';

interface PlanoAcaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  execucaoId: string;
  perguntaId?: string;
  plano?: PlanoAcaoWithRelations;
  usuarios: Array<{
    matricula: number;
    nome: string;
    email: string;
  }>;
}

interface FormData {
  desvio: string;
  o_que_fazer: string;
  como_fazer: string;
  responsavel: number;
  prazo: string;
  prioridade: PlanoAcaoPrioridade;
  status: PlanoAcaoStatus;
}

type PlanoAcaoPrioridade = 'baixa' | 'media' | 'alta' | 'urgente';
type PlanoAcaoStatus = 'pendente' | 'em_andamento' | 'concluido' | 'cancelado';

export default function PlanoAcaoModal({
  isOpen,
  onClose,
  onSuccess,
  execucaoId,
  perguntaId,
  plano,
  usuarios
}: PlanoAcaoModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    desvio: '',
    o_que_fazer: '',
    como_fazer: '',
    responsavel: 0,
    prazo: '',
    prioridade: 'media',
    status: 'pendente'
  });
  const [evidencias, setEvidencias] = useState<EvidenciaPlanoAcao[]>([]);
  const [novasEvidencias, setNovasEvidencias] = useState<File[]>([]);
  const [buscaResponsavel, setBuscaResponsavel] = useState('');
  const [responsavelOpen, setResponsavelOpen] = useState(false);

  const usuariosFiltrados = useMemo(() => {
    const termo = buscaResponsavel.trim().toLowerCase();
    if (!termo) return usuarios;
    return usuarios.filter((u) =>
      u.nome.toLowerCase().includes(termo) ||
      u.email.toLowerCase().includes(termo) ||
      String(u.matricula).includes(termo)
    );
  }, [buscaResponsavel, usuarios]);

  const exibirNomeCurto = (nome: string) => {
    const partes = nome.trim().split(' ').filter(Boolean);
    if (partes.length === 1) return partes[0];
    return `${partes[0]} ${partes[partes.length - 1]}`;
  };

  useEffect(() => {
    if (isOpen) {
      if (plano) {
        // Modo edição
        setFormData({
          desvio: plano.desvio || '',
          o_que_fazer: plano.o_que_fazer || '',
          como_fazer: plano.como_fazer || '',
          responsavel: plano.responsavel_matricula,
          prazo: plano.prazo,
          prioridade: plano.prioridade as PlanoAcaoPrioridade,
          status: plano.status as PlanoAcaoStatus
        });
        setEvidencias(plano.evidencias || []);
      } else {
        // Modo criação
        setFormData({
          desvio: '',
          o_que_fazer: '',
          como_fazer: '',
          responsavel: 0,
          prazo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 dias a partir de hoje
          prioridade: 'media',
          status: 'pendente'
        });
        setEvidencias([]);
      }
      setNovasEvidencias([]);
    }
  }, [isOpen, plano]);

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Validar arquivos
    const tiposPermitidos = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    const tamanhoMaximo = 50 * 1024 * 1024; // 50MB

    files.forEach(file => {
      if (!tiposPermitidos.includes(file.type)) {
        toast.error(`Tipo de arquivo não permitido: ${file.type}`);
        return;
      }
      if (file.size > tamanhoMaximo) {
        toast.error(`Arquivo ${file.name} é muito grande (máx. 50MB)`);
        return;
      }
    });

    setNovasEvidencias(prev => [...prev, ...files]);
  };

  const removeNovaEvidencia = (index: number) => {
    setNovasEvidencias(prev => prev.filter((_, i) => i !== index));
  };

  const removeEvidenciaExistente = (evidenciaId: string) => {
    setEvidencias(prev => prev.filter(e => e.id !== evidenciaId));
  };

  const validateForm = (): boolean => {
    const erros: { [key: string]: string } = {};
    if (!formData.desvio.trim()) erros.desvio = 'Descrição do desvio é obrigatória';
    if (!formData.o_que_fazer.trim()) erros.o_que_fazer = 'Descrição da ação é obrigatória';
    if (!formData.como_fazer.trim()) erros.como_fazer = 'Detalhamento da execução é obrigatório';
    if (!formData.responsavel) erros.responsavel = 'Responsável é obrigatório';
    if (!formData.prazo) erros.prazo = 'Prazo é obrigatório';

    if (Object.keys(erros).length > 0) {
      Object.values(erros).forEach(msg => toast.error(msg));
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Token de autenticação não encontrado');
        return;
      }

      if (!user?.matricula) {
        toast.error('Matrícula do usuário logado não encontrada');
        return;
      }

      let planoId = plano?.id;

      // Criar ou atualizar plano de ação
      if (!plano) {
        // Criar novo plano
        const createData: CreatePlanoAcaoData = {
          execucao_inspecao_id: execucaoId,
          pergunta_id: perguntaId || '', // Usar perguntaId se fornecido
          desvio: formData.desvio.trim(),
          o_que_fazer: formData.o_que_fazer.trim(),
          como_fazer: formData.como_fazer.trim(),
          responsavel_matricula: formData.responsavel,
          prazo: formData.prazo,
          prioridade: formData.prioridade,
          cadastrado_por_matricula: user.matricula,
          status: formData.status,
        };

        const response = await fetch(`/api/inspecoes/execucoes/${execucaoId}/planos-acao`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(createData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao criar plano de ação');
        }

        const result = await response.json();
        planoId = result.data.id;
      } else {
        // Atualizar plano existente
        const updateData: UpdatePlanoAcaoData = {
          desvio: formData.desvio.trim(),
          o_que_fazer: formData.o_que_fazer.trim(),
          como_fazer: formData.como_fazer.trim(),
          responsavel_matricula: formData.responsavel,
          prazo: formData.prazo,
          status: formData.status,
          prioridade: formData.prioridade
        };

        const response = await fetch(`/api/inspecoes/execucoes/${execucaoId}/planos-acao/${planoId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao atualizar plano de ação');
        }
      }

      // Upload de novas evidências
      if (novasEvidencias.length > 0) {
        for (const arquivo of novasEvidencias) {
          const formDataUpload = new FormData();
          formDataUpload.append('arquivo', arquivo);

          const uploadResponse = await fetch(`/api/inspecoes/execucoes/${execucaoId}/planos-acao/${planoId}/evidencias`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formDataUpload
          });

          if (!uploadResponse.ok) {
            console.error('Erro ao fazer upload de evidência:', await uploadResponse.text());
          }
        }
      }

      toast.success(plano ? 'Plano de ação atualizado com sucesso!' : 'Plano de ação criado com sucesso!');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar plano de ação:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar plano de ação');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>{plano ? 'Editar Plano de Ação' : 'Novo Plano de Ação'}</span>
          </DialogTitle>
          <DialogDescription>
            {plano ? 'Edite as informações do plano de ação' : 'Crie um novo plano de ação para tratar uma não conformidade'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Informações Básicas */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Informações Básicas</span>
            </h3>
            
            <div className="grid gap-4">
             
                <div className="space-y-2">
                  <Label htmlFor="desvio">Descrição do Desvio *</Label>
                  {plano ? (
                    <div className="p-3 bg-gray-100 rounded-md border">
                      <p className="text-gray-800">{formData.desvio}</p>
                    </div>
                  ) : (
                    <Input
                      id="desvio"
                      value={formData.desvio}
                      onChange={(e) => handleInputChange('desvio', e.target.value)}
                      placeholder="Descreva o problema/não conformidade identificada"
                    />
                  )}
                </div>

                
              

              <div className="space-y-2">
                <Label htmlFor="o_que_fazer">O que deve ser feito *</Label>
                {plano ? (
                  <div className="p-3 bg-gray-100 rounded-md border">
                    <p className="text-gray-800 whitespace-pre-wrap">{formData.o_que_fazer}</p>
                  </div>
                ) : (
                  <textarea
                    id="o_que_fazer"
                    value={formData.o_que_fazer}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('o_que_fazer', e.target.value)}
                    placeholder="Descreva a ação principal que deve ser tomada para corrigir o problema"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="como_fazer">Como executar a ação *</Label>
                <textarea
                  id="como_fazer"
                  value={formData.como_fazer}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('como_fazer', e.target.value)}
                  placeholder="Detalhe como a ação deve ser executada, passos necessários, recursos, etc."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className={`grid gap-4 ${plano ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
                {plano && (
                  <div className="space-y-2">
                    <Label>Responsável</Label>
                    <div className="p-3 bg-gray-100 rounded-md border">
                      <p className="text-gray-800">{plano.responsavel_info?.nome || 'Carregando...'} ({plano.responsavel_matricula})</p>
                    </div>
                  </div>
                )}
                {!plano && (
                  <div className="space-y-2">
                    <Label htmlFor="responsavel">Responsavel *</Label>
                    <div className="relative">
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                        id="responsavel"
                        onClick={() => setResponsavelOpen((prev) => !prev)}
                      >
                        {formData.responsavel
                          ? (() => {
                              const selecionado = usuarios.find(u => u.matricula === formData.responsavel);
                              return selecionado ? `${exibirNomeCurto(selecionado.nome)} (${selecionado.matricula})` : 'Selecione um responsavel';
                            })()
                          : 'Selecione um responsavel'}
                      </Button>
                      {responsavelOpen && (
                        <div className="absolute z-10 mt-2 w-full rounded-md border bg-white p-3 shadow-lg">
                          <Input
                            placeholder="Buscar por nome, email ou matricula"
                            value={buscaResponsavel}
                            onChange={(e) => setBuscaResponsavel(e.target.value)}
                          />
                          <div className="mt-2 max-h-60 overflow-auto space-y-1">
                            {usuariosFiltrados.length === 0 && (
                              <p className="text-sm text-gray-500 px-1">Nenhum usuário encontrado</p>
                            )}
                            {usuariosFiltrados.map((usuario) => (
                              <Button
                                key={usuario.matricula}
                                variant="ghost"
                                className="w-full justify-start"
                                onClick={() => {
                                  handleInputChange('responsavel', usuario.matricula);
                                  setResponsavelOpen(false);
                                }}
                              >
                                {exibirNomeCurto(usuario.nome)} ({usuario.matricula})
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="prazo">Prazo *</Label>
                  {plano ? (
                    <div className="p-3 bg-gray-100 rounded-md border">
                      <p className="text-gray-800">{new Date(formData.prazo).toLocaleDateString('pt-BR')}</p>
                    </div>
                  ) : (
                    <Input
                      id="prazo"
                      type="date"
                      value={formData.prazo}
                      onChange={(e) => handleInputChange('prazo', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prioridade">Prioridade</Label>
                  <Select
                    id="prioridade"
                    value={formData.prioridade}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('prioridade', e.target.value)}
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    id="status"
                    value={formData.status}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('status', e.target.value)}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluido">Concluído</option>
                    <option value="cancelado">Cancelado</option>
                  </Select>
                </div>

              </div>
            </div>
          </Card>

          {/* Evidências */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <Upload className="w-5 h-5" />
              <span>Evidências</span>
            </h3>

            {/* Evidências existentes */}
            {evidencias.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Evidências existentes:</h4>
                <div className="grid gap-2">
                  {evidencias.map((evidencia) => (
                    <div key={evidencia.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{evidencia.nome_arquivo}</span>
                        <span className="text-xs text-gray-500">({formatFileSize(evidencia.tamanho_bytes)})</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(evidencia.caminho_arquivo, '_blank')}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEvidenciaExistente(evidencia.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload de novas evidências */}
            <div className="space-y-2">
              <Label htmlFor="evidencias">Adicionar novas evidências</Label>
              <Input
                id="evidencias"
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={handleFileUpload}
                className="file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-500">
                Formatos aceitos: JPG, PNG, GIF, PDF, DOC, DOCX, XLS, XLSX (máx. 50MB cada)
              </p>
            </div>

            {/* Preview de novos arquivos */}
            {novasEvidencias.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Novos arquivos:</h4>
                <div className="grid gap-2">
                  {novasEvidencias.map((arquivo, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">{arquivo.name}</span>
                        <span className="text-xs text-gray-500">({formatFileSize(arquivo.size)})</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeNovaEvidencia(index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        <DialogFooter className="space-x-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                {plano ? 'Atualizar' : 'Criar'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
