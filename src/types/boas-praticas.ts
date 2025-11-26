export type StatusBoaPratica =
  | 'Aguardando validacao'
  | 'Aguardando avaliacao do sesmt'
  | 'Aguardando avaliacao da gestao'
  | 'Aguardando votacao trimestral'
  | 'Aguardando votacao anual'
  | 'Concluído'

export interface BoaPratica {
  id: string
  titulo: string
  descricao?: string
  descricao_problema?: string
  objetivo?: string
  area_aplicada?: number
  data_implantacao?: string
  pilar?: number
  elimina_desperdicio?: number
  contrato?: string
  status: StatusBoaPratica
  relevancia?: number
  resultados?: string
  geral: boolean
  responsavel_etapa?: number
  categoria?: number
  fabricou_dispositivo: boolean
  projeto?: string
  matricula_cadastrante: number
  tags?: number[]
  created_at?: string
  updated_at?: string
}

export interface EvidenciaBoaPratica {
  id: string
  pratica_id: string
  url: string
  categoria: 'antes' | 'depois'
  descricao?: string
  is_video: boolean
  created_at?: string
}

export interface EnvolvidoBoaPratica {
  id?: number
  pratica_id: string
  matricula_envolvido: number
}

export interface BoaPraticaFiltro {
  search?: string
  status?: StatusBoaPratica
  categoria?: number
  pilar?: number
  area_aplicada?: number
  tag?: number
  page?: number
  limit?: number
}
