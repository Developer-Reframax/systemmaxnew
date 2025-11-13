// Tipos para Plano de Ação e Evidências

export type PlanoAcaoPrioridade = 'baixa' | 'media' | 'alta' | 'urgente';
export type PlanoAcaoStatus = 'pendente' | 'em_andamento' | 'concluido' | 'cancelado';

// Modelo atualizado conforme estrutura do banco de dados
export interface PlanoAcao {
  id: string;
  execucao_inspecao_id: string;
  pergunta_id: string; // NOVO: Vincula o plano à pergunta específica
  desvio: string;
  o_que_fazer: string;
  como_fazer: string;
  responsavel_matricula: number;
  prazo: string; // ISO date string
  status: PlanoAcaoStatus;
  prioridade: PlanoAcaoPrioridade;
  cadastrado_por_matricula: number;
  created_at: string;
  updated_at: string;
}

export interface PlanoAcaoWithRelations extends PlanoAcao {
  responsavel_info?: {
    matricula: number;
    nome: string;
    email: string;
  };
  evidencias?: EvidenciaPlanoAcao[];
  pergunta?: string; // NOVO: Adiciona a pergunta relacionada
}

export interface EvidenciaPlanoAcao {
  id: string;
  plano_acao_id: string;
  nome_arquivo: string;
  caminho_arquivo: string;
  tamanho_bytes: number;
  tipo_mime: string;
  bucket: string;
  tipo_evidencia: 'nao_conformidade' | 'conclusao';
  created_at: string;
  url_storage?: string;
}

export interface CreatePlanoAcaoData {
  execucao_inspecao_id: string;
  pergunta_id: string; // NOVO: Obrigatório
  desvio: string;
  o_que_fazer: string;
  como_fazer: string;
  responsavel_matricula: number;
  prazo: string; // ISO date string
  prioridade: PlanoAcaoPrioridade;
  // NOVO: matrícula do usuário que cadastrou o plano
  cadastrado_por_matricula: number;
  status: string;
}

export interface UpdatePlanoAcaoData {
  desvio?: string;
  o_que_fazer?: string;
  como_fazer?: string;
  responsavel_matricula?: number;
  prazo?: string; // ISO date string
  status?: PlanoAcaoStatus;
  data_conclusao?: string; // NOVO: usado ao concluir
  prioridade?: PlanoAcaoPrioridade;
}

export interface CreateEvidenciaData {
  plano_acao_id: string;
  arquivo: File;
  tipo_evidencia?: 'nao_conformidade' | 'conclusao';
}

// Tipos para respostas da API
export interface PlanoAcaoResponse {
  success: boolean;
  data?: PlanoAcao | PlanoAcao[] | PlanoAcaoWithRelations | PlanoAcaoWithRelations[];
  error?: string;
}

export interface EvidenciaResponse {
  success: boolean;
  data?: EvidenciaPlanoAcao | EvidenciaPlanoAcao[];
  error?: string;
}

// Tipos para filtros e queries
export interface PlanoAcaoFilters {
  execucao_inspecao_id?: string;
  pergunta_id?: string; // NOVO: Filtrar por pergunta específica
  responsavel_matricula?: number;
  status?: PlanoAcaoStatus;
  prioridade?: PlanoAcaoPrioridade;
  vencidos?: boolean; // apenas planos com prazo vencido
}

// Tipos para resumo de planos por pergunta
export interface PlanoAcaoResumoPergunta {
  pergunta_id: string;
  quantidade: number;
}

export interface PlanoAcaoResumoResponse {
  success: boolean;
  resumo: Record<string, number>; // { pergunta_id: quantidade }
}

// Tipos para validação
export interface PlanoAcaoValidationErrors {
  execucao_inspecao_id?: string;
  pergunta_id?: string;
  desvio?: string;
  o_que_fazer?: string;
  como_fazer?: string;
  responsavel_matricula?: string;
  prazo?: string;
}