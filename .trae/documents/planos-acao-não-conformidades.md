# Plano de Ação para Não Conformidades em Inspeções

## Visão Geral
Esta documentação técnica detalha a implementação da funcionalidade de planos de ação para não conformidades identificadas durante execuções de inspeções. O sistema garante que cada resposta "Não conforme" tenha pelo menos um plano de ação associado antes da finalização da inspeção.

## Estrutura do Banco de Dados

### Tabela `planos_acao`
```sql
CREATE TABLE planos_acao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execucao_id UUID NOT NULL REFERENCES execucoes_inspecao(id) ON DELETE CASCADE,
    pergunta_id UUID NOT NULL REFERENCES perguntas_inspecao(id) ON DELETE CASCADE,
    desvio TEXT NOT NULL,
    acao TEXT NOT NULL,
    como_fazer TEXT NOT NULL,
    responsavel_matricula INTEGER NOT NULL REFERENCES usuarios(matricula),
    prazo DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pendente', 'em_andamento', 'concluido')),
    criado_por_matricula INTEGER NOT NULL REFERENCES usuarios(matricula),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_planos_acao_execucao_id ON planos_acao(execucao_id);
CREATE INDEX idx_planos_acao_pergunta_id ON planos_acao(pergunta_id);
CREATE INDEX idx_planos_acao_responsavel ON planos_acao(responsavel_matricula);
CREATE INDEX idx_planos_acao_status ON planos_acao(status);

-- Permissões
GRANT ALL PRIVILEGES ON planos_acao TO authenticated;
GRANT SELECT ON planos_acao TO anon;
```

### Tabela `evidencias_plano_acao`
```sql
CREATE TABLE evidencias_plano_acao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plano_acao_id UUID NOT NULL REFERENCES planos_acao(id) ON DELETE CASCADE,
    execucao_id UUID NOT NULL REFERENCES execucoes_inspecao(id) ON DELETE CASCADE,
    nome_arquivo VARCHAR(255) NOT NULL,
    caminho_arquivo TEXT NOT NULL,
    tamanho_arquivo BIGINT NOT NULL,
    tipo_mime VARCHAR(100) NOT NULL,
    tipo_evidencia VARCHAR(20) NOT NULL CHECK (tipo_evidencia IN ('nao_conformidade', 'conclusao')),
    uploaded_por_matricula INTEGER NOT NULL REFERENCES usuarios(matricula),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_evidencias_plano_id ON evidencias_plano_acao(plano_acao_id);
CREATE INDEX idx_evidencias_execucao_id ON evidencias_plano_acao(execucao_id);
CREATE INDEX idx_evidencias_tipo ON evidencias_plano_acao(tipo_evidencia);

-- Permissões
GRANT ALL PRIVILEGES ON evidencias_plano_acao TO authenticated;
GRANT SELECT ON evidencias_plano_acao TO anon;
```

### Bucket Supabase Storage
```sql
-- Criar bucket para armazenar evidências
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('evidencias-planos-acao', 'evidencias-planos-acao', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']);

-- Políticas de segurança para o bucket
CREATE POLICY "Permitir upload de evidências para usuários autenticados" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'evidencias-planos-acao');

CREATE POLICY "Permitir leitura de evidências" ON storage.objects
FOR SELECT TO anon USING (bucket_id = 'evidencias-planos-acao');

CREATE POLICY "Permitir exclusão de evidências pelos criadores" ON storage.objects
FOR DELETE TO authenticated USING (
    bucket_id = 'evidencias-planos-acao' 
    AND auth.uid() = (storage.foldername(name))[1]::uuid
);
```

## Tipos TypeScript

```typescript
// src/lib/types/planos-acao.ts

export interface PlanoAcao {
  id: string;
  execucao_id: string;
  pergunta_id: string;
  desvio: string;
  acao: string;
  como_fazer: string;
  responsavel_matricula: number;
  prazo: string; // ISO date string
  status: 'pendente' | 'em_andamento' | 'concluido';
  criado_por_matricula: number;
  created_at: string;
  updated_at: string;
}

export interface EvidenciaPlanoAcao {
  id: string;
  plano_acao_id: string;
  execucao_id: string;
  nome_arquivo: string;
  caminho_arquivo: string;
  tamanho_arquivo: number;
  tipo_mime: string;
  tipo_evidencia: 'nao_conformidade' | 'conclusao';
  uploaded_por_matricula: number;
  created_at: string;
}

export interface PlanoAcaoFormData {
  desvio: string;
  acao: string;
  como_fazer: string;
  responsavel_matricula: number;
  prazo: string;
  status: 'pendente' | 'em_andamento' | 'concluido';
}

export interface PlanoAcaoComEvidencias extends PlanoAcao {
  evidencias: EvidenciaPlanoAcao[];
}

export interface CreatePlanoAcaoRequest {
  execucao_id: string;
  pergunta_id: string;
  desvio: string;
  acao: string;
  como_fazer: string;
  responsavel_matricula: number;
  prazo: string;
  status: 'pendente' | 'em_andamento' | 'concluido';
}

export interface UpdatePlanoAcaoRequest {
  desvio?: string;
  acao?: string;
  como_fazer?: string;
  responsavel_matricula?: number;
  prazo?: string;
  status?: 'pendente' | 'em_andamento' | 'concluido';
}
```

## APIs REST

### GET /api/inspecoes/execucoes/[execucaoId]/planos-acao
Retorna todos os planos de ação de uma execução.

**Response:**
```typescript
{
  planos: PlanoAcaoComEvidencias[];
}
```

### POST /api/inspecoes/execucoes/[execucaoId]/planos-acao
Cria um novo plano de ação.

**Request Body:**
```typescript
CreatePlanoAcaoRequest
```

**Response:**
```typescript
{
  plano: PlanoAcao;
}
```

### PUT /api/inspecoes/execucoes/[execucaoId]/planos-acao/[planoId]
Atualiza um plano de ação existente.

**Request Body:**
```typescript
UpdatePlanoAcaoRequest
```

**Response:**
```typescript
{
  plano: PlanoAcao;
}
```

### DELETE /api/inspecoes/execucoes/[execucaoId]/planos-acao/[planoId]
Remove um plano de ação.

**Response:**
```typescript
{
  success: boolean;
}
```

### POST /api/inspecoes/execucoes/[execucaoId]/planos-acao/[planoId]/evidencias
Faz upload de evidências para um plano.

**Request:** FormData com arquivo
**Response:**
```typescript
{
  evidencia: EvidenciaPlanoAcao;
}
```

### DELETE /api/inspecoes/execucoes/[execucaoId]/planos-acao/[planoId]/evidencias/[evidenciaId]
Remove uma evidência.

**Response:**
```typescript
{
  success: boolean;
}
```

## Componentes Frontend

### Modal de Plano de Ação (PlanoAcaoModal)
```tsx
// src/components/inspecoes/PlanoAcaoModal.tsx

import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { X, Upload, FileText, Calendar, User, AlertCircle } from 'lucide-react';
import { PlanoAcaoFormData, EvidenciaPlanoAcao } from '@/lib/types/planos-acao';

interface PlanoAcaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PlanoAcaoFormData, evidencias: File[]) => Promise<void>;
  perguntaTitulo: string;
  planoExistente?: PlanoAcaoComEvidencias;
  usuarios: Array<{ matricula: number; nome: string }>;
}

export const PlanoAcaoModal: React.FC<PlanoAcaoModalProps> = ({
  isOpen,
  onClose,
  onSave,
  perguntaTitulo,
  planoExistente,
  usuarios
}) => {
  const [formData, setFormData] = useState<PlanoAcaoFormData>({
    desvio: '',
    acao: '',
    como_fazer: '',
    responsavel_matricula: 0,
    prazo: '',
    status: 'pendente'
  });
  
  const [evidenciasFiles, setEvidenciasFiles] = useState<File[]>([]);
  const [evidenciasExistentes, setEvidenciasExistentes] = useState<EvidenciaPlanoAcao[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (planoExistente) {
      setFormData({
        desvio: planoExistente.desvio,
        acao: planoExistente.acao,
        como_fazer: planoExistente.como_fazer,
        responsavel_matricula: planoExistente.responsavel_matricula,
        prazo: planoExistente.prazo.split('T')[0],
        status: planoExistente.status
      });
      setEvidenciasExistentes(planoExistente.evidencias);
    }
  }, [planoExistente]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'responsavel_matricula' ? parseInt(value) : value
    }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setEvidenciasFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number, isExistente: boolean) => {
    if (isExistente) {
      setEvidenciasExistentes(prev => prev.filter((_, i) => i !== index));
    } else {
      setEvidenciasFiles(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (formData.responsavel_matricula === 0) {
      alert('Por favor, selecione um responsável');
      return;
    }
    
    if (!formData.prazo) {
      alert('Por favor, informe um prazo');
      return;
    }

    setIsLoading(true);
    try {
      await onSave(formData, evidenciasFiles);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar plano de ação:', error);
      alert('Erro ao salvar plano de ação');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {planoExistente ? 'Editar' : 'Criar'} Plano de Ação
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Pergunta:</p>
              <p className="text-sm text-yellow-700">{perguntaTitulo}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Desvio Identificado
            </label>
            <textarea
              name="desvio"
              value={formData.desvio}
              onChange={handleInputChange}
              required
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descreva o desvio identificado..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ação a Ser Tomada
            </label>
            <textarea
              name="acao"
              value={formData.acao}
              onChange={handleInputChange}
              required
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descreva a ação corretiva..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Como Fazer
            </label>
            <textarea
              name="como_fazer"
              value={formData.como_fazer}
              onChange={handleInputChange}
              required
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descreva como executar a ação..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="w-4 h-4 inline mr-1" />
                Responsável
              </label>
              <select
                name="responsavel_matricula"
                value={formData.responsavel_matricula}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>Selecione um responsável</option>
                {usuarios.map(usuario => (
                  <option key={usuario.matricula} value={usuario.matricula}>
                    {usuario.nome} ({usuario.matricula})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Prazo
              </label>
              <input
                type="date"
                name="prazo"
                value={formData.prazo}
                onChange={handleInputChange}
                required
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pendente">Pendente</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="concluido">Concluído</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Upload className="w-4 h-4 inline mr-1" />
              Evidências (opicional)
            </label>
            
            {evidenciasExistentes.length > 0 && (
              <div className="mb-3">
                <p className="text-sm text-gray-600 mb-2">Evidências existentes:</p>
                {evidenciasExistentes.map((evidencia, index) => (
                  <div key={evidencia.id} className="flex items-center justify-between p-2 bg-gray-50 rounded mb-1">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-gray-600" />
                      <span className="text-sm text-gray-700">{evidencia.nome_arquivo}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index, true)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              type="file"
              onChange={handleFileChange}
              multiple
              accept=".jpg,.jpeg,.png,.pdf"
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            
            {evidenciasFiles.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-gray-600 mb-2">Novos arquivos:</p>
                {evidenciasFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded mb-1">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-blue-600" />
                      <span className="text-sm text-blue-700">{file.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index, false)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Salvando...' : 'Salvar Plano'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

### Lista de Planos de Ação (PlanosAcaoList)
```tsx
// src/components/inspecoes/PlanosAcaoList.tsx

import React from 'react';
import { AlertCircle, Calendar, User, FileText, Edit, Trash2, Plus } from 'lucide-react';
import { PlanoAcaoComEvidencias } from '@/lib/types/planos-acao';

interface PlanosAcaoListProps {
  planos: PlanoAcaoComEvidencias[];
  onEdit: (plano: PlanoAcaoComEvidencias) => void;
  onDelete: (planoId: string) => void;
  onAdd: (perguntaId: string, perguntaTitulo: string) => void;
  perguntasNaoConformes: Array<{ id: string; titulo: string }>;
  canEdit: boolean;
}

export const PlanosAcaoList: React.FC<PlanosAcaoListProps> = ({
  planos,
  onEdit,
  onDelete,
  onAdd,
  perguntasNaoConformes,
  canEdit
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'em_andamento': return 'bg-blue-100 text-blue-800';
      case 'concluido': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const planosPorPergunta = perguntasNaoConformes.map(pergunta => ({
    pergunta,
    planos: planos.filter(plano => plano.pergunta_id === pergunta.id)
  }));

  return (
    <div className="space-y-6">
      {planosPorPergunta.map(({ pergunta, planos }) => (
        <div key={pergunta.id} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-2" />
              <div>
                <h3 className="font-medium text-gray-900">{pergunta.titulo}</h3>
                <p className="text-sm text-red-600 mt-1">Não conforme</p>
              </div>
            </div>
            {canEdit && (
              <button
                onClick={() => onAdd(pergunta.id, pergunta.titulo)}
                className="flex items-center px-3 py-1 text-sm text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar Plano
              </button>
            )}
          </div>

          {planos.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Nenhum plano de ação cadastrado</p>
              <p className="text-sm text-gray-400 mt-1">
                É obrigatório criar pelo menos um plano de ação para esta não conformidade
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {planos.map(plano => (
                <div key={plano.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(plano.status)}`}>
                      {plano.status.replace('_', ' ').toUpperCase()}
                    </span>
                    {canEdit && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => onEdit(plano)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(plano.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Desvio:</p>
                      <p className="text-sm text-gray-600">{plano.desvio}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-700">Ação:</p>
                      <p className="text-sm text-gray-600">{plano.acao}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-700">Como fazer:</p>
                      <p className="text-sm text-gray-600">{plano.como_fazer}</p>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        <span>Resp: {plano.responsavel_matricula}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>Prazo: {new Date(plano.prazo).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>

                    {plano.evidencias.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          <FileText className="w-4 h-4 inline mr-1" />
                          Evidências ({plano.evidencias.length})
                        </p>
                        <div className="space-y-1">
                          {plano.evidencias.map(evidencia => (
                            <div key={evidencia.id} className="flex items-center text-sm text-blue-600">
                              <FileText className="w-3 h-3 mr-1" />
                              <a 
                                href={evidencia.caminho_arquivo} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                {evidencia.nome_arquivo}
                              </a>
                              <span className="text-xs text-gray-500 ml-2">
                                ({evidencia.tipo_evidencia === 'nao_conformidade' ? 'Não conformidade' : 'Conclusão'})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
```

## Integração com Páginas de Execução

### Modificações na Página de Execução
```tsx
// src/app/inspecoes/executar/[id]/page.tsx

// Adicionar estado para planos de ação
const [planosAcao, setPlanosAcao] = useState<PlanoAcaoComEvidencias[]>([]);
const [showPlanoModal, setShowPlanoModal] = useState(false);
const [planoEdicao, setPlanoEdicao] = useState<PlanoAcaoComEvidencias | undefined>();
const [perguntaPlano, setPerguntaPlano] = useState<{ id: string; titulo: string } | null>(null);

// Função para carregar planos de ação existentes
const carregarPlanosAcao = useCallback(async () => {
  try {
    const response = await fetch(`/api/inspecoes/execucoes/${execucaoId}/planos-acao`);
    if (response.ok) {
      const data = await response.json();
      setPlanosAcao(data.planos);
    }
  } catch (error) {
    console.error('Erro ao carregar planos de ação:', error);
  }
}, [execucaoId]);

// Carregar planos ao montar o componente
useEffect(() => {
  if (execucaoId) {
    carregarPlanosAcao();
  }
}, [execucaoId, carregarPlanosAcao]);

// Função para salvar plano de ação
const salvarPlanoAcao = async (data: PlanoAcaoFormData, evidencias: File[]) => {
  try {
    const formData = new FormData();
    formData.append('data', JSON.stringify({
      ...data,
      execucao_id: execucaoId,
      pergunta_id: perguntaPlano?.id
    }));
    
    evidencias.forEach(arquivo => {
      formData.append('evidencias', arquivo);
    });

    const endpoint = planoEdicao 
      ? `/api/inspecoes/execucoes/${execucaoId}/planos-acao/${planoEdicao.id}`
      : `/api/inspecoes/execucoes/${execucaoId}/planos-acao`;
    
    const method = planoEdicao ? 'PUT' : 'POST';
    
    const response = await fetch(endpoint, {
      method,
      body: formData
    });

    if (response.ok) {
      await carregarPlanosAcao();
      setPlanoEdicao(undefined);
      setPerguntaPlano(null);
    } else {
      throw new Error('Erro ao salvar plano');
    }
  } catch (error) {
    console.error('Erro ao salvar plano de ação:', error);
    throw error;
  }
};

// Função para validar finalização (verifica se todas as não conformes têm planos)
const validarPlanosObrigatorios = () => {
  const perguntasNaoConformes = respostas.filter(r => r.resposta === 'nao_conforme');
  
  for (const resposta of perguntasNaoConformes) {
    const planosDaPergunta = planosAcao.filter(p => p.pergunta_id === resposta.pergunta_id);
    if (planosDaPergunta.length === 0) {
      return {
        valido: false,
        mensagem: `A pergunta "${resposta.pergunta_titulo}" marcada como "Não conforme" precisa de pelo menos um plano de ação.`
      };
    }
  }
  
  return { valido: true };
};

// Modificar função de finalização
const handleFinalizar = async () => {
  // ... validações existentes ...
  
  const validacaoPlanos = validarPlanosObrigatorios();
  if (!validacaoPlanos.valido) {
    alert(validacaoPlanos.mensagem);
    return;
  }
  
  // ... resto da lógica de finalização ...
};

// Renderizar componente de planos na interface
{respostas.filter(r => r.resposta === 'nao_conforme').length > 0 && (
  <div className="mt-8">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">
      Planos de Ação para Não Conformidades
    </h3>
    <PlanosAcaoList
      planos={planosAcao}
      onEdit={handleEditPlano}
      onDelete={handleDeletePlano}
      onAdd={handleAddPlano}
      perguntasNaoConformes={respostas
        .filter(r => r.resposta === 'nao_conforme')
        .map(r => ({ id: r.pergunta_id, titulo: r.pergunta_titulo }))}
      canEdit={true}
    />
  </div>
)}

// Modal de plano de ação
<PlanoAcaoModal
  isOpen={showPlanoModal}
  onClose={() => {
    setShowPlanoModal(false);
    setPlanoEdicao(undefined);
    setPerguntaPlano(null);
  }}
  onSave={salvarPlanoAcao}
  perguntaTitulo={perguntaPlano?.titulo || ''}
  planoExistente={planoEdicao}
  usuarios={usuariosDisponiveis}
/>
```

## Validações e Regras de Negócio

### Validações Obrigatórias
1. **Plano por Não Conformidade**: Cada pergunta respondida como "Não conforme" deve ter pelo menos um plano de ação
2. **Campos Obrigatórios**: Todos os campos do plano (desvio, ação, como_fazer, responsável, prazo, status) são obrigatórios
3. **Prazo Futuro**: O prazo deve ser uma data futura (exceto para planos já existentes)
4. **Responsável Válido**: O responsável deve ser um usuário válido do sistema
5. **Formato de Arquivos**: Apenas JPG, JPEG, PNG e PDF são permitidos para evidências
6. **Tamanho Máximo**: 50MB por arquivo de evidência

### Regras de Status
- **Pendente**: Plano criado mas não iniciado
- **Em Andamento**: Plano em execução
- **Concluído**: Plano finalizado com sucesso

### Permissões
- **Criar/Editar/Excluir**: Apenas usuários autenticados
- **Visualizar**: Qualquer usuário (anon ou authenticated)
- **Upload de Evidências**: Apenas o criador do plano ou administradores

## Implementação das APIs

### GET /api/inspecoes/execucoes/[execucaoId]/planos-acao
```typescript
// src/app/api/inspecoes/execucoes/[execucaoId]/planos-acao/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWTToken } from '@/lib/auth-utils';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: { execucaoId: string } }
) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
    }

    const user = await verifyJWTToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Buscar planos com evidências
    const { data: planos, error } = await supabase
      .from('planos_acao')
      .select(`
        *,
        evidencias:evidencias_plano_acao(*)
      `)
      .eq('execucao_id', params.execucaoId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar planos:', error);
      return NextResponse.json({ error: 'Erro ao buscar planos' }, { status: 500 });
    }

    return NextResponse.json({ planos });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
```

### POST /api/inspecoes/execucoes/[execucaoId]/planos-acao
```typescript
// src/app/api/inspecoes/execucoes/[execucaoId]/planos-acao/route.ts

export async function POST(
  request: NextRequest,
  { params }: { params: { execucaoId: string } }
) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
    }

    const user = await verifyJWTToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const formData = await request.formData();
    const dataStr = formData.get('data') as string;
    const evidenciasFiles = formData.getAll('evidencias') as File[];
    
    if (!dataStr) {
      return NextResponse.json({ error: 'Dados não fornecidos' }, { status: 400 });
    }

    const data: CreatePlanoAcaoRequest = JSON.parse(dataStr);
    
    // Validar dados
    if (!data.pergunta_id || !data.desvio || !data.acao || !data.como_fazer || 
        !data.responsavel_matricula || !data.prazo || !data.status) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    // Validar prazo (deve ser futuro)
    const prazoDate = new Date(data.prazo);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    if (prazoDate < hoje) {
      return NextResponse.json({ error: 'O prazo deve ser uma data futura' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Criar plano
    const { data: plano, error: planoError } = await supabase
      .from('planos_acao')
      .insert({
        execucao_id: params.execucaoId,
        pergunta_id: data.pergunta_id,
        desvio: data.desvio,
        acao: data.acao,
        como_fazer: data.como_fazer,
        responsavel_matricula: data.responsavel_matricula,
        prazo: data.prazo,
        status: data.status,
        criado_por_matricula: user.matricula
      })
      .select()
      .single();

    if (planoError) {
      console.error('Erro ao criar plano:', planoError);
      return NextResponse.json({ error: 'Erro ao criar plano' }, { status: 500 });
    }

    // Upload de evidências
    const evidenciasCriadas: EvidenciaPlanoAcao[] = [];
    
    for (const file of evidenciasFiles) {
      if (file instanceof File) {
        const fileName = `${plano.id}/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('evidencias-planos-acao')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Erro ao fazer upload:', uploadError);
          continue;
        }

        const { data: evidencia, error: evidenciaError } = await supabase
          .from('evidencias_plano_acao')
          .insert({
            plano_acao_id: plano.id,
            execucao_id: params.execucaoId,
            nome_arquivo: file.name,
            caminho_arquivo: uploadData.path,
            tamanho_arquivo: file.size,
            tipo_mime: file.type,
            tipo_evidencia: 'nao_conformidade',
            uploaded_por_matricula: user.matricula
          })
          .select()
          .single();

        if (!evidenciaError && evidencia) {
          evidenciasCriadas.push(evidencia);
        }
      }
    }

    return NextResponse.json({ 
      plano: {
        ...plano,
        evidencias: evidenciasCriadas
      }
    });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
```

## Testes e Validação

### Fluxo de Teste Completo
1. **Criar uma execução de inspeção**
2. **Responder perguntas marcando algumas como "Não conforme"**
3. **Verificar que o sistema exige planos de ação**
4. **Criar planos de ação para cada não conformidade**
5. **Fazer upload de evidências**
6. **Salvar rascunho e verificar persistência**
7. **Tentar finalizar sem planos (deve falhar)**
8. **Adicionar todos os planos obrigatórios**
9. **Finalizar inspeção com sucesso**

### Casos de Teste Específicos
- Plano com prazo no passado (deve falhar)
- Plano sem responsável (deve falhar)
- Upload de arquivo inválido (deve falhar)
- Exclusão de plano com evidências (deve remover arquivos)
- Tentativa de finalizar inspeção com não conformidades sem planos (deve falhar)

## Performance e Segurança

### Otimizações
- Índices em campos frequentemente consultados
- Paginação para listas grandes de planos
- Cache de arquivos estáticos no CDN
- Compressão de imagens no frontend

### Segurança
- Validação de todos os inputs
- Sanitização de textos antes de salvar
- Rate limiting para uploads
- Verificação de permissões em todas as operações
- Logs de auditoria para criação/exclusão de planos

## Manutenção e Troubleshooting

### Logs Recomendados
- Criação/edição/exclusão de planos
- Uploads de arquivos
- Tentativas de finalização inválidas
- Erros de validação

### Monitoramento
- Tamanho do bucket de evidências
- Performance de queries de planos
- Taxa de sucesso de uploads
- Tempo de resposta das APIs

### Backup
- Configurar backup automático do bucket
- Manter histórico de planos deletados (soft delete opcional)
- Exportação periódica de dados críticos