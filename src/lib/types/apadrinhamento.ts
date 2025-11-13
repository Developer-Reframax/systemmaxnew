// Tipos TypeScript para o módulo de Apadrinhamento

export interface Usuario {
  matricula: string
  nome: string
  email?: string
  cargo?: string
  funcao?: string
}

export interface Apadrinhamento {
  id: string
  matricula_novato: string
  matricula_padrinho: string
  matricula_supervisor: string
  tipo_apadrinhamento: TipoApadrinhamento
  data_inicio: string
  data_fim: string
  status: StatusApadrinhamento
  finalizado: boolean
  observacoes?: string
  created_at: string
  updated_at: string
  // Relacionamentos
  novato?: Usuario
  padrinho?: Usuario
  supervisor_info?: Usuario
}

export type TipoApadrinhamento = 
  | 'Novo colaborador'
  | 'Novo operador de ponte'
  | 'Novo operador de empilhadeira'

export type StatusApadrinhamento = 
  | 'Ativo'
  | 'Concluído'
  | 'Vencido'

export interface ApadrinhamentoFormData {
  matricula_novato: string
  matricula_padrinho: string
  matricula_supervisor: string
  tipo_apadrinhamento: TipoApadrinhamento
  data_inicio: string
  observacoes?: string
}

export interface ApadrinhamentoUpdateData {
  matricula_padrinho?: string
  matricula_supervisor?: string
  tipo_apadrinhamento?: TipoApadrinhamento
  data_inicio?: string
  observacoes?: string
}

export interface ApadrinhamentoStats {
  total_ativos: number
  total_concluidos: number
  total_vencidos: number
  proximos_vencimento: number
  por_tipo: {
    'Novo colaborador': number
    'Novo operador de ponte': number
    'Novo operador de empilhadeira': number
  }
}

export interface ApadrinhamentoListResponse {
  data: Apadrinhamento[]
  total: number
  page: number
  totalPages: number
  limit: number
}

export interface ApadrinhamentoFilters {
  status?: StatusApadrinhamento
  tipo?: TipoApadrinhamento
  supervisor?: string
  search?: string
  page?: number
  limit?: number
}

export interface FinalizarApadrinhamentoData {
  observacoes_finalizacao?: string
}

// Constantes para uso nos componentes
export const TIPOS_APADRINHAMENTO: TipoApadrinhamento[] = [
  'Novo colaborador',
  'Novo operador de ponte',
  'Novo operador de empilhadeira'
]

export const STATUS_APADRINHAMENTO: StatusApadrinhamento[] = [
  'Ativo',
  'Concluído',
  'Vencido'
]

// Cores para status (para uso com Tailwind)
export const STATUS_COLORS = {
  'Ativo': 'bg-blue-100 text-blue-800',
  'Concluído': 'bg-green-100 text-green-800',
  'Vencido': 'bg-red-100 text-red-800'
} as const

// Ícones para tipos (para uso com Lucide)
export const TIPO_ICONS = {
  'Novo colaborador': 'Users',
  'Novo operador de ponte': 'Building2',
  'Novo operador de empilhadeira': 'Car'
} as const
