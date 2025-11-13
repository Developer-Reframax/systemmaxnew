import jsPDF from 'jspdf'
import { OAC, PDFConfig, PDFGenerationOptions } from '../types/pdf'

export class PDFService {
  private static readonly DEFAULT_CONFIG: PDFConfig = {
    includeHeader: true,
    includeFooter: true,
    pageFormat: 'A4',
    orientation: 'portrait'
  }

  private static readonly COLORS = {
    primary: '#2563eb',
    secondary: '#6b7280',
    text: '#374151',
    light: '#f3f4f6'
  }

  private static readonly FONTS = {
    title: 18,
    subtitle: 14,
    text: 12,
    small: 10
  }

  // Função auxiliar para garantir que valores sejam strings
  private static ensureString(value: unknown): string {
    if (value === null || value === undefined) {
      return 'N/A'
    }
    if (typeof value === 'string') {
      return value
    }
    if (typeof value === 'number') {
      return value.toString()
    }
    if (Array.isArray(value)) {
      return value.map(v => this.ensureString(v)).join(', ')
    }
    return String(value)
  }

  // Função auxiliar para doc.text() com logs
  private static safeDocText(doc: jsPDF, text: unknown, x: number, y: number, context: string = ''): void {
    try {
      const safeText = this.ensureString(text)
      console.log(`🔍 [${context}] Chamando doc.text com:`, { 
        originalValue: text, 
        originalType: typeof text, 
        convertedValue: safeText, 
        convertedType: typeof safeText,
        x, 
        y 
      })
      doc.text(safeText, x, y)
    } catch (error) {
      console.error(`❌ Erro em doc.text [${context}]:`, { 
        text, 
        textType: typeof text, 
        x, 
        y, 
        error 
      })
      throw error
    }
  }

  static async generateOACPDF(
    oac: OAC, 
    config: Partial<PDFConfig> = {},
    options: PDFGenerationOptions = {}
  ): Promise<void> {
    console.log('🔍 PDFService: Iniciando geração de PDF')
    console.log('📄 Dados da OAC recebidos:', oac)
    
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config }
    console.log('⚙️ Configuração final do PDF:', finalConfig)

    try {
      console.log('📋 Criando instância do jsPDF...')
      const doc = new jsPDF({
        orientation: finalConfig.orientation,
        unit: 'mm',
        format: finalConfig.pageFormat
      })
      console.log('✅ jsPDF criado com sucesso')

      // Configurar fonte padrão
      console.log('🔤 Configurando fonte padrão...')
      doc.setFont('helvetica')
      
      let yPosition = 20

      // Cabeçalho
      if (finalConfig.includeHeader) {
        console.log('📝 Adicionando cabeçalho...')
        yPosition = this.addHeader(doc, oac, yPosition)
        console.log('✅ Cabeçalho adicionado, nova posição Y:', yPosition)
      }

      // Informações Básicas
      console.log('ℹ️ Adicionando informações básicas...')
      yPosition = this.addBasicInfo(doc, oac, yPosition)
      console.log('✅ Informações básicas adicionadas, nova posição Y:', yPosition)

      // Dados Quantitativos
      console.log('📊 Adicionando dados quantitativos...')
      yPosition = this.addQuantitativeData(doc, oac, yPosition)
      console.log('✅ Dados quantitativos adicionados, nova posição Y:', yPosition)

      // Comportamentos Observados (Desvios)
      if (oac.desvios && oac.desvios.length > 0) {
        console.log('⚠️ Adicionando desvios...', oac.desvios.length, 'desvios encontrados')
        yPosition = this.addDeviations(doc, oac, yPosition)
        console.log('✅ Desvios adicionados, nova posição Y:', yPosition)
      } else {
        console.log('ℹ️ Nenhum desvio encontrado para adicionar')
      }

      // Plano de Ação
      if (oac.plano_acao && oac.plano_acao.length > 0) {
        console.log('📋 Adicionando plano de ação...', oac.plano_acao.length, 'planos encontrados')
        yPosition = this.addActionPlan(doc, oac, yPosition)
        console.log('✅ Plano de ação adicionado, nova posição Y:', yPosition)
      } else {
        console.log('ℹ️ Nenhum plano de ação encontrado para adicionar')
      }

      // Rodapé
      if (finalConfig.includeFooter) {
        console.log('🦶 Adicionando rodapé...')
        this.addFooter(doc, options.includeTimestamp)
        console.log('✅ Rodapé adicionado')
      }

      // Download do arquivo
      const filename = options.filename || this.generateFilename(oac)
      console.log('💾 Salvando arquivo com nome:', filename)
      doc.save(filename)
      console.log('🎉 PDF gerado e salvo com sucesso!')

    } catch (error) {
      console.error('❌ Erro detalhado ao gerar PDF:', error)
      
      // Type guard para verificar se é uma instância de Error
      if (error instanceof Error) {
        console.error('📍 Stack trace:', error.stack)
        console.error('📝 Mensagem do erro:', error.message)
        throw new Error(`Falha na geração do PDF: ${error.message}`)
      } else {
        console.error('🔍 Tipo do erro:', typeof error)
        console.error('📝 Erro desconhecido:', error)
        throw new Error('Falha na geração do PDF: Erro desconhecido')
      }
    }
  }

  private static addHeader(doc: jsPDF, oac: OAC, yPosition: number): number {
    console.log('🏷️ Iniciando addHeader')
    
    // Título principal
    doc.setFontSize(this.FONTS.title)
    doc.setTextColor(this.COLORS.primary)
    this.safeDocText(doc, 'Relatório de Observação de Atos e Condições (OAC)', 20, yPosition, 'Header-Title')
    yPosition += 10

    // ID da OAC e data
    doc.setFontSize(this.FONTS.subtitle)
    doc.setTextColor(this.COLORS.secondary)
    
    console.log('🆔 Processando ID da OAC:', { id: oac.id, type: typeof oac.id })
    this.safeDocText(doc, `OAC ID: ${this.ensureString(oac.id)}`, 20, yPosition, 'Header-ID')
    this.safeDocText(doc, `Data: ${this.formatDateTime(oac.datahora_inicio)}`, 120, yPosition, 'Header-Date')
    yPosition += 15

    // Linha separadora
    doc.setDrawColor(this.COLORS.light)
    doc.line(20, yPosition, 190, yPosition)
    yPosition += 10

    console.log('✅ addHeader concluído')
    return yPosition
  }

  private static addBasicInfo(doc: jsPDF, oac: OAC, yPosition: number): number {
    console.log('📋 Iniciando addBasicInfo')
    yPosition = this.addSectionTitle(doc, 'Informações Básicas', yPosition)

    const basicInfo = [
      { label: 'Observador:', value: this.ensureString(oac.observador) },
      { label: 'Equipe:', value: this.ensureString(oac.equipe_info?.equipe || oac.equipe) },
      { label: 'Local:', value: this.ensureString(oac.local_info?.local || oac.local) },
      { label: 'Data/Hora:', value: this.ensureString(this.formatDateTime(oac.datahora_inicio)) },
      { label: 'Tempo de Observação:', value: this.ensureString(this.formatDuration(oac.tempo_observacao)) },
      { label: 'Contrato:', value: this.ensureString(oac.contrato) }
    ]

    console.log('📋 basicInfo array:', basicInfo)
    yPosition = this.addInfoList(doc, basicInfo, yPosition)
    console.log('✅ addBasicInfo concluído')
    return yPosition + 10
  }

  private static addQuantitativeData(doc: jsPDF, oac: OAC, yPosition: number): number {
    console.log('📊 Iniciando addQuantitativeData')
    yPosition = this.addSectionTitle(doc, 'Dados Quantitativos', yPosition)

    const quantData = [
      { label: 'Pessoas no Local:', value: this.ensureString(oac.qtd_pessoas_local) },
      { label: 'Pessoas Abordadas:', value: this.ensureString(oac.qtd_pessoas_abordadas) },
      { label: 'Total de Desvios:', value: this.ensureString(oac.desvios_count || 0) }
    ]

    console.log('📊 quantData array:', quantData)
    yPosition = this.addInfoList(doc, quantData, yPosition)
    console.log('✅ addQuantitativeData concluído')
    return yPosition + 10
  }

  private static addDeviations(doc: jsPDF, oac: OAC, yPosition: number): number {
    console.log('⚠️ Iniciando addDeviations')
    yPosition = this.addSectionTitle(doc, 'Comportamentos Observados', yPosition)

    if (!oac.desvios || oac.desvios.length === 0) {
      doc.setFontSize(this.FONTS.text)
      doc.setTextColor(this.COLORS.secondary)
      this.safeDocText(doc, 'Nenhum desvio registrado.', 25, yPosition, 'Deviations-Empty')
      return yPosition + 10
    }

    oac.desvios.forEach((desvio, index) => {
      console.log(`⚠️ Processando desvio ${index + 1}:`, desvio)
      
      // Verificar se precisa de nova página
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(this.FONTS.text)
      doc.setTextColor(this.COLORS.text)
      
      // Número do desvio
      const desvioText = `${this.ensureString(index + 1)}. ${this.ensureString(desvio.item_desvio)}`
      this.safeDocText(doc, desvioText, 25, yPosition, `Deviation-${index}-Title`)
      yPosition += 6

      // Categoria e subcategoria
      if (desvio.subcategoria) {
        doc.setFontSize(this.FONTS.small)
        doc.setTextColor(this.COLORS.secondary)
        const categoria = this.ensureString(desvio.subcategoria.categoria?.categoria || 'N/A')
        const subcategoria = this.ensureString(desvio.subcategoria.subcategoria || 'N/A')
        const categoryText = `   Categoria: ${categoria} | Subcategoria: ${subcategoria}`
        this.safeDocText(doc, categoryText, 25, yPosition, `Deviation-${index}-Category`)
        yPosition += 5
      }

      // Quantidade e descrição
      doc.setFontSize(this.FONTS.small)
      const quantityText = `   Quantidade: ${this.ensureString(desvio.quantidade_desvios)}`
      this.safeDocText(doc, quantityText, 25, yPosition, `Deviation-${index}-Quantity`)
      yPosition += 5

      if (desvio.descricao_desvio) {
        const descricaoText = `   Descrição: ${this.ensureString(desvio.descricao_desvio)}`
        const descricaoLines = doc.splitTextToSize(descricaoText, 160)
        console.log(`📝 Descrição do desvio ${index}:`, { original: desvio.descricao_desvio, lines: descricaoLines })
        
        // Verificar se descricaoLines é array ou string
        if (Array.isArray(descricaoLines)) {
          descricaoLines.forEach((line, lineIndex) => {
            this.safeDocText(doc, line, 25, yPosition, `Deviation-${index}-Description-Line-${lineIndex}`)
            yPosition += 5
          })
        } else {
          this.safeDocText(doc, descricaoLines, 25, yPosition, `Deviation-${index}-Description`)
          yPosition += 5
        }
      }

      yPosition += 5
    })

    console.log('✅ addDeviations concluído')
    return yPosition + 5
  }

  private static addActionPlan(doc: jsPDF, oac: OAC, yPosition: number): number {
    yPosition = this.addSectionTitle(doc, 'Plano de Ação', yPosition)

    if (!oac.plano_acao || oac.plano_acao.length === 0) {
      doc.setFontSize(this.FONTS.text)
      doc.setTextColor(this.COLORS.secondary)
      doc.text('Nenhum plano de ação registrado.', 25, yPosition)
      return yPosition + 10
    }

    const plano = oac.plano_acao[0] // Usar o primeiro plano de ação

    const actionItems = [
      { label: 'Ação Recomendada:', value: plano.acao_recomendada || 'N/A' },
      { label: 'Reconhecimento:', value: plano.reconhecimento || 'N/A' },
      { label: 'Condição Abaixo do Padrão:', value: plano.condicao_abaixo_padrao || 'N/A' },
      { label: 'Compromisso Formado:', value: plano.compromisso_formado || 'N/A' }
    ]

    actionItems.forEach(item => {
      if (item.value && item.value !== 'N/A') {
        // Verificar se precisa de nova página
        if (yPosition > 250) {
          doc.addPage()
          yPosition = 20
        }

        doc.setFontSize(this.FONTS.text)
        doc.setTextColor(this.COLORS.text)
        doc.text(item.label, 25, yPosition)
        yPosition += 6

        doc.setFontSize(this.FONTS.small)
        doc.setTextColor(this.COLORS.secondary)
        const valueLines = doc.splitTextToSize(item.value, 160)
        doc.text(valueLines, 25, yPosition)
        yPosition += valueLines.length * 5 + 5
      }
    })

    return yPosition + 5
  }

  private static addSectionTitle(doc: jsPDF, title: string, yPosition: number): number {
    // Verificar se precisa de nova página
    if (yPosition > 260) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(this.FONTS.subtitle)
    doc.setTextColor(this.COLORS.primary)
    doc.text(title, 20, yPosition)
    yPosition += 8

    // Linha abaixo do título
    doc.setDrawColor(this.COLORS.primary)
    doc.line(20, yPosition, 190, yPosition)
    yPosition += 8

    return yPosition
  }

  private static addInfoList(
    doc: jsPDF, 
    items: Array<{ label: string; value: string }>, 
    yPosition: number
  ): number {
    console.log('📝 Iniciando addInfoList com items:', items)
    doc.setFontSize(this.FONTS.text)
    
    items.forEach((item, index) => {
      console.log(`📝 Processando item ${index}:`, item)
      
      // Verificar se precisa de nova página
      if (yPosition > 270) {
        doc.addPage()
        yPosition = 20
      }

      doc.setTextColor(this.COLORS.text)
      this.safeDocText(doc, item.label, 25, yPosition, `InfoList-${index}-Label`)
      doc.setTextColor(this.COLORS.secondary)
      this.safeDocText(doc, item.value, 80, yPosition, `InfoList-${index}-Value`)
      yPosition += 6
    })

    console.log('✅ addInfoList concluído')
    return yPosition
  }

  private static addFooter(doc: jsPDF, includeTimestamp: boolean = true): void {
    console.log('🦶 Iniciando addFooter')
    const pageCount = doc.getNumberOfPages()
    console.log('📄 Total de páginas:', pageCount)
    
    for (let i = 1; i <= pageCount; i++) {
      console.log(`📄 Processando página ${i}`)
      doc.setPage(i)
      
      doc.setFontSize(this.FONTS.small)
      doc.setTextColor(this.COLORS.secondary)
      
      // Linha separadora
      doc.line(20, 280, 190, 280)
      
      // Informações do rodapé
      if (includeTimestamp) {
        const now = new Date()
        const timestamp = `Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`
        this.safeDocText(doc, timestamp, 20, 290, `Footer-Timestamp-Page-${i}`)
      }
      
      // Número da página
      const pageText = `Página ${this.ensureString(i)} de ${this.ensureString(pageCount)}`
      this.safeDocText(doc, pageText, 160, 290, `Footer-PageNumber-Page-${i}`)
    }
    
    console.log('✅ addFooter concluído')
  }

  static formatDateTime(dateString: string): string {
    try {
      const date = new Date(dateString)
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  static formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes.toString()} minutos`
    }
    
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    
    if (remainingMinutes === 0) {
      return `${hours.toString()}h`
    }
    
    return `${hours.toString()}h ${remainingMinutes.toString()}min`
  }

  private static generateFilename(oac: OAC): string {
    const date = new Date(oac.datahora_inicio)
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '')
    return `OAC_${oac.id.toString()}_${dateStr}.pdf`
  }
}
