'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Eye,
  Search,
  Filter,
  Calendar,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  User,
  Building,
  Download
} from 'lucide-react'
import { toast } from 'sonner'
import { PDFService } from '@/lib/services/pdfService'

interface OAC {
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

interface Filtros {
  data_inicio: string
  data_fim: string
  observador: string
  local: string
  equipe: string
  contrato: string
  busca: string
}

export default function HistoricoOacPage() {
  const router = useRouter()
  const [oacs, setOacs] = useState<OAC[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedOac, setExpandedOac] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null)

  const [filtros, setFiltros] = useState<Filtros>({
    data_inicio: '',
    data_fim: '',
    observador: '',
    local: '',
    equipe: '',
    contrato: '',
    busca: ''
  })

  const loadOacs = useCallback(async () => {
    try {
    
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      })

      // Adicionar filtros não vazios
      Object.entries(filtros).forEach(([key, value]) => {
        if (value && value.trim()) {
          params.append(key, value.trim())
        }
      })

      const response = await fetch(`/api/oac?${params.toString()}`, {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar OACs')
      }

      const data = await response.json()
      if (data.success) {
        setOacs(data.data)
        setTotalPages(data.pagination.totalPages)
        setTotalItems(data.pagination.totalItems)
      } else {
        toast.error(data.message || 'Erro ao carregar OACs')
      }
    } catch (error) {
      console.error('Error loading OACs:', error)
      toast.error('Erro ao carregar OACs')
    } finally {
      setLoading(false)
    }
  }, [currentPage, filtros])

  useEffect(() => {
    loadOacs()
  }, [loadOacs])

  const handleFiltroChange = (campo: keyof Filtros, valor: string) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }))
    setCurrentPage(1) // Reset para primeira página ao filtrar
  }

  const limparFiltros = () => {
    setFiltros({
      data_inicio: '',
      data_fim: '',
      observador: '',
      local: '',
      equipe: '',
      contrato: '',
      busca: ''
    })
    setCurrentPage(1)
  }

  const toggleExpandOac = (oacId: string) => {
    setExpandedOac(expandedOac === oacId ? null : oacId)
  }

  const handleGeneratePDF = async (oac: OAC) => {
    console.log('🚀 Iniciando geração de PDF para OAC:', oac.id)
    console.log('📋 Dados completos da OAC:', JSON.stringify(oac, null, 2))
    
    try {
      setGeneratingPdf(oac.id)
      console.log('⏳ Estado de loading definido, chamando PDFService...')
      
      await PDFService.generateOACPDF(oac)
      
      console.log('✅ PDF gerado com sucesso!')
      toast.success('PDF gerado com sucesso!')
    } catch (error) {
      console.error('❌ Erro capturado na função handleGeneratePDF:', error)
      
      // Type guard para verificar se é uma instância de Error
      if (error instanceof Error) {
        console.error('📍 Stack trace do erro:', error.stack)
        console.error('📝 Mensagem do erro:', error.message)
        toast.error(`Erro ao gerar PDF: ${error.message}`)
      } else {
        console.error('🔍 Tipo do erro:', typeof error)
        console.error('📝 Erro desconhecido:', error)
        toast.error('Erro ao gerar PDF: Erro desconhecido')
      }
    } finally {
      console.log('🏁 Finalizando geração de PDF, removendo loading...')
      setGeneratingPdf(null)
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}min`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`
  }

  const renderFiltros = () => (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-all duration-300 ${
      showFilters ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
    }`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Data Início
          </label>
          <input
            type="date"
            value={filtros.data_inicio}
            onChange={(e) => handleFiltroChange('data_inicio', e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Data Fim
          </label>
          <input
            type="date"
            value={filtros.data_fim}
            onChange={(e) => handleFiltroChange('data_fim', e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Observador
          </label>
          <input
            type="text"
            value={filtros.observador}
            onChange={(e) => handleFiltroChange('observador', e.target.value)}
            placeholder="Nome do observador"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Local
          </label>
          <input
            type="text"
            value={filtros.local}
            onChange={(e) => handleFiltroChange('local', e.target.value)}
            placeholder="Local da observação"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Equipe
          </label>
          <input
            type="text"
            value={filtros.equipe}
            onChange={(e) => handleFiltroChange('equipe', e.target.value)}
            placeholder="Nome da equipe"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Contrato
          </label>
          <input
            type="text"
            value={filtros.contrato}
            onChange={(e) => handleFiltroChange('contrato', e.target.value)}
            placeholder="Código do contrato"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex-1 mr-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Busca Geral
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={filtros.busca}
              onChange={(e) => handleFiltroChange('busca', e.target.value)}
              placeholder="Buscar em todos os campos..."
              className="w-full pl-10 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex items-end space-x-2">
          <button
            onClick={limparFiltros}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md"
          >
            Limpar
          </button>
        </div>
      </div>
    </div>
  )

  const renderOacCard = (oac: OAC) => {
    const isExpanded = expandedOac === oac.id
    const hasDesvios = (oac.desvios_count || 0) > 0

    return (
      <div key={oac.id} className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        {/* Header do Card */}
        <div 
          className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          onClick={() => toggleExpandOac(oac.id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-2 rounded-full ${
                hasDesvios 
                  ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-600' 
                  : 'bg-green-100 dark:bg-green-900/20 text-green-600'
              }`}>
                {hasDesvios ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : (
                  <CheckCircle className="h-5 w-5" />
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {oac.local_info?.local || oac.local} - {oac.equipe_info?.equipe || oac.equipe}
                </h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    {oac.observador}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatDateTime(oac.datahora_inicio)}
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {formatDuration(oac.tempo_observacao)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {oac.qtd_pessoas_abordadas}/{oac.qtd_pessoas_local} pessoas
                </div>
                {hasDesvios && (
                  <div className="text-sm text-orange-600 font-medium">
                    {oac.desvios_count} desvio{(oac.desvios_count || 0) > 1 ? 's' : ''}
                  </div>
                )}
              </div>
              
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </div>
          </div>
        </div>

        {/* Detalhes Expandidos */}
        {isExpanded && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-6 space-y-6">
            {/* Informações Básicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center">
                <Building className="h-4 w-4 text-gray-400 mr-2" />
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Contrato</div>
                  <div className="font-medium text-gray-900 dark:text-white">{oac.contrato}</div>
                </div>
              </div>
              
              <div className="flex items-center">
                <Users className="h-4 w-4 text-gray-400 mr-2" />
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Pessoas no Local</div>
                  <div className="font-medium text-gray-900 dark:text-white">{oac.qtd_pessoas_local}</div>
                </div>
              </div>
              
              <div className="flex items-center">
                <Eye className="h-4 w-4 text-gray-400 mr-2" />
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Pessoas Abordadas</div>
                  <div className="font-medium text-gray-900 dark:text-white">{oac.qtd_pessoas_abordadas}</div>
                </div>
              </div>
            </div>

            {/* Desvios */}
            {oac.desvios && oac.desvios.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
                  Desvios Observados
                </h4>
                <div className="space-y-3">
                  {oac.desvios.map((desvio) => (
                    <div key={desvio.id} className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-orange-800 dark:text-orange-200">
                          {desvio.subcategoria?.categoria.categoria} - {desvio.subcategoria?.subcategoria}
                        </h5>
                        <span className="bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 px-2 py-1 rounded-full text-sm">
                          {desvio.quantidade_desvios} ocorrência{desvio.quantidade_desvios > 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="text-orange-700 dark:text-orange-300 text-sm">
                        {desvio.descricao_desvio}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Plano de Ação */}
            {oac.plano_acao && oac.plano_acao.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <FileText className="h-5 w-5 text-blue-600 mr-2" />
                  Plano de Ação
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {oac.plano_acao[0].acao_recomendada && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Ação Recomendada</h5>
                      <p className="text-blue-700 dark:text-blue-300 text-sm">{oac.plano_acao[0].acao_recomendada}</p>
                    </div>
                  )}
                  
                  {oac.plano_acao[0].reconhecimento && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <h5 className="font-medium text-green-800 dark:text-green-200 mb-2">Reconhecimento</h5>
                      <p className="text-green-700 dark:text-green-300 text-sm">{oac.plano_acao[0].reconhecimento}</p>
                    </div>
                  )}
                  
                  {oac.plano_acao[0].condicao_abaixo_padrao && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <h5 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Condição Abaixo do Padrão</h5>
                      <p className="text-yellow-700 dark:text-yellow-300 text-sm">{oac.plano_acao[0].condicao_abaixo_padrao}</p>
                    </div>
                  )}
                  
                  {oac.plano_acao[0].compromisso_formado && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                      <h5 className="font-medium text-purple-800 dark:text-purple-200 mb-2">Compromisso Firmado</h5>
                      <p className="text-purple-700 dark:text-purple-300 text-sm">{oac.plano_acao[0].compromisso_formado}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Botão Gerar PDF */}
            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => handleGeneratePDF(oac)}
                disabled={generatingPdf === oac.id}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generatingPdf === oac.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Gerando PDF...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Gerar PDF
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderPaginacao = () => {
    if (totalPages <= 1) return null

    const pages = []
    const maxVisiblePages = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }

    return (
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Mostrando {((currentPage - 1) * 10) + 1} a {Math.min(currentPage * 10, totalItems)} de {totalItems} registros
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          
          {pages.map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-2 rounded-md ${
                page === currentPage
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              {page}
            </button>
          ))}
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Próxima
          </button>
        </div>
      </div>
    )
  }

  return (
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Eye className="h-10 w-10 mr-4" />
              <div>
                <h1 className="text-xl font-bold">Histórico de OACs</h1>
                <p className="text-blue-100 mt-1">
                  Visualize e gerencie todas as observações comportamentais
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/oac/nova')}
              className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors font-medium"
            >
              Nova OAC
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center">
                <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
                <span className="font-medium text-gray-900 dark:text-white">Filtros</span>
              </div>
              {showFilters ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          
          {renderFiltros()}
        </div>

        {/* Lista de OACs */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : oacs.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
              <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Nenhuma OAC encontrada
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Não há observações comportamentais que correspondam aos filtros aplicados.
              </p>
              <button
                onClick={() => router.push('/oac/nova')}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Criar primeira OAC
              </button>
            </div>
          ) : (
            oacs.map(renderOacCard)
          )}
        </div>

        {/* Paginação */}
        {renderPaginacao()}
      </div>
  )
}
