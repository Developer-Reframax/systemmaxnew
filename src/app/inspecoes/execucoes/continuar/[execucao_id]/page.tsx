'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDateTimeForInput, parseDateTimeFromInput } from '@/lib/utils';

import { 
  ArrowLeft, 
  ArrowRight,
  CheckCircle,
  XCircle,
  MinusCircle,
  Save,
  Play,
  Users,
  MapPin,
  FileText,
  AlertCircle,
  Plus,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import PlanoAcaoModal from '@/components/inspecoes/PlanoAcaoModal';

interface Formulario {
  id: string;
  titulo: string;
  descricao: string;
  categoria: {
    nome: string;
    cor: string;
  };
  perguntas: Pergunta[];
}

interface Pergunta {
  id: string;
  pergunta: string;
  obrigatoria: boolean;
  ordem: number;
  permite_conforme: boolean;
  permite_nao_conforme: boolean;
  permite_nao_aplica: boolean;
}

interface Local {
  id: string;
  local: string;
  contrato: string;
  created_at: string;
  updated_at: string;
}

interface Usuario {
  matricula: string;
  nome: string;
  email: string;
  role: string;
  status: string;
}

interface Resposta {
  pergunta_id: string;
  valor: 'conforme' | 'nao_conforme' | 'nao_aplica' | '';
  observacao?: string;
}

interface ExecucaoExistente {
  id: string;
  formulario: Formulario;
  local: Local;
  participantes: Array<{
    matricula_participante: string;
    usuario: Usuario;
  }>;
  respostas: Array<{
    pergunta_id: string;
    resposta: 'conforme' | 'nao_conforme' | 'nao_aplica' | '';
    observacoes?: string;
  }>;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ExecucaoData {
  local_id: string;
  data_inicio: string;
  participantes: string[];
  respostas: Resposta[];
}

type Etapa = 'local' | 'participantes' | 'perguntas' | 'finalizacao';

function ContinuarExecucaoPage() {
  const router = useRouter();
  const params = useParams();
  useAuth();
  const execucaoId = params?.execucao_id as string;
  
  const [execucaoExistente, setExecucaoExistente] = useState<ExecucaoExistente | null>(null);
  const [locais, setLocais] = useState<Local[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [etapaAtual, setEtapaAtual] = useState<Etapa>('local');
  
  const [execucaoData, setExecucaoData] = useState<ExecucaoData>({
    local_id: '',
    data_inicio: new Date().toISOString(),
    participantes: [],
    respostas: []
  });
  const [perguntaAtual, setPerguntaAtual] = useState(0);
  const [searchUsuarios, setSearchUsuarios] = useState('');
  const [planoModalOpen, setPlanoModalOpen] = useState(false);
  // Removido estado temNaoConformes — bloco de plano na finalização foi retirado
  const [perguntaIdCriandoPlano, setPerguntaIdCriandoPlano] = useState<string>('');
  const [planosExistentes, setPlanosExistentes] = useState<Array<{id: string, pergunta_id: string, desvio: string}>>([]);
  
  const adicionarParticipante = (matricula: string) => {
    setExecucaoData(prev => ({
      ...prev,
      participantes: prev.participantes.includes(matricula)
        ? prev.participantes
        : [...prev.participantes, matricula]
    }));
  };

  const removerParticipante = (matricula: string) => {
    setExecucaoData(prev => ({
      ...prev,
      participantes: prev.participantes.filter(p => p !== matricula)
    }));
  };

  // Navegação de perguntas (uma por vez)
  const proximaPergunta = () => {
    if (!execucaoExistente) return;
    setPerguntaAtual((prev) => Math.min(prev + 1, execucaoExistente.formulario.perguntas.length - 1));
  };

  const perguntaAnterior = () => {
    setPerguntaAtual((prev) => Math.max(prev - 1, 0));
  };

  // Removido: verificação agregada de não conformidades (não utilizada após limpeza da finalização)

  // Abrir modal de plano de ação para uma pergunta específica
  const abrirPlanoModalParaPergunta = (perguntaId: string) => {
    setPerguntaIdCriandoPlano(perguntaId);
    setPlanoModalOpen(true);
  };

  // Buscar planos de ação existentes
  const buscarPlanosExistentes = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token || !execucaoId) return;

      const response = await fetch(`/api/inspecoes/execucoes/${execucaoId}/planos-acao`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPlanosExistentes(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar planos:', error);
    }
  }, [execucaoId]);

  // Obter planos de uma pergunta específica
  const obterPlanosPorPergunta = (perguntaId: string) => {
    return planosExistentes.filter(plano => plano.pergunta_id === perguntaId);
  };

  // Removido: efeito que chamava verificação de não conformidades

  useEffect(() => {
    buscarPlanosExistentes();
  }, [buscarPlanosExistentes]);

  // Atualizar resposta individual
  const atualizarResposta = (perguntaId: string, campo: 'valor' | 'observacao', valor: string) => {
    setExecucaoData((prev) => {
      const existing = prev.respostas.find((r) => r.pergunta_id === perguntaId);
      let novasRespostas: Resposta[];

      if (existing) {
        novasRespostas = prev.respostas.map((r) =>
          r.pergunta_id === perguntaId
            ? {
                ...r,
                valor: campo === 'valor' ? (valor as Resposta['valor']) : r.valor,
                observacao: campo === 'observacao' ? valor : r.observacao,
              }
            : r
        );
      } else {
        novasRespostas = [
          ...prev.respostas,
          {
            pergunta_id: perguntaId,
            valor: campo === 'valor' ? (valor as Resposta['valor']) : '',
            observacao: campo === 'observacao' ? valor : '',
          },
        ];
      }

      return { ...prev, respostas: novasRespostas };
    });
  };

  // execucaoId já declarado no topo para evitar uso antes da definição

  // Carregar execução existente
  const fetchExecucaoExistente = useCallback(async () => {
    if (!execucaoId) return;
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch(`/api/inspecoes/execucoes/${execucaoId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Erro ao carregar execução');
      }
      
      const data = await response.json();
      const execucao = data?.data ?? data;
      if (!execucao || !execucao.local) {
        toast.error('Dados da execução inválidos');
        router.push('/inspecoes/execucoes');
        return;
      }
      setExecucaoExistente(execucao);

      // Buscar formulário completo para garantir flags permite_*
      try {
        const formId = execucao?.formulario?.id;
        if (formId) {
          const formResp = await fetch(`/api/inspecoes/formularios/${formId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (formResp.ok) {
            const formData = await formResp.json();
            const formularioCompleto = formData?.data ?? formData;
            if (formularioCompleto && Array.isArray(formularioCompleto.perguntas)) {
              setExecucaoExistente((prev) => prev ? ({
                ...prev,
                formulario: {
                  ...prev.formulario,
                  ...formularioCompleto,
                  perguntas: formularioCompleto.perguntas
                }
              }) : prev);
            }
          }
        }
      } catch (e) {
        console.warn('Não foi possível carregar formulário completo:', e);
      }

      // Pré-preencher dados
      setExecucaoData({
        local_id: execucao.local?.id ?? '',
        data_inicio: execucao.data_inicio || new Date().toISOString(),
        participantes: (Array.isArray(execucao.participantes) ? execucao.participantes : []).map((p: { matricula_participante: string; usuario: Usuario }) => p.matricula_participante),
        respostas: (Array.isArray(execucao.respostas) ? execucao.respostas : []).map((r: { pergunta_id: string; resposta: 'conforme' | 'nao_conforme' | 'nao_aplica' | ''; observacoes?: string }) => ({
          pergunta_id: r.pergunta_id,
          valor: r.resposta,
          observacao: r.observacoes || ''
        }))
      });
      
      // Determinar etapa atual baseada no progresso
      if (execucao.respostas && execucao.respostas.length > 0) {
        setEtapaAtual('perguntas');
      } else if (execucao.participantes && execucao.participantes.length > 0) {
        setEtapaAtual('participantes');
      } else {
        setEtapaAtual('local');
      }
      
    } catch (error) {
      console.error('Erro ao carregar execução:', error);
      toast.error('Erro ao carregar execução');
      router.push('/inspecoes/execucoes');
    }
  }, [execucaoId, router]);

  // Carregar locais
  const fetchLocais = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/inspecoes/locais?limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLocais(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar locais:', error);
    }
  }, []);

  // Carregar usuários
  const fetchUsuarios = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const searchParam = searchUsuarios ? `&search=${encodeURIComponent(searchUsuarios)}` : '';
      const response = await fetch(`/api/inspecoes/usuarios?limit=50${searchParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsuarios(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  }, [searchUsuarios]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchExecucaoExistente(),
        fetchLocais(),
        fetchUsuarios()
      ]);
      setLoading(false);
    };

    loadData();
  }, [fetchExecucaoExistente, fetchLocais, fetchUsuarios]);

  // Verificar se o ID da execução está presente
  if (!execucaoId) {
    router.push('/inspecoes/execucoes');
    return null;
  }

  // Salvar como rascunho
  const salvarRascunho = async () => {
    if (!execucaoExistente) return;
    
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
  
      const response = await fetch(`/api/inspecoes/execucoes/${execucaoId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          local_id: execucaoData.local_id,
          data_inicio: execucaoData.data_inicio,
          participantes: execucaoData.participantes,
          respostas: execucaoData.respostas.map(r => ({
            pergunta_id: r.pergunta_id,
            resposta: r.valor,
            observacoes: r.observacao || null
          })),
          status: 'em_andamento'
        }),
      });
  
      if (response.ok) {
        toast.success('Rascunho salvo com sucesso!');
      } else {
        throw new Error('Erro ao salvar rascunho');
      }
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error);
      toast.error('Erro ao salvar rascunho');
    } finally {
      setSaving(false);
    }
  };

  // Finalizar execução
  const finalizarExecucao = async () => {
    if (!execucaoExistente) return;

    const totalPerguntas = execucaoExistente.formulario.perguntas.length;
    const totalRespondidas = execucaoData.respostas.filter(r => r.valor !== '').length;
    if (totalRespondidas !== totalPerguntas) {
      toast.warning('Todas as perguntas devem ser respondidas!');
      return;
    }

    // Verificar se existem perguntas "Não Conforme" sem planos de ação
    const perguntasNaoConforme = execucaoData.respostas.filter(r => r.valor === 'nao_conforme');
    if (perguntasNaoConforme.length > 0) {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        // Buscar planos de ação existentes
        const planosResponse = await fetch(`/api/inspecoes/execucoes/${execucaoId}/planos-acao`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!planosResponse.ok) {
          toast.error('Erro ao verificar planos de ação');
          return;
        }

        const planosData = await planosResponse.json();
        const planosExistentes = planosData.data || [];

        if (planosExistentes.length === 0) {
          toast.error('Existem perguntas "Não Conforme" sem planos de ação cadastrados. Por favor, crie pelo menos um plano de ação antes de finalizar.');
          return;
        }
      } catch (error) {
        console.error('Erro ao verificar planos de ação:', error);
        toast.error('Erro ao verificar planos de ação');
        return;
      }
    }
    
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
  
      const response = await fetch(`/api/inspecoes/execucoes/${execucaoId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          local_id: execucaoData.local_id,
          data_inicio: execucaoData.data_inicio,
          participantes: execucaoData.participantes,
          respostas: execucaoData.respostas.map(r => ({
            pergunta_id: r.pergunta_id,
            resposta: r.valor,
            observacoes: r.observacao || null
          })),
          status: 'concluida',
          concluir: true
        }),
      });
  
      if (response.ok) {
        toast.success('Execução finalizada com sucesso!');
        router.push(`/inspecoes/execucoes/${execucaoId}`);
      } else {
        throw new Error('Erro ao finalizar execução');
      }
    } catch (error) {
      console.error('Erro ao finalizar execução:', error);
      toast.error('Erro ao finalizar execução');
    } finally {
      setSaving(false);
    }
  };

  // Navegação entre etapas
  const proximaEtapa = () => {
    const etapas: Etapa[] = ['local', 'participantes', 'perguntas', 'finalizacao'];
    const indiceAtual = etapas.indexOf(etapaAtual);
    if (indiceAtual < etapas.length - 1) {
      setEtapaAtual(etapas[indiceAtual + 1]);
    }
  };

  const etapaAnterior = () => {
    const etapas: Etapa[] = ['local', 'participantes', 'perguntas', 'finalizacao'];
    const indiceAtual = etapas.indexOf(etapaAtual);
    if (indiceAtual > 0) {
      setEtapaAtual(etapas[indiceAtual - 1]);
    }
  };

  // Validações
  const podeProximaEtapa = () => {
    switch (etapaAtual) {
      case 'local':
        return execucaoData.local_id !== '';
      case 'participantes':
        return execucaoData.participantes.length > 0;
      case 'perguntas': {
        if (!execucaoExistente) return false;
        const perguntasObrigatorias = execucaoExistente.formulario.perguntas.filter(p => p.obrigatoria);
        const respostasObrigatorias = perguntasObrigatorias.filter(p => 
          execucaoData.respostas.some(r => r.pergunta_id === p.id && r.valor !== '')
        );
        return respostasObrigatorias.length === perguntasObrigatorias.length;
      }
      default:
        return true;
    }
  };


  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando execução...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!execucaoExistente) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Execução não encontrada</h2>
            <p className="text-gray-600 mb-4">A execução solicitada não foi encontrada.</p>
            <Button onClick={() => router.push('/inspecoes/execucoes')}>
              Voltar para Execuções
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/inspecoes/execucoes')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Continuar Execução
              </h1>
              <p className="text-gray-600">
                {execucaoExistente.formulario.titulo}
              </p>
            </div>
          </div>
          
          <div />
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-4 py-4">
          {[
            { key: 'local', label: 'Local', icon: MapPin },
            { key: 'participantes', label: 'Participantes', icon: Users },
            { key: 'perguntas', label: 'Perguntas', icon: FileText },
            { key: 'finalizacao', label: 'Finalização', icon: CheckCircle }
          ].map((etapa, index) => {
            const isActive = etapaAtual === etapa.key;
            const isCompleted = ['local', 'participantes', 'perguntas', 'finalizacao'].indexOf(etapaAtual) > index;
            const Icon = etapa.icon;
            
            return (
              <div key={etapa.key} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  isActive 
                    ? 'border-blue-600 bg-blue-600 text-white' 
                    : isCompleted 
                      ? 'border-green-600 bg-green-600 text-white'
                      : 'border-gray-300 bg-white text-gray-400'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {etapa.label}
                </span>
                {index < 3 && (
                  <div className={`w-8 h-0.5 mx-4 ${
                    isCompleted ? 'bg-green-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Content */}
        <Card>
          <CardContent className="p-6">
            {/* Etapa Local */}
            {etapaAtual === 'local' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5" />
                    <span>Selecione o Local</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Local da Inspeção
                    </label>
                    <select 
                      value={execucaoData.local_id} 
                      onChange={(e) => setExecucaoData({ ...execucaoData, local_id: e.target.value })}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="">Selecione um local...</option>
                      {locais.map((local) => (
                        <option key={local.id} value={local.id}>
                          {local.local}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data e Hora de Início da Inspeção
                    </label>
                    <Input
                      type="datetime-local"
                      value={formatDateTimeForInput(execucaoData.data_inicio)}
                      onChange={(e) => setExecucaoData({ ...execucaoData, data_inicio: parseDateTimeFromInput(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Etapa Participantes */}
            {etapaAtual === 'participantes' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>Adicionar Participantes</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Input
                      placeholder="Buscar usuários..."
                      value={searchUsuarios}
                      onChange={(e) => setSearchUsuarios(e.target.value)}
                    />
                  </div>

                  {execucaoData.participantes.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Participantes Selecionados:</h4>
                      <div className="space-y-2">
                        {execucaoData.participantes.map(participanteId => {
                          const usuario = usuarios.find(u => u.matricula === participanteId);
                          if (!usuario) return null;
                          
                          return (
                            <div key={participanteId} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                              <div>
                                <div className="font-medium">{usuario.nome}</div>
                                <div className="text-sm text-gray-600">{usuario.email}</div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removerParticipante(participanteId)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Usuários Disponíveis:</h4>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {usuarios
                        .filter(usuario => !execucaoData.participantes.includes(usuario.matricula))
                        .filter(usuario => 
                          searchUsuarios === '' ||
                          usuario.nome.toLowerCase().includes(searchUsuarios.toLowerCase()) ||
                          usuario.matricula.toString().includes(searchUsuarios)
                        )
                        .map((usuario) => (
                          <div key={usuario.matricula} className="flex items-center justify-between p-2 border rounded-lg">
                            <div>
                              <div className="font-medium">{usuario.nome}</div>
                              <div className="text-sm text-gray-600">{usuario.email}</div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => adicionarParticipante(usuario.matricula)}
                            >
                              Adicionar
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Etapa Perguntas */}
            {etapaAtual === 'perguntas' && (
              <div className="space-y-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        Pergunta {perguntaAtual + 1} de {execucaoExistente.formulario.perguntas.length}
                      </span>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={perguntaAnterior}
                          disabled={perguntaAtual === 0}
                        >
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={proximaPergunta}
                          disabled={perguntaAtual === execucaoExistente.formulario.perguntas.length - 1}
                        >
                          Próxima
                        </Button>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((perguntaAtual + 1) / execucaoExistente.formulario.perguntas.length) * 100}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
                
                {execucaoExistente.formulario.perguntas[perguntaAtual] && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <FileText className="w-5 h-5" />
                        <span>
                          {execucaoExistente.formulario.perguntas[perguntaAtual].pergunta}
                          {execucaoExistente.formulario.perguntas[perguntaAtual].obrigatoria && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {(() => {
                          const perguntaObj = execucaoExistente.formulario.perguntas[perguntaAtual];
                          const options = [
                            { valor: 'conforme', label: 'Conforme', icon: CheckCircle, color: 'green', permitido: perguntaObj?.permite_conforme },
                            { valor: 'nao_conforme', label: 'Não Conforme', icon: XCircle, color: 'red', permitido: perguntaObj?.permite_nao_conforme },
                            { valor: 'nao_aplica', label: 'Não se Aplica', icon: MinusCircle, color: 'gray', permitido: perguntaObj?.permite_nao_aplica }
                          ].filter(opcao => opcao.permitido);
                          
                          return options.map(({ valor, label, icon: Icon, color }) => {
                            const resposta = execucaoData.respostas.find(r => 
                              r.pergunta_id === perguntaObj.id
                            );
                            const isSelected = resposta?.valor === valor;
                            
                            return (
                              <button
                                key={valor}
                                onClick={() => atualizarResposta(
                                  perguntaObj.id,
                                  'valor',
                                  valor
                                )}
                                className={`px-4 py-2 border-2 rounded-lg transition-all ${
                                  isSelected
                                    ? `border-${color}-500 bg-${color}-50`
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  <Icon className={`w-5 h-5 ${
                                    isSelected ? `text-${color}-600` : 'text-gray-400'
                                  }`} />
                                  <span className={`font-medium ${
                                    isSelected ? `text-${color}-700` : 'text-gray-600'
                                  }`}>
                                    {label}
                                  </span>
                                </div>
                              </button>
                            );
                          });
                        })()}
                      </div>
                      
                      {/* Botão Criar Plano de Ação - aparece quando marcar Não Conforme */}
                      {execucaoData.respostas.find(r => 
                        r.pergunta_id === execucaoExistente.formulario.perguntas[perguntaAtual].id
                      )?.valor === 'nao_conforme' && (
                        <div className="space-y-4">
                          {/* Mostrar planos existentes para esta pergunta */}
                          {obterPlanosPorPergunta(execucaoExistente.formulario.perguntas[perguntaAtual].id).length > 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <h4 className="font-medium text-blue-800 mb-2">Planos de Ação Criados</h4>
                              <div className="space-y-2">
                                {obterPlanosPorPergunta(execucaoExistente.formulario.perguntas[perguntaAtual].id).map((plano, index) => (
                                  <div key={plano.id} className="flex items-center space-x-2 text-sm text-blue-700">
                                    <CheckCircle className="h-4 w-4" />
                                    <span>Plano {index + 1}: {plano.desvio}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-2">
                              <AlertTriangle className="h-5 w-5 text-red-600" />
                              <h4 className="font-medium text-red-800">Não Conformidade Detectada</h4>
                            </div>
                            <p className="text-red-700 text-sm mb-3">
                              Esta não conformidade requer um plano de ação para correção.
                              {obterPlanosPorPergunta(execucaoExistente.formulario.perguntas[perguntaAtual].id).length > 0 && 
                                ` Você já criou ${obterPlanosPorPergunta(execucaoExistente.formulario.perguntas[perguntaAtual].id).length} plano(s) para esta não conformidade.`}
                            </p>
                            <Button
                              onClick={() => abrirPlanoModalParaPergunta(execucaoExistente.formulario.perguntas[perguntaAtual].id)}
                              variant="outline"
                              className="border-red-300 text-red-700 hover:bg-red-100"
                              size="sm"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              {obterPlanosPorPergunta(execucaoExistente.formulario.perguntas[perguntaAtual].id).length > 0 ? 'Criar Outro Plano' : 'Criar Plano de Ação'}
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      <textarea
                        value={execucaoData.respostas.find(r => 
                          r.pergunta_id === execucaoExistente.formulario.perguntas[perguntaAtual].id
                        )?.observacao || ''}
                        onChange={(e) => atualizarResposta(
                          execucaoExistente.formulario.perguntas[perguntaAtual].id,
                          'observacao',
                          e.target.value
                        )}
                        placeholder="Adicione uma observação sobre esta pergunta..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Etapa Finalização */}
            {etapaAtual === 'finalizacao' && (
              <div className="space-y-6">
                <div className="flex items-center space-x-2 mb-4">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Finalizar Execução</h3>
                </div>
                
                {/* Removido: bloco de criação de plano na finalização (agora feito nas perguntas) */}
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Resumo da Execução</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Formulário:</strong> {execucaoExistente.formulario.titulo}</p>
                    <p><strong>Local:</strong> {locais.find(l => l.id === execucaoData.local_id)?.local}</p>
                    <p><strong>Participantes:</strong> {execucaoData.participantes.length}</p>
                    <p><strong>Respostas:</strong> {execucaoData.respostas.filter(r => r.valor !== '').length} de {execucaoExistente.formulario.perguntas.length}</p>
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <Button
                    onClick={finalizarExecucao}
                    disabled={saving || !podeProximaEtapa()}
                    className="px-8"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {saving ? 'Finalizando...' : 'Finalizar Execução'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex justify-between">
          <div>
            {etapaAtual !== 'local' && (
              <Button variant="outline" onClick={etapaAnterior}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            )}
          </div>

          <div className="flex space-x-4">
            {etapaAtual === 'perguntas' && (
              <Button
                variant="outline"
                onClick={salvarRascunho}
                disabled={saving}
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Rascunho
              </Button>
            )}

            {etapaAtual === 'finalizacao' ? (
              <Button
                onClick={finalizarExecucao}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Finalizar Execução
              </Button>
            ) : (
              <Button 
                onClick={proximaEtapa} 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!podeProximaEtapa()}
              >
                Continuar
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Plano de Ação */}
      <PlanoAcaoModal
        isOpen={planoModalOpen}
        onClose={() => {
          setPlanoModalOpen(false);
          setPerguntaIdCriandoPlano('');
        }}
        onSuccess={() => {
          toast.success('Plano de ação criado com sucesso!');
          setPlanoModalOpen(false);
          setPerguntaIdCriandoPlano('');
          buscarPlanosExistentes(); // Recarregar planos após criar novo
        }}
        execucaoId={execucaoId}
        perguntaId={perguntaIdCriandoPlano}
        usuarios={usuarios.map(user => ({
          ...user,
          matricula: parseInt(user.matricula)
        }))}
      />
    </MainLayout>
  );
}

export default ContinuarExecucaoPage;
