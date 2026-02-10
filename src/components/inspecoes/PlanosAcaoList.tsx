'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  CheckCircle,
  Calendar,
  FileText,
  Upload,
  Trash2,
  Edit,
  Plus,
  Download,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { PlanoAcaoWithRelations, PlanoAcaoFilters } from '@/types/plano-acao';
import PlanoAcaoModal from './PlanoAcaoModal';

interface PlanosAcaoListProps {
  execucaoId: string;
  usuarios: Array<{
    matricula: number;
    nome: string;
    email: string;
  }>;
  canEdit: boolean;
  execucaoStatus: string;
}

export default function PlanosAcaoList({
  execucaoId,
  usuarios,
  canEdit,
  execucaoStatus
}: PlanosAcaoListProps) {
  const [planos, setPlanos] = useState<PlanoAcaoWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [planoSelecionado, setPlanoSelecionado] = useState<PlanoAcaoWithRelations | undefined>();
  const [filters] = useState<PlanoAcaoFilters>({});
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPlanos = useCallback(async () => {
    try {

      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.prioridade) params.append('prioridade', filters.prioridade);
      if (filters.vencidos) params.append('vencidos', 'true');

      const response = await fetch(`/api/inspecoes/execucoes/${execucaoId}/planos-acao?${params}`, {
        method: 'GET'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar planos de ação');
      }

      const data = await response.json();
      setPlanos(data.data || []);
    } catch (error) {
      console.error('Erro ao buscar planos de ação:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao buscar planos de ação');
    } finally {
      setLoading(false);
    }
  }, [execucaoId, filters]);

  useEffect(() => {
    fetchPlanos();
  }, [fetchPlanos]);



  const handleEditPlano = (plano: PlanoAcaoWithRelations) => {
    setPlanoSelecionado(plano);
    setModalOpen(true);
  };

  const handleDeletePlano = async (planoId: string) => {
    if (!confirm('Tem certeza que deseja deletar este plano de ação?')) return;

    try {
      

      const response = await fetch(`/api/inspecoes/execucoes/${execucaoId}/planos-acao/${planoId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao deletar plano de ação');
      }

      toast.success('Plano de ação deletado com sucesso!');
      fetchPlanos();
    } catch (error) {
      console.error('Erro ao deletar plano de ação:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao deletar plano de ação');
    }
  };

  const isPrazoVencido = (prazo: string): boolean => {
    return new Date(prazo) < new Date();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const filteredPlanos = planos.filter(plano => {
    // Filtro por termo de busca
    const alvo = `${plano.desvio} ${plano.o_que_fazer}`.toLowerCase();
    if (searchTerm && !alvo.includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Helper: extrai texto da pergunta, suportando string ou objeto retornado pela API
  const getPerguntaTexto = (plano: PlanoAcaoWithRelations): string => {
    const p: unknown = (plano as unknown as { pergunta?: unknown }).pergunta;
    if (!p) return '';
    if (typeof p === 'string') return p;
    if (typeof p === 'object' && p !== null) {
      const inner = (p as { pergunta?: unknown }).pergunta;
      if (typeof inner === 'string') return inner;
    }
    return '';
  };

  return (
    <>
      <Card className="p-4 space-y-4">
        {/* Filtros */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Buscar por título ou descrição"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
            <Button variant="outline" onClick={fetchPlanos}>
              <Search className="w-4 h-4 mr-2" />
              Buscar
            </Button>
          </div>
          {canEdit && execucaoStatus === 'em_andamento' && (
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Plano
            </Button>
          )}
        </div>

        {/* Lista */}
        <div>
          {loading ? (
            <div className="text-center py-10">Carregando...</div>
          ) : (
            <div className="grid gap-4">
              {filteredPlanos.map((plano) => (
                <Card key={plano.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      {getPerguntaTexto(plano) && (
                        <div className="text-lg font-semibold">{getPerguntaTexto(plano)}</div>
                      )}
                      <div className="text-sm text-gray-600"> Desvio: {plano.desvio}</div>
                      <div className="text-sm text-gray-600"> O que fazer: {plano.o_que_fazer}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={`text-xs ${plano.status === 'concluido' ? 'bg-green-100 text-green-800' : plano.status === 'em_andamento' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{plano.status}</Badge>
                      <Badge className={`text-xs ${plano.prioridade === 'alta' ? 'bg-orange-100 text-orange-800' : plano.prioridade === 'urgente' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{plano.prioridade}</Badge>
                    </div>
                  </div>

                  {/* Ações */}
                  {canEdit && execucaoStatus === 'em_andamento' && (
                    <div className="mt-2 flex items-center space-x-2">
                      <Button size="sm" onClick={() => handleEditPlano(plano)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeletePlano(plano.id)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Deletar
                      </Button>
                    </div>
                  )}

                  {/* Metadados */}
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-gray-600">Prazo</div>
                        <div className={`font-medium ${isPrazoVencido(plano.prazo) && plano.status !== 'concluido' ? 'text-red-600' : ''}`}>
                          {formatDate(plano.prazo)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-gray-600">Criado em</div>
                        <div className="font-medium">{formatDate(plano.created_at)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Observações */}
                  {plano.como_fazer && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                        <FileText className="w-4 h-4" />
                        <span>Como fazer</span>
                      </div>
                      <p className="text-sm text-gray-700">{plano.como_fazer}</p>
                    </div>
                  )}

                  {/* Evidências */}
                  {plano.evidencias && plano.evidencias.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                        <Upload className="w-4 h-4" />
                        <span>Evidências</span>
                      </div>
                      <div className="grid gap-2">
                        {plano.evidencias.map((evidencia) => (
                          <div key={evidencia.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center space-x-2">
                              <FileText className="w-4 h-4" />
                              <span className="text-sm">{evidencia.nome_arquivo}</span>
                              
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => evidencia.url_storage && window.open(evidencia.url_storage, '_blank')}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Modal de Plano de Ação */}
      <PlanoAcaoModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchPlanos}
        execucaoId={execucaoId}
        plano={planoSelecionado}
        usuarios={usuarios}
      />
    </>
  );
}