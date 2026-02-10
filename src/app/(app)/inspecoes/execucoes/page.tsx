'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { 
  ArrowLeft,
  Search,
  Filter,
  Eye,
  Calendar,
  MapPin,
  Users,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface Execucao {
  id: string;
  formulario: {
    titulo: string;
    categoria: {
      nome: string;
      cor: string;
    };
  };
  local: {
    nome: string;
  };
  executor: {
    nome: string;
  };
  status: 'em_andamento' | 'concluida' | 'cancelada';
  nota_conformidade: number | null | undefined;
  data_inicio: string;
  data_conclusao: string | null;
  participantes_count: number;
  respostas_count: number;
}

interface Categoria {
  id: string;
  nome: string;
  cor: string;
}

interface Filtros {
  search: string;
  categoria_id: string;
  status: string;
  data_inicio: string;
  data_fim: string;
}

function ExecucoesPage() {
  const router = useRouter();
  useAuth();
  const [execucoes, setExecucoes] = useState<Execucao[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filtros, setFiltros] = useState<Filtros>({
    search: '',
    categoria_id: '',
    status: '',
    data_inicio: '',
    data_fim: ''
  });

  const fetchCategorias = useCallback(async () => {
    try {
      
      const response = await fetch('/api/inspecoes/categorias?limit=100&ativo=true', {
       method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        setCategorias(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  }, []);

  const fetchExecucoes = useCallback(async () => {
    try {
      

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...Object.fromEntries(
          Object.entries(filtros).filter(([, value]) => value !== '')
        )
      });

      const response = await fetch(`/api/inspecoes/execucoes?${params}`, {
       method: 'GET'
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar execuções');
      }

      const data = await response.json();
      setExecucoes(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalItems(data.pagination?.totalItems || 0);
    } catch (error) {
      console.error('Erro ao carregar execuções:', error);
      toast.error('Erro ao carregar execuções');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filtros]);

  useEffect(() => {
    fetchCategorias();
  }, [fetchCategorias]);

  useEffect(() => {
    fetchExecucoes();
  }, [fetchExecucoes]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchExecucoes();
  };

  const clearFilters = () => {
    setFiltros({
      search: '',
      categoria_id: '',
      status: '',
      data_inicio: '',
      data_fim: ''
    });
    setCurrentPage(1);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'concluida':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'em_andamento':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'cancelada':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
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
        return 'bg-green-100 text-green-800';
      case 'em_andamento':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelada':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getConformidadeColor = (nota: number | null) => {
    if (nota === null) return 'text-gray-500';
    if (nota >= 80) return 'text-green-600';
    if (nota >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
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
              <h1 className="text-3xl font-bold text-gray-900">Histórico de Execuções</h1>
              <p className="text-gray-600">
                {totalItems} execução{totalItems !== 1 ? 'ões' : ''} encontrada{totalItems !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
        </div>

        {/* Filtros */}
        {showFilters && (
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Buscar
                    </label>
                    <Input
                      placeholder="Formulário, local, executor..."
                      value={filtros.search}
                      onChange={(e) => setFiltros({ ...filtros, search: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoria
                    </label>
                    <select 
                      value={filtros.categoria_id} 
                      onChange={(e) => setFiltros({ ...filtros, categoria_id: e.target.value })}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="">Todas as categorias</option>
                      {categorias.map((categoria) => (
                        <option key={categoria.id} value={categoria.id}>
                          {categoria.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select 
                      value={filtros.status} 
                      onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="">Todos os status</option>
                      <option value="concluida">Concluída</option>
                      <option value="em_andamento">Em Andamento</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data Início
                    </label>
                    <Input
                      type="date"
                      value={filtros.data_inicio}
                      onChange={(e) => setFiltros({ ...filtros, data_inicio: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data Fim
                    </label>
                    <Input
                      type="date"
                      value={filtros.data_fim}
                      onChange={(e) => setFiltros({ ...filtros, data_fim: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <Button type="button" variant="outline" onClick={clearFilters}>
                    Limpar
                  </Button>
                  <Button type="submit">
                    <Search className="w-4 h-4 mr-2" />
                    Buscar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Lista de Execuções */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : execucoes.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhuma execução encontrada
                </h3>
                <p className="text-gray-600">
                  Não há execuções que correspondam aos filtros aplicados.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {execucoes.map((execucao) => (
                  <div key={execucao.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: execucao.formulario.categoria.cor }}
                          />
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {execucao.formulario.titulo}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(execucao.status)}`}>
                            {getStatusIcon(execucao.status)}
                            <span className="ml-1">{getStatusLabel(execucao.status)}</span>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4" />
                            <span>{execucao.local.nome}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4" />
                            <span>{execucao.participantes_count} participante{execucao.participantes_count !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(execucao.data_inicio)}</span>
                          </div>
                          {execucao.nota_conformidade !== null && execucao.nota_conformidade !== undefined && typeof execucao.nota_conformidade === 'number' && (
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4" />
                              <span className={`font-medium ${getConformidadeColor(execucao.nota_conformidade)}`}>
                                {execucao.nota_conformidade.toFixed(1)}% conformidade
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="mt-2 text-sm text-gray-500">
                          Executado por: <span className="font-medium">{execucao.executor.nome}</span>
                          {execucao.data_conclusao && (
                            <span className="ml-4">
                              Concluído em: {formatDate(execucao.data_conclusao)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/inspecoes/execucoes/${execucao.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Detalhes
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Página {currentPage} de {totalPages}
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>
  );
}

export default ExecucoesPage;