export type ReadinessBlockType = 'ATENCAO_SUSTENTADA' | 'STROOP'

export type ReadinessRiskLevel = 'APTO' | 'ALERTA' | 'ALTO_RISCO'

export type ReadinessErrorType = 'OMISSAO' | 'COMISSAO' | 'CONFLITO' | 'NENHUM'

export interface ReadinessEventInput {
  session_id: string
  block_type: ReadinessBlockType
  timestamp: string
  stimulus_type: string
  stimulus_value: string
  stimulus_color: string
  expected_response: string
  user_response: string
  reaction_time_ms: number | null
  is_correct: boolean
  error_type: ReadinessErrorType
}

export interface ReadinessEvent extends ReadinessEventInput {
  id: string
  created_at: string
}

export interface ReadinessSession {
  id: string
  matricula: string
  started_at: string
  ended_at: string | null
  total_duration_ms: number | null
  reaction_time_avg: number | null
  omission_rate: number | null
  commission_rate: number | null
  stroop_error_rate: number | null
  fatigue_index: number | null
  readiness_score: number | null
  risk_level: ReadinessRiskLevel | null
  created_at: string
  updated_at: string
}

export interface ReadinessDeviation {
  id: string
  session_id: string | null
  matricula: string
  risk_level: ReadinessRiskLevel
  description: string
  status: 'ABERTO' | 'EM_TRATATIVA' | 'CONCLUIDO'
  immediate_action: string | null
  root_cause: string | null
  action_plan: string | null
  responsible_matricula: string | null
  due_date: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface ReadinessMetrics {
  reaction_time_avg: number
  omission_rate: number
  commission_rate: number
  stroop_error_rate: number
  fatigue_index: number
  readiness_score: number
  risk_level: ReadinessRiskLevel
  total_duration_ms: number
}

export interface ReadinessDashboardData {
  total_sessions: number
  distribution: {
    apto: number
    alerta: number
    alto_risco: number
  }
  open_deviations: number
  latest_sessions: Array<
    Pick<
      ReadinessSession,
      'id' | 'matricula' | 'started_at' | 'readiness_score' | 'risk_level' | 'omission_rate' | 'commission_rate' | 'fatigue_index'
    >
  >
  score_history: Array<{ started_at: string; readiness_score: number | null; risk_level: ReadinessRiskLevel | null }>
}
