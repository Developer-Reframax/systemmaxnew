export interface Emociograma {
  id: string
  matricula_usuario: number
  estado_emocional: 'bem' | 'regular' | 'pessimo'
  observacoes?: string
  data_registro: string
  requer_tratativa: boolean
  created_at: string
  updated_at: string
  usuario?: {
    nome: string
    email: string
  }
}

export interface TratativaEmociograma {
  id: string
  emociograma_id: string
  matricula_tratador: number
  queixa: string
  tratativa_realizada: string
  status: 'pendente' | 'concluida'
  data_tratativa: string
  created_at: string
  updated_at: string
  tratador?: {
    nome: string
    email: string
  }
  emociograma?: Emociograma
}

export interface EmociogramaStats {
  total_registros: number
  bem: number
  regular: number
  pessimo: number
  pendentes_tratativa: number
  tratativas_realizadas: number
  periodo: string
}

export interface RegistroEmociogramaRequest {
  estado_emocional: 'bem' | 'regular' | 'pessimo'
  observacoes?: string
}

export interface CriarTratavivaRequest {
  emociograma_id: string
  queixa: string
  tratativa_realizada: string
}

export interface EmociogramaFilters {
  periodo?: '7d' | '30d' | '90d'
  meus?: boolean
  equipe?: boolean
  status?: 'pendente' | 'concluida'
  page?: number
  limit?: number
}

export interface EmociogramaResponse {
  success: boolean
  message: string
  data?: Emociograma | Emociograma[] | EmociogramaStats
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface TratavivaResponse {
  success: boolean
  message: string
  data?: TratativaEmociograma | TratativaEmociograma[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export const ESTADOS_EMOCIONAL = {
  bem: {
    label: 'Estou bem',
    emoji: '😊',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    hoverColor: 'hover:bg-green-100'
  },
  regular: {
    label: 'Não me sinto muito bem',
    emoji: '😐',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    hoverColor: 'hover:bg-yellow-100'
  },
  pessimo: {
    label: 'Estou péssimo',
    emoji: '😞',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    hoverColor: 'hover:bg-red-100'
  }
} as const

export type EstadoEmocional = keyof typeof ESTADOS_EMOCIONAL
