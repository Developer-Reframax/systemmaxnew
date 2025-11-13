// Interfaces para geração de PDF das OACs

export interface PDFConfig {
  includeHeader: boolean
  includeFooter: boolean
  pageFormat: 'A4' | 'Letter'
  orientation: 'portrait' | 'landscape'
}

export interface PDFGenerationService {
  generateOACPDF(oac: OAC, config?: PDFConfig): Promise<void>
  formatDateTime(dateString: string): string
  formatDuration(minutes: number): string
}

// Interface principal da OAC (já existente no sistema, replicada para referência)
export interface OAC {
  id: string
  observador: string
  equipe: string
  local: string
  datahora_inicio: string
  tempo_observacao: number
  qtd_pessoas_local: number
  qtd_pessoas_abordadas: number
  contrato: string
  created_at: string
  desvios_count?: number
  plano_acao?: Array<{
    id: string
    acao_recomendada?: string
    reconhecimento?: string
    condicao_abaixo_padrao?: string
    compromisso_formado?: string
  }>
  desvios?: Array<{
    id: string
    item_desvio: string
    quantidade_desvios: number
    descricao_desvio: string
    subcategoria?: {
      subcategoria: string
      categoria: {
        categoria: string
      }
    }
  }>
  local_info?: {
    id: number
    local: string
  }
  equipe_info?: {
    id: string
    equipe: string
  }
}

export interface PDFSection {
  title: string
  content: string | Array<{ label: string; value: string }>
}

export interface PDFGenerationOptions {
  filename?: string
  showProgress?: boolean
  includeTimestamp?: boolean
}
