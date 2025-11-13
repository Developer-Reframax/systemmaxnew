// Tipos para o módulo de Interações
export interface InteracaoTipo {
  id: string
  tipo: string
  contrato_id: string
  created_at: string
  updated_at: string
}

export interface InteracaoUnidade {
  id: string
  unidade: string
  contrato_id: string
  created_at: string
  updated_at: string
}

export interface InteracaoArea {
  id: string
  area: string
  contrato_id: string
  created_at: string
  updated_at: string
}

export interface InteracaoClassificacao {
  id: string
  classificacao: string
  contrato_id: string
  created_at: string
  updated_at: string
}

export interface InteracaoViolacao {
  id: string
  violacao: string
  contrato_id: string
  created_at: string
  updated_at: string
}

export interface InteracaoGrandeRisco {
  id: string
  grandes_riscos: string
  contrato_id: string
  created_at: string
  updated_at: string
}

export interface InteracaoLocalInstalacao {
  id: string
  local_instalacao: string
  contrato_id: string
  created_at: string
  updated_at: string
}

export interface Interacao {
  id: string
  tipo_id: string
  metodo_coach: 'Sim' | 'Não'
  data: string
  unidade_id: string
  empresa: string
  area_id: string
  local_id: number
  houve_desvios: 'Sim' | 'Não'
  descricao: string
  acao?: string
  evento: 'ROTINA' | 'PARADA'
  violacao_id?: string
  instante: 'N/A' | 'HORA SEGURA' | 'INSPEÇÃO DE SEGURANÇA'
  grande_risco_id?: string
  matricula_colaborador: number
  matricula_coordenador?: number
  classificacao_id: string
  local_interacao_id: string
  matricula_supervisor?: number
  created_at: string
  updated_at: string
}

// Tipos expandidos com relacionamentos
export interface InteracaoCompleta extends Interacao {
  tipo?: InteracaoTipo
  unidade?: InteracaoUnidade
  area?: InteracaoArea
  classificacao?: InteracaoClassificacao
  violacao?: InteracaoViolacao
  grande_risco?: InteracaoGrandeRisco
  local_interacao?: InteracaoLocalInstalacao
  colaborador?: {
    matricula: number
    nome: string
    email: string
    funcao: string
  }
  coordenador?: {
    matricula: number
    nome: string
    email: string
    funcao: string
  }
  supervisor?: {
    matricula: number
    nome: string
    email: string
    funcao: string
  }
  local?: {
    id: number
    local: string
    contrato: string
  }
}

// Tipos para formulários
export interface NovaInteracaoForm {
  tipo_id: string
  metodo_coach: 'Sim' | 'Não'
  data: string
  unidade_id: string
  empresa: string
  area_id: string
  local_id: number
  houve_desvios: 'Sim' | 'Não'
  descricao: string
  acao?: string
  evento: 'ROTINA' | 'PARADA'
  violacao_id?: string
  instante: 'N/A' | 'HORA SEGURA' | 'INSPEÇÃO DE SEGURANÇA'
  grande_risco_id?: string
  matricula_colaborador: number
  matricula_coordenador?: number
  classificacao_id: string
  local_interacao_id: string
  matricula_supervisor?: number
}

// Tipos para estatísticas
export interface InteracaoStats {
  total_interacoes: number
  interacoes_mes_atual: number
  interacoes_mes_anterior: number
  percentual_crescimento: number
  interacoes_por_tipo: Array<{
    tipo: string
    quantidade: number
    percentual: number
  }>
  interacoes_por_classificacao: Array<{
    classificacao: string
    quantidade: number
    percentual: number
  }>
  interacoes_por_mes: Array<{
    mes: string
    quantidade: number
  }>
  top_colaboradores: Array<{
    nome: string
    matricula: number
    quantidade: number
  }>
  desvios_encontrados: {
    total: number
    percentual: number
  }
  metodo_coach: {
    sim: number
    nao: number
    percentual_sim: number
  }
}

// Tipos para filtros
export interface InteracaoFiltros {
  data_inicio?: string
  data_fim?: string
  tipo_id?: string
  unidade_id?: string
  area_id?: string
  classificacao_id?: string
  matricula_colaborador?: number
  houve_desvios?: 'Sim' | 'Não'
  evento?: 'ROTINA' | 'PARADA'
  metodo_coach?: 'Sim' | 'Não'
  page?: number
  limit?: number
}

// Tipos para configurações
export interface ConfiguracaoItem {
  id: string
  nome: string
  contrato_id: string
  created_at: string
  updated_at: string
}

export interface NovaConfiguracaoForm {
  nome: string
  contrato_id: string
}

// Tipos para relatórios
export interface RelatorioInteracoes {
  periodo: {
    inicio: string
    fim: string
  }
  total_interacoes: number
  resumo_por_tipo: Array<{
    tipo: string
    quantidade: number
    percentual: number
  }>
  resumo_por_unidade: Array<{
    unidade: string
    quantidade: number
    percentual: number
  }>
  resumo_por_area: Array<{
    area: string
    quantidade: number
    percentual: number
  }>
  resumo_por_classificacao: Array<{
    classificacao: string
    quantidade: number
    percentual: number
  }>
  desvios: {
    total_com_desvios: number
    total_sem_desvios: number
    percentual_desvios: number
  }
  metodo_coach: {
    utilizou: number
    nao_utilizou: number
    percentual_utilizacao: number
  }
  colaboradores_mais_ativos: Array<{
    nome: string
    matricula: number
    quantidade: number
  }>
  evolucao_mensal: Array<{
    mes: string
    quantidade: number
  }>
}

// Tipos para dropdowns
export interface DropdownOption {
  value: string | number
  label: string
}

export interface InteracaoDropdowns {
  tipos: DropdownOption[]
  unidades: DropdownOption[]
  areas: DropdownOption[]
  classificacoes: DropdownOption[]
  violacoes: DropdownOption[]
  grandes_riscos: DropdownOption[]
  locais_instalacao: DropdownOption[]
  locais: DropdownOption[]
  colaboradores: DropdownOption[]
}

// Constantes para validação
export const METODO_COACH_OPTIONS = ['Sim', 'Não'] as const
export const HOUVE_DESVIOS_OPTIONS = ['Sim', 'Não'] as const
export const EVENTO_OPTIONS = ['ROTINA', 'PARADA'] as const
export const INSTANTE_OPTIONS = ['N/A', 'HORA SEGURA', 'INSPEÇÃO DE SEGURANÇA'] as const
