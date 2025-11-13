'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MainLayout from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  User,
  MessageSquare,
  Download,
  Edit
} from 'lucide-react';
import { toast } from 'sonner';
import PlanosAcaoList from '@/components/inspecoes/PlanosAcaoList';

interface ExecucaoDetalhes {
  id: string;
  formulario: {
    id: string;
    titulo: string;
    categoria: {
      nome: string;
    };
    perguntas?: Array<{
      id: string;
      pergunta: string;
      ordem: number;
      resposta_atual?: {
        resposta: string;
        observacoes?: string;
      } | null;
    }>;
  };
  local: {
    id: string;
    local: string;
  };
  executor: {
    matricula: string;
    nome: string;
    email: string;
  };
  status: 'em_andamento' | 'concluida' | 'cancelada';
  nota_conformidade: number | null;
  data_inicio: string;
  data_conclusao: string | null;
  participantes: Array<{
    matricula_participante: string;
    participante: {
      matricula: string;
      nome: string;
      email: string;
    };
  }>;
  respostas: Array<{
    pergunta_id: string;
    resposta: 'conforme' | 'nao_conforme' | 'nao_aplica';
    observacoes: string | null;
    pergunta: {
      id: string;
      pergunta: string;
      ordem: number;
    };
  }>;
}

function DetalhesExecucaoPage() {
  const router = useRouter();
  const params = useParams();
  const [execucao, setExecucao] = useState<ExecucaoDetalhes | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchExecucao = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token || !params?.id) {
        console.log('Token ou ID não encontrado:', { token: !!token, id: params?.id });
        return;
      }

      console.log('Buscando execução:', params.id);
      const response = await fetch(`/api/inspecoes/execucoes/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Resposta da API:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        let errorMessage = 'Erro ao carregar execução';
        
        try {
          const errorData = await response.json();
          console.error('Erro da API:', errorData);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('Erro ao fazer parse da resposta de erro:', parseError);
        }

        if (response.status === 404) {
          toast.error('Execução não encontrada');
          router.push('/inspecoes/execucoes');
          return;
        } else if (response.status === 401) {
          toast.error('Acesso não autorizado');
          router.push('/login');
          return;
        } else if (response.status === 403) {
          toast.error('Acesso negado a esta execução');
          router.push('/inspecoes/execucoes');
          return;
        }
        
        toast.error(errorMessage);
        router.push('/inspecoes/execucoes');
        return;
      }

      const data = await response.json();
      console.log('Dados recebidos da API:', data);
      
      if (!data.success || !data.data) {
        console.error('Estrutura de resposta inválida:', data);
        toast.error('Dados da execução inválidos');
        router.push('/inspecoes/execucoes');
        return;
      }

      setExecucao(data.data);
    } catch (error) {
      console.error('Erro ao carregar execução:', error);
      toast.error('Erro de conexão ao carregar execução');
      router.push('/inspecoes/execucoes');
    } finally {
      setLoading(false);
    }
  }, [params?.id, router]);

  useEffect(() => {
    fetchExecucao();
  }, [fetchExecucao]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'concluida':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'em_andamento':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'cancelada':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'concluida':
        return 'Concluída';
      case 'em_andamento':
        return 'Em Andamento';
      case 'cancelada':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concluida':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'em_andamento':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelada':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRespostaIcon = (valor: string) => {
    switch (valor) {
      case 'conforme':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'nao_conforme':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'nao_aplica':
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const getRespostaLabel = (valor: string) => {
    switch (valor) {
      case 'conforme':
        return 'Conforme';
      case 'nao_conforme':
        return 'Não Conforme';
      case 'nao_aplica':
        return 'Não se Aplica';
      default:
        return valor;
    }
  };

  const getRespostaColor = (valor: string) => {
    switch (valor) {
      case 'conforme':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'nao_conforme':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'nao_aplica':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConformidadeColor = (nota: number) => {
    if (nota >= 90) return 'text-green-600';
    if (nota >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const canEdit = () => {
    return execucao?.status === 'em_andamento';
  };

  const handleExportPDF = () => {
    // Implementar exportação para PDF
    toast.info('Funcionalidade de exportação será implementada em breve');
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!execucao) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Execução não encontrada</h1>
            <Button onClick={() => router.push('/inspecoes/execucoes')} className="mt-4">
              Voltar ao Histórico
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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/inspecoes/execucoes')}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{execucao.formulario.titulo}</h1>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-gray-600">{execucao.formulario.categoria.nome}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={handleExportPDF}>
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
            {canEdit() && (
              <Button
                onClick={() => router.push(`/inspecoes/execucoes/continuar/${execucao.id}`)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                Continuar Edição
              </Button>
            )}
          </div>
        </div>

        {/* Status e Informações Gerais */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {getStatusIcon(execucao.status)}
                <span>Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(execucao.status)}`}>
                {getStatusLabel(execucao.status)}
              </div>
              {execucao.nota_conformidade != null && typeof execucao.nota_conformidade === 'number' && (
                <div className="mt-4">
                  <div className="text-sm text-gray-600 mb-1">Nota de Conformidade</div>
                  <div className={`text-2xl font-bold ${getConformidadeColor(execucao.nota_conformidade)}`}>
                    {execucao.nota_conformidade.toFixed(1)}%
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Datas</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <div className="text-sm text-gray-600">Início</div>
                <div className="font-medium">{formatDate(execucao.data_inicio)}</div>
              </div>
              {execucao.data_conclusao && (
                <div>
                  <div className="text-sm text-gray-600">Conclusão</div>
                  <div className="font-medium">{formatDate(execucao.data_conclusao)}</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Local</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-medium">{execucao.local.local}</div>
            </CardContent>
          </Card>
        </div>

        {/* Executor e Participantes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Executor</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium">{execucao.executor.nome}</div>
                  <div className="text-sm text-gray-600">{execucao.executor.email}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Participantes ({execucao.participantes.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {execucao.participantes.map((participante, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{participante.participante.nome}</div>
                      <div className="text-xs text-gray-600">{participante.participante.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Respostas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Respostas ({execucao.respostas.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {execucao.respostas
                .sort((a, b) => a.pergunta.ordem - b.pergunta.ordem)
                .map((resposta) => (
                  <div key={resposta.pergunta.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            Pergunta {resposta.pergunta.ordem}
                          </span>
                        </div>
                        <h4 className="font-medium text-gray-900 mb-3">
                          {resposta.pergunta.pergunta}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getRespostaColor(resposta.resposta)}`}>
                        {getRespostaIcon(resposta.resposta)}
                        <span className="ml-2">{getRespostaLabel(resposta.resposta)}</span>
                      </div>
                    </div>

                    {resposta.observacoes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <MessageSquare className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-700">Observação</span>
                        </div>
                        <p className="text-sm text-gray-600">{resposta.observacoes}</p>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Planos de Ação */}
        <PlanosAcaoList
          execucaoId={execucao.id}
          usuarios={[execucao.executor, ...execucao.participantes.map(p => p.participante)].map(user => ({
            ...user,
            matricula: parseInt(user.matricula)
          }))}
          canEdit={canEdit()}
          execucaoStatus={execucao.status}
        />

      </div>
    </MainLayout>
  );
}

export default DetalhesExecucaoPage;