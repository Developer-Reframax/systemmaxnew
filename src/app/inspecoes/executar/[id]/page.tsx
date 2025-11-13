'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
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
import { PlanoAcaoWithRelations } from '@/types/plano-acao';

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

interface ExecucaoData {
  local_id: string;
  data_inicio: string;
  participantes: string[];
  respostas: Resposta[];
}

interface ParticipanteExecucao {
  matricula_participante: string;
}

interface RespostaExecucao {
  pergunta_id: string;
  resposta: 'conforme' | 'nao_conforme' | 'nao_aplica' | '';
  observacoes?: string;
}

type Etapa = 'local' | 'participantes' | 'perguntas' | 'finalizacao';

function ExecutarFormularioPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  useAuth();
  
  const [formulario, setFormulario] = useState<Formulario | null>(null);
  const [locais, setLocais] = useState<Local[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [etapaAtual, setEtapaAtual] = useState<Etapa>('local');
  // Loading flags para UX consistente
  const [formularioLoading, setFormularioLoading] = useState(true);
  const [locaisLoading, setLocaisLoading] = useState(true);
  const [execucaoLoading, setExecucaoLoading] = useState<boolean>(!!searchParams?.get('execucao_id'));
  
  // Variáveis para controlar se estamos continuando uma execução existente
  const execucaoId = searchParams?.get('execucao_id');
  const [isContinuandoExecucao, setIsContinuandoExecucao] = useState(false);
  const [execucaoCriadaId, setExecucaoCriadaId] = useState<string>('');
  const [tentativaCriacaoParaLocal, setTentativaCriacaoParaLocal] = useState<string>('');
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const [execucaoData, setExecucaoData] = useState<ExecucaoData>({
    local_id: '',
    data_inicio: new Date().toISOString(),
    participantes: [],
    respostas: []
  });

  const [perguntaAtual, setPerguntaAtual] = useState(0);
  const [searchUsuarios, setSearchUsuarios] = useState('');
  // Planos de Ação: estados do modal e lista existente
  const [planoModalOpen, setPlanoModalOpen] = useState(false);
  const [perguntaIdCriandoPlano, setPerguntaIdCriandoPlano] = useState<string | undefined>(undefined);
  const [planosExistentes, setPlanosExistentes] = useState<PlanoAcaoWithRelations[]>([]);

  // Removido: checagem agregada de existência de planos (estado não utilizado)

  // Buscar planos de ação existentes desta execução
  const buscarPlanosExistentes = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token || !execucaoId) return;

      const response = await fetch(`/api/inspecoes/execucoes/${execucaoId}/planos-acao`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPlanosExistentes(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar planos:', error);
    }
  }, [execucaoId]);

  useEffect(() => {
    if (isContinuandoExecucao && execucaoId) {
      buscarPlanosExistentes();
    }
  }, [buscarPlanosExistentes, isContinuandoExecucao, execucaoId]);

  // Abrir modal para criar plano de ação vinculado à pergunta
  const abrirPlanoModalParaPergunta = (perguntaId: string) => {
    setPerguntaIdCriandoPlano(perguntaId);
    setPlanoModalOpen(true);
  };

  // Obter planos cadastrados para uma pergunta específica
  const obterPlanosPorPergunta = (perguntaId: string) => {
    return planosExistentes.filter(plano => plano.pergunta_id === perguntaId);
  };

  const usuariosPlanoAcao = usuarios.map(u => ({
    matricula: typeof u.matricula === 'number' ? u.matricula : parseInt(String(u.matricula), 10),
    nome: u.nome,
    email: u.email
  }));

  // Função para verificar se todas as perguntas foram respondidas
  const todasPerguntasRespondidas = () => {
    if (!formulario) return false;
    return formulario.perguntas.every(pergunta => {
      const resposta = execucaoData.respostas.find(r => r.pergunta_id === pergunta.id);
      return resposta && resposta.valor !== '';
    });
  };

  // Função para criar execução inicial (somente quando há local selecionado)
  const criarExecucaoInicial = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token || !params?.id || !execucaoData.local_id) return null;

      console.log('Criando execução inicial', {
        formulario_id: params.id,
        local_id: execucaoData.local_id,
        data_inicio: execucaoData.data_inicio,
        status: 'em_andamento'
      });

      const response = await fetch('/api/inspecoes/execucoes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formulario_id: params.id,
          local_id: execucaoData.local_id,
          data_inicio: execucaoData.data_inicio,
          status: 'em_andamento'
        }),
      });

      if (!response.ok) {
        const status = response.status;
        let errorMessage = '';
        try {
          const errorData = await response.json();
          errorMessage = errorData?.error || errorData?.message || JSON.stringify(errorData);
        } catch {
          try {
            errorMessage = await response.text();
          } catch {
            errorMessage = 'Erro desconhecido';
          }
        }
        console.error('Erro ao criar execução inicial', { status, errorMessage });
        toast.error(`Erro ao iniciar execução (${status}): ${errorMessage}`);
        return null;
      }

      const data = await response.json();
      const novoExecucaoId = data?.data?.id ?? data?.id;
      
      if (novoExecucaoId) {
        setExecucaoCriadaId(novoExecucaoId);
        // Atualizar URL com o ID da execução
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('execucao_id', novoExecucaoId);
        window.history.replaceState({}, '', newUrl.toString());
        
        toast.success('Execução iniciada com sucesso!');
        return novoExecucaoId;
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao criar execução inicial:', error);
      toast.error('Erro ao iniciar execução');
      return null;
    }
  }, [params?.id, execucaoData.local_id, execucaoData.data_inicio]);

  const fetchFormulario = useCallback(async () => {
    try {
      setFormularioLoading(true);
      const token = localStorage.getItem('auth_token');
      if (!token || !params?.id) return;

      const response = await fetch(`/api/inspecoes/formularios/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Não exibir mensagem antes de terminar o loading; deixar UI tratar quando loading=false
          setFormularioLoading(false);
          setFormulario(null);
          return;
        }
        throw new Error('Erro ao carregar formulário');
      }

      const data = await response.json();
      setFormulario(data.data);
      
      // Inicializar respostas sem seleção prévia
      const respostasIniciais = data.data.perguntas.map((pergunta: Pergunta) => ({
        pergunta_id: pergunta.id,
        valor: '' as const,
        observacao: ''
      }));
      
      setExecucaoData(prev => ({
        ...prev,
        respostas: respostasIniciais
      }));
      setFormularioLoading(false);
    } catch (error) {
      console.error('Erro ao carregar formulário:', error);
      toast.error('Erro ao carregar formulário');
      setFormularioLoading(false);
    }
  }, [params?.id]);

  // Criar execução inicial assim que houver local selecionado e ainda não existir execução
  useEffect(() => {
    const iniciar = async () => {
      if (
        !execucaoId &&
        !execucaoCriadaId &&
        execucaoData.local_id &&
        tentativaCriacaoParaLocal !== execucaoData.local_id
      ) {
        setTentativaCriacaoParaLocal(execucaoData.local_id);
        await criarExecucaoInicial();
      }
    };
    iniciar();
  }, [execucaoId, execucaoCriadaId, execucaoData.local_id, tentativaCriacaoParaLocal, criarExecucaoInicial]);

  const fetchLocais = useCallback(async () => {
    try {
      setLocaisLoading(true);
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
    } finally {
      setLocaisLoading(false);
    }
  }, []);

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

  const fetchExecucaoExistente = useCallback(async () => {
    if (!execucaoId) return;
    
    try {
      setExecucaoLoading(true);
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch(`/api/inspecoes/execucoes/${execucaoId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        toast.error('Erro ao carregar execução existente');
        return;
      }

      const data = await response.json();
      const execucao = data.data;
      
      // Carregar dados da execução existente
      setExecucaoData(prev => ({
        ...prev,
        local_id: execucao.local.id,
        data_inicio: execucao.data_inicio || prev.data_inicio,
        participantes: execucao.participantes.map((p: ParticipanteExecucao) => p.matricula_participante),
        respostas: execucao.respostas.map((r: RespostaExecucao) => ({
          pergunta_id: r.pergunta_id,
          valor: r.resposta,
          observacao: r.observacoes || ''
        }))
      }));
      
      setIsContinuandoExecucao(true);
      
      // Se já tem respostas, ir direto para a etapa de perguntas
      if (execucao.respostas.length > 0) {
        setEtapaAtual('perguntas');
      }
      
      toast.success('Execução carregada com sucesso!');
    } catch (error) {
      console.error('Erro ao carregar execução existente:', error);
      toast.error('Erro ao carregar execução existente');
    } finally {
      setExecucaoLoading(false);
    }
  }, [execucaoId]);

  useEffect(() => {
    fetchFormulario();
    fetchLocais();
    if (execucaoId) {
      fetchExecucaoExistente();
    }
  }, [fetchFormulario, fetchLocais, fetchExecucaoExistente, execucaoId]);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  // Atualizar estado de loading com base nas flags
  useEffect(() => {
    setLoading(formularioLoading || locaisLoading || (execucaoId ? execucaoLoading : false));
  }, [formularioLoading, locaisLoading, execucaoLoading, execucaoId]);

  const proximaEtapa = async () => {
    switch (etapaAtual) {
      case 'local':
        if (!execucaoData.local_id) {
          toast.error('Selecione um local para continuar');
          return;
        }
        setEtapaAtual('participantes');
        break;
      case 'participantes':
        if (execucaoData.participantes.length === 0) {
          toast.error('Adicione pelo menos um participante');
          return;
        }
        setEtapaAtual('perguntas');
        break;
      case 'perguntas': {
        if (!todasPerguntasRespondidas()) {
          toast.error('Responda todas as perguntas');
          return;
        }

        // Verificar se existem perguntas "Não Conforme" sem planos de ação
        const perguntasNaoConforme = execucaoData.respostas.filter(r => r.valor === 'nao_conforme');
        if (perguntasNaoConforme.length > 0) {
          const execucaoIdAtual = execucaoId || execucaoCriadaId;
          if (execucaoIdAtual) {
            try {
              const token = localStorage.getItem('auth_token');
              if (!token) return;

              // Buscar planos de ação existentes
              const planosResponse = await fetch(`/api/inspecoes/execucoes/${execucaoIdAtual}/planos-acao`, {
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
          } else {
            toast.error('Existem perguntas "Não Conforme" sem planos de ação cadastrados. Por favor, crie pelo menos um plano de ação antes de finalizar.');
            return;
          }
        }

        setEtapaAtual('finalizacao');
        break;
      }
      default:
        break;
    }
  };

  const etapaAnterior = () => {
    switch (etapaAtual) {
      case 'participantes':
        setEtapaAtual('local');
        break;
      case 'perguntas':
        setEtapaAtual('participantes');
        break;

      case 'finalizacao':
        setEtapaAtual('perguntas');
        break;
      default:
        break;
    }
  };

  const adicionarParticipante = (usuarioMatricula: string) => {
    setExecucaoData(prev => ({
      ...prev,
      participantes: prev.participantes.includes(usuarioMatricula)
        ? prev.participantes
        : [...prev.participantes, usuarioMatricula]
    }));

    // Auto-save após mudança
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    const timeout = setTimeout(() => {
      autoSave();
    }, 1000);
    setAutoSaveTimeout(timeout);
  };

  const removerParticipante = (usuarioMatricula: string) => {
    setExecucaoData(prev => ({
      ...prev,
      participantes: prev.participantes.filter(matricula => matricula !== usuarioMatricula)
    }));

    // Auto-save após mudança
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    const timeout = setTimeout(() => {
      autoSave();
    }, 1000);
    setAutoSaveTimeout(timeout);
  };

  // Função de auto-save
  const autoSave = useCallback(async () => {
    const execucaoIdAtual = execucaoId || execucaoCriadaId;
    if (!execucaoIdAtual) return;

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch(`/api/inspecoes/execucoes/${execucaoIdAtual}`, {
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

      if (!response.ok) {
        console.error('Erro no auto-save');
      }
    } catch (error) {
      console.error('Erro no auto-save:', error);
    }
  }, [execucaoId, execucaoCriadaId, execucaoData]);

  const atualizarResposta = (perguntaId: string, campo: 'valor' | 'observacao', valor: string) => {
    setExecucaoData(prev => {
      const existing = prev.respostas.find(r => r.pergunta_id === perguntaId);
      let novasRespostas: Resposta[];

      if (existing) {
        novasRespostas = prev.respostas.map(r =>
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

    // Auto-save após mudança
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    const timeout = setTimeout(() => {
      autoSave();
    }, 1000); // 1 segundo de debounce
    setAutoSaveTimeout(timeout);
  };

  const proximaPergunta = () => {
    if (formulario && perguntaAtual < formulario.perguntas.length - 1) {
      setPerguntaAtual(perguntaAtual + 1);
    }
  };

  const perguntaAnterior = () => {
    if (perguntaAtual > 0) {
      setPerguntaAtual(perguntaAtual - 1);
    }
  };

  const salvarRascunho = async () => {
     setSaving(true);
     try {
       const token = localStorage.getItem('auth_token');
       if (!token) return;

       let response;
       // Validar local antes de salvar/criar
       if (!execucaoData.local_id) {
         toast.error('Selecione um local antes de salvar');
         return;
       }
       
       if (isContinuandoExecucao && execucaoId) {
         // Atualizar execução existente
         response = await fetch(`/api/inspecoes/execucoes/${execucaoId}`, {
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
       } else {
         // Criar nova execução
         response = await fetch('/api/inspecoes/execucoes', {
           method: 'POST',
           headers: {
             'Authorization': `Bearer ${token}`,
             'Content-Type': 'application/json',
           },
           body: JSON.stringify({
             formulario_id: params?.id,
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
       }

       if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.error || 'Erro ao salvar rascunho');
       }

       toast.success('Rascunho salvo com sucesso!');
     } catch (error: unknown) {
       console.error('Erro ao salvar rascunho:', error);
       const errorMessage = error instanceof Error ? error.message : 'Erro ao salvar rascunho';
       toast.error(errorMessage);
     } finally {
       setSaving(false);
     }
   };
 
   const finalizarExecucao = async () => {
     // Validar respostas (todas obrigatórias)
     if (formulario) {
       const totalPerguntas = formulario.perguntas.length;
       const totalRespondidas = execucaoData.respostas.filter(r => r.valor !== '').length;
 
       if (totalRespondidas !== totalPerguntas) {
         toast.error('Todas as perguntas devem ser respondidas!');
         return;
       }
     }
 
     // Verificar se existem perguntas "Não Conforme" sem planos de ação
     const perguntasNaoConforme = execucaoData.respostas.filter(r => r.valor === 'nao_conforme');
     if (perguntasNaoConforme.length > 0) {
       const token = localStorage.getItem('auth_token');
       if (!token) return;
 
       if (isContinuandoExecucao && execucaoId) {
         try {
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
             toast.error('Existem perguntas "Não Conforme" sem planos de ação cadastrados. Por favor, crie pelo menos um plano de ação para cada não conformidade antes de finalizar.');
             return;
           }
         } catch (error) {
           console.error('Erro ao verificar planos de ação:', error);
           toast.error('Erro ao verificar planos de ação');
           return;
         }
       } else {
         toast.error('Existem perguntas "Não Conforme". Crie pelo menos um plano de ação para cada não conformidade antes de finalizar.');
         return;
       }
     }
 
     setSaving(true);
     try {
       const token = localStorage.getItem('auth_token');
       if (!token) return;
 
       let response;
       let execucaoFinalId = execucaoId;
       
       if (isContinuandoExecucao && execucaoId) {
         // Finalizar execução existente
         response = await fetch(`/api/inspecoes/execucoes/${execucaoId}`, {
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
       } else {
         // Criar nova execução finalizada
         response = await fetch('/api/inspecoes/execucoes', {
           method: 'POST',
           headers: {
             'Authorization': `Bearer ${token}`,
             'Content-Type': 'application/json',
           },
           body: JSON.stringify({
             formulario_id: params?.id,
             local_id: execucaoData.local_id,
             data_inicio: execucaoData.data_inicio,
             participantes: execucaoData.participantes,
             respostas: execucaoData.respostas.map(r => ({
               pergunta_id: r.pergunta_id,
               resposta: r.valor,
               observacoes: r.observacao || null
             })),
             status: 'concluida'
           }),
         });
         
         if (response.ok) {
           const data = await response.json();
           execucaoFinalId = data.data.id;
         }
       }
 
       if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.error || 'Erro ao finalizar execução');
       }
 
       toast.success('Execução finalizada com sucesso!');
       router.push(`/inspecoes/execucoes/${execucaoFinalId}`);
     } catch (error: unknown) {
       console.error('Erro ao finalizar execução:', error);
       const errorMessage = error instanceof Error ? error.message : 'Erro ao finalizar execução';
       toast.error(errorMessage);
     } finally {
       setSaving(false);
     }
   };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600">Carregando formulário...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!formulario) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Formulário não encontrado</h1>
            <Button onClick={() => router.push('/inspecoes')} className="mt-4">
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const getEtapaIcon = (etapa: Etapa) => {
    switch (etapa) {
      case 'local':
        return <MapPin className="w-5 h-5" />;
      case 'participantes':
        return <Users className="w-5 h-5" />;
      case 'perguntas':
        return <FileText className="w-5 h-5" />;
      case 'finalizacao':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getEtapaNome = (etapa: Etapa) => {
    switch (etapa) {
      case 'local':
        return 'Local';
      case 'participantes':
        return 'Participantes';
      case 'perguntas':
        return 'Perguntas';
      case 'finalizacao':
        return 'Finalização';
      default:
        return '';
    }
  };

  const etapas: Etapa[] = ['local', 'participantes', 'perguntas', 'finalizacao'];
  const etapaIndex = etapas.indexOf(etapaAtual);

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/inspecoes')}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{formulario.titulo}</h1>
            <div className="flex items-center space-x-2 mt-1">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: formulario.categoria.cor }}
              />
              <span className="text-gray-600">{formulario.categoria.nome}</span>
            </div>
          </div>
        </div>

        {/* Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              {etapas.map((etapa, index) => (
                <div key={etapa} className="flex items-center">
                  <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                    index <= etapaIndex 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {getEtapaIcon(etapa)}
                    <span className="font-medium">{getEtapaNome(etapa)}</span>
                  </div>
                  {index < etapas.length - 1 && (
                    <div className={`w-8 h-0.5 mx-2 ${
                      index < etapaIndex ? 'bg-blue-500' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo da Etapa */}
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

              {/* Participantes Selecionados */}
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

              {/* Lista de Usuários */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Usuários Disponíveis:</h4>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {usuarios
                    .filter(usuario => !execucaoData.participantes.includes(usuario.matricula))
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

        {etapaAtual === 'perguntas' && (
          <div className="space-y-6">
            {/* Navegação das Perguntas */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Pergunta {perguntaAtual + 1} de {formulario.perguntas.length}
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
                      disabled={perguntaAtual === formulario.perguntas.length - 1}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((perguntaAtual + 1) / formulario.perguntas.length) * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Pergunta Atual */}
            {formulario.perguntas[perguntaAtual] && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>
                      {formulario.perguntas[perguntaAtual].pergunta}
                      {formulario.perguntas[perguntaAtual].obrigatoria && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Opções de Resposta */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { valor: 'conforme', label: 'Conforme', icon: CheckCircle, color: 'green', permitido: formulario.perguntas[perguntaAtual].permite_conforme },
                      { valor: 'nao_conforme', label: 'Não Conforme', icon: XCircle, color: 'red', permitido: formulario.perguntas[perguntaAtual].permite_nao_conforme },
                      { valor: 'nao_aplica', label: 'Não se Aplica', icon: MinusCircle, color: 'gray', permitido: formulario.perguntas[perguntaAtual].permite_nao_aplica }
                    ].filter(opcao => opcao.permitido).map(({ valor, label, icon: Icon, color }) => {
                      const resposta = execucaoData.respostas.find(r => 
                        r.pergunta_id === formulario.perguntas[perguntaAtual].id
                      );
                      const isSelected = resposta?.valor === valor;

                      return (
                        <button
                          key={valor}
                          onClick={() => atualizarResposta(
                            formulario.perguntas[perguntaAtual].id, 
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
                    })}
                  </div>

                  {/* Botão Criar Plano de Ação - aparece quando marcar Não Conforme */}
                  {execucaoData.respostas.find(r => 
                    r.pergunta_id === formulario.perguntas[perguntaAtual].id
                  )?.valor === 'nao_conforme' && (
                    <div className="space-y-4">
                      {isContinuandoExecucao && execucaoId ? (
                        <>
                          {/* Mostrar planos existentes para esta pergunta */}
                          {obterPlanosPorPergunta(formulario.perguntas[perguntaAtual].id).length > 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <h4 className="font-medium text-blue-800 mb-2">Planos de Ação Criados</h4>
                              <div className="space-y-2">
                                {obterPlanosPorPergunta(formulario.perguntas[perguntaAtual].id).map((plano, index) => (
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
                              {obterPlanosPorPergunta(formulario.perguntas[perguntaAtual].id).length > 0 && 
                                ` Você já criou ${obterPlanosPorPergunta(formulario.perguntas[perguntaAtual].id).length} plano(s) para esta não conformidade.`}
                            </p>
                            <Button
                              onClick={() => abrirPlanoModalParaPergunta(formulario.perguntas[perguntaAtual].id)}
                              variant="outline"
                              className="border-red-300 text-red-700 hover:bg-red-100"
                              size="sm"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              {obterPlanosPorPergunta(formulario.perguntas[perguntaAtual].id).length > 0 ? 'Criar Outro Plano' : 'Criar Plano de Ação'}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="bg-blue-50 border border-blue-200 rounded p-4">
                          <div className="text-sm text-blue-800">
                            Salve o rascunho para habilitar o cadastro de planos de ação.
                          </div>
                          <Button onClick={salvarRascunho} className="mt-2">
                            <Save className="w-4 h-4 mr-2" />
                            Salvar rascunho
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Observação */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Observação (opcional)
                    </label>
                    <textarea
                      value={execucaoData.respostas.find(r => 
                        r.pergunta_id === formulario.perguntas[perguntaAtual].id
                      )?.observacao || ''}
                      onChange={(e) => atualizarResposta(
                        formulario.perguntas[perguntaAtual].id,
                        'observacao',
                        e.target.value
                      )}
                      placeholder="Adicione uma observação sobre esta pergunta..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}



        {etapaAtual === 'finalizacao' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span>Finalizar Execução</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 text-blue-800 mb-2">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Resumo da Execução</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div><strong>Local:</strong> {locais.find(l => l.id === execucaoData.local_id)?.local}</div>
                  <div><strong>Participantes:</strong> {execucaoData.participantes.length}</div>
                  <div><strong>Perguntas respondidas:</strong> {execucaoData.respostas.length}</div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <p>
                  Ao finalizar, a execução será marcada como concluída e uma nota de conformidade 
                  será calculada automaticamente com base nas respostas fornecidas.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modal para criação/edição de Plano de Ação */}
        {isContinuandoExecucao && execucaoId && (
          <PlanoAcaoModal
            isOpen={planoModalOpen}
            onClose={() => setPlanoModalOpen(false)}
            onSuccess={() => { setPlanoModalOpen(false); buscarPlanosExistentes(); }}
            execucaoId={execucaoId}
            perguntaId={perguntaIdCriandoPlano}
            usuarios={usuariosPlanoAcao}
          />
        )}

        {/* Ações */}
        <div className="flex justify-between">
          <div>
            {etapaAtual !== 'local' && (
              <Button variant="outline" onClick={etapaAnterior}>
                <ArrowLeft className="w-4 h-4 mr-2" />
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
                  <Save className="w-4 h-4 mr-2" />
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
                  <Play className="w-4 h-4 mr-2" />
                )}
                Finalizar Execução
              </Button>
            ) : (
              <Button 
                onClick={proximaEtapa} 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={
                  (etapaAtual === 'perguntas' && !todasPerguntasRespondidas())
                }>
                <>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Avançar
                </>
              </Button>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default ExecutarFormularioPage;