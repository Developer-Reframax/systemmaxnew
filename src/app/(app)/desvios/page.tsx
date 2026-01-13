'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  Activity,
  LayoutPanelLeft,
  TrendingUp,
  Users,
  Calendar,
  BarChart3,
  PieChart,
  Plus,
  Filter,
  Download,
  UserCheck
} from 'lucide-react'
import FormularioConversacional from '@/components/desvios/FormularioConversacional'
import { toast } from 'sonner'
import * as ExcelJS from 'exceljs'

interface DesviosStats {
  total: number
  novos_periodo: number
  aguardando_avaliacao: number
  em_andamento: number
  concluidos: number
  vencidos: number
  tempo_medio_resolucao: number
}

interface ProximoVencimento {
  id: string
  titulo: string
  data_limite: string
  responsavel: string
  natureza: { natureza: string }
}

type ExportColumn = {
  id: string
  label: string
  width: number
  type?: 'date' | 'bool'
}

const EXPORT_COLUMNS: ExportColumn[] = [
  { id: 'matricula', label: 'Matricula', width: 12 },
  { id: 'nome', label: 'Nome', width: 26 },
  { id: 'natureza', label: 'Natureza', width: 18 },
  { id: 'contrato', label: 'Contrato', width: 14 },
  { id: 'local', label: 'Local', width: 18 },
  { id: 'risco_associado', label: 'Risco associado', width: 20 },
  { id: 'tipo', label: 'Tipo', width: 18 },
  { id: 'equipe', label: 'Equipe', width: 18 },
  { id: 'potencial', label: 'Potencial', width: 14 },
  { id: 'acao', label: 'Acao', width: 28 },
  { id: 'observacao', label: 'Observacao', width: 28 },
  { id: 'data_conclusao', label: 'Data conclusao', width: 16, type: 'date' },
  { id: 'ver_agir', label: 'Ver agir', width: 10, type: 'bool' },
  { id: 'data_limite', label: 'Data limite', width: 16, type: 'date' },
  { id: 'status', label: 'Status', width: 16 },
  { id: 'potencial_local', label: 'Potencial local', width: 16 },
  { id: 'acao_cliente', label: 'Acao cliente', width: 12, type: 'bool' },
  { id: 'gerou_recusa', label: 'Gerou recusa', width: 12, type: 'bool' },
  { id: 'data', label: 'Data', width: 14, type: 'date' }
]

export default function DesviosDashboard() {
  const { user, hasRole } = useAuth()
  const [stats, setStats] = useState<DesviosStats>({
    total: 0,
    novos_periodo: 0,
    aguardando_avaliacao: 0,
    em_andamento: 0,
    concluidos: 0,
    vencidos: 0,
    tempo_medio_resolucao: 0
  })
  const [proximosVencimento, setProximosVencimento] = useState<ProximoVencimento[]>([])
  const [distribuicaoStatus, setDistribuicaoStatus] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('30')
  const [tipoVisao, setTipoVisao] = useState<'geral' | 'meus'>('geral')
  const [showNewDesvioModal, setShowNewDesvioModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportMonth, setExportMonth] = useState('')
  const [exportYear, setExportYear] = useState('')
  const [exportStatus, setExportStatus] = useState('')
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    EXPORT_COLUMNS.map((column) => column.id)
  )

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        periodo,
        tipo: tipoVisao
      })

      const response = await fetch(`/api/desvios/stats?${params}`, {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar estatisticas')
      }

      const data = await response.json()

      if (data.success) {
        setStats(data.data.indicadores)
        setProximosVencimento(data.data.proximos_vencimento)
        setDistribuicaoStatus(data.data.distribuicoes.por_status)
      } else {
        toast.error(data.message || 'Erro ao carregar dados')
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast.error('Erro ao carregar dados do dashboard')
    } finally {
      setLoading(false)
    }
  }, [periodo, tipoVisao])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const exportToExcel = async () => {
    try {
      if (selectedColumns.length === 0) {
        toast.error('Selecione pelo menos uma coluna')
        return
      }

      const params = new URLSearchParams()
      if (exportMonth || exportYear) {
        const fallbackYear = exportYear || `${new Date().getFullYear()}`
        if (exportMonth) params.set('month', exportMonth)
        if (fallbackYear) params.set('year', fallbackYear)
      }
      if (exportStatus) params.set('status', exportStatus)

      const response = await fetch(`/api/desvios/export?${params}`, { method: 'GET' })
      if (!response.ok) {
        throw new Error('Erro ao exportar')
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.message || 'Erro ao exportar')
      }

      const desvios = data.data || []
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Desvios')

      const columns = EXPORT_COLUMNS.filter((column) => selectedColumns.includes(column.id))
      worksheet.columns = columns.map((column) => ({
        header: column.label,
        key: column.id,
        width: column.width
      }))

      const formatValue = (value: unknown, type?: 'date' | 'bool') => {
        if (type === 'bool') {
          return value ? 'Sim' : 'Nao'
        }
        if (type === 'date') {
          if (!value) return '-'
          const date = new Date(String(value))
          if (Number.isNaN(date.getTime())) return '-'
          return date.toLocaleDateString('pt-BR')
        }
        if (value === null || value === undefined || value === '') return '-'
        return value
      }

      desvios.forEach((item: Record<string, unknown>) => {
        const row: Record<string, unknown> = {}
        columns.forEach((column) => {
          row[column.id] = formatValue(item[column.id], column.type)
        })
        worksheet.addRow(row)
      })

      worksheet.getRow(1).font = { bold: true }
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F3FF' }
      }

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `desvios-${new Date().toISOString().split('T')[0]}.xlsx`
      link.click()
      window.URL.revokeObjectURL(url)
      setShowExportModal(false)
    } catch (error) {
      console.error('Erro ao exportar:', error)
      toast.error('Erro ao exportar')
    }
  }

  const resetExportFilters = () => {
    setExportMonth('')
    setExportYear('')
    setExportStatus('')
    setSelectedColumns(EXPORT_COLUMNS.map((column) => column.id))
  }

  const toggleColumn = (columnId: string) => {
    setSelectedColumns((prev) =>
      prev.includes(columnId) ? prev.filter((id) => id !== columnId) : [...prev, columnId]
    )
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return 'Hoje'
    if (diffInDays === 1) return 'Amanha'
    if (diffInDays > 0) return `${diffInDays} dias`
    return `${Math.abs(diffInDays)} dias atras`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aguardando Avaliacao':
        return 'text-yellow-600'
      case 'Em Andamento':
        return 'text-blue-600'
      case 'Concluido':
        return 'text-green-600'
      case 'Vencido':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-12 w-12 mr-4" />
            <div>
              <h1 className="text-2xl font-bold">Relatos/Desvios de Seguranca</h1>
              <p className="text-orange-100 mt-1">Gestao e acompanhamento de desvios de seguranca</p>
              <p className="text-orange-200 text-sm mt-1">
                Usuario: {user?.nome} - Funcao: {user?.funcao || user?.role}
              </p>
            </div>
          </div>
          <div className="flex w-full md:w-auto justify-start md:justify-end">
            <button
              onClick={() => setShowNewDesvioModal(true)}
              className="bg-white text-orange-600 px-4 py-2 rounded-lg font-medium hover:bg-orange-50 transition-colors flex items-center w-full md:w-auto justify-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Desvio
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtros:</span>
          </div>

          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="7">Ultimos 7 dias</option>
            <option value="30">Ultimos 30 dias</option>
            <option value="90">Ultimos 90 dias</option>
            <option value="365">Ultimo ano</option>
          </select>

          <select
            value={tipoVisao}
            onChange={(e) => setTipoVisao(e.target.value as 'geral' | 'meus')}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="geral">Visao Geral</option>
            <option value="meus">Meus Desvios</option>
          </select>

          <button
            onClick={() => setShowExportModal(true)}
            className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700 transition-colors flex items-center"
          >
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </button>
        </div>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total de Desvios</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.total}</div>
                    <div className="ml-2 text-sm text-gray-500 dark:text-gray-400">+{stats.novos_periodo} novos</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium text-orange-600 dark:text-orange-400">{stats.novos_periodo}</span> nos
              ultimos {periodo} dias
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Aguardando Avaliacao</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {stats.aguardando_avaliacao}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm text-gray-600 dark:text-gray-300">Pendentes de analise</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Em Andamento</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.em_andamento}</div>
                    <div className="ml-2 text-sm text-red-500">{stats.vencidos} vencidos</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium text-red-600 dark:text-red-400">{stats.vencidos}</span> vencidos
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Concluidos</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.concluidos}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Tempo medio: <span className="font-medium text-green-600">{stats.tempo_medio_resolucao}</span> dias
            </div>
          </div>
        </div>
      </div>

      {/* Graficos e Proximos Vencimentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuicao por Status */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Distribuicao por Status
            </h3>
          </div>
          <div className="space-y-3">
            {Object.entries(distribuicaoStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className={`text-sm font-medium ${getStatusColor(status)}`}>{status}</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">{count as number}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Proximos Vencimentos */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Proximos Vencimentos
            </h3>
          </div>
          <div className="space-y-3">
            {proximosVencimento.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                Nenhum desvio proximo do vencimento
              </p>
            ) : (
              proximosVencimento.slice(0, 5).map((desvio) => (
                <div
                  key={desvio.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{desvio.titulo}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {desvio.natureza.natureza} - Resp: {desvio.responsavel}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-red-600">{formatTime(desvio.data_limite)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Menu de Acoes */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Acoes Rapidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/desvios/meus"
            className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Users className="h-6 w-6 text-blue-600 mr-3" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Meus Desvios</span>
          </Link>

          {hasRole(['Admin', 'Editor']) && (
            <Link
              href="/desvios/avaliar"
              className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Avaliar Desvios</span>
            </Link>
          )}

          <Link
            href="/desvios/pendencias"
            className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Clock className="h-6 w-6 text-orange-600 mr-3" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Minhas Pendencias</span>
          </Link>

          <Link
            href="/desvios/gerais"
            className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <AlertTriangle className="h-6 w-6 text-indigo-600 mr-3" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Desvios Gerais</span>
          </Link>

          <Link
            href="/central-monitoramento"
            className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Activity className="h-6 w-6 text-orange-600 mr-3" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Central de Monitoramento</span>
          </Link>

          <Link
            href="/desvios/colaboradores"
            className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <UserCheck className="h-6 w-6 text-emerald-600 mr-3" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Registros por colaborador
            </span>
          </Link>

          <Link
            href="/desvios/kanban"
            className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <LayoutPanelLeft className="h-6 w-6 text-blue-600 mr-3" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Kanban de Desvios</span>
          </Link>

          {hasRole('Admin') && (
            <Link
              href="/desvios/configuracoes"
              className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <BarChart3 className="h-6 w-6 text-purple-600 mr-3" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Configuracoes</span>
            </Link>
          )}
        </div>
      </div>

      {/* Modal Novo Desvio */}
      <FormularioConversacional
        isOpen={showNewDesvioModal}
        onClose={() => setShowNewDesvioModal(false)}
        onSuccess={loadDashboardData}
      />

      {showExportModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowExportModal(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Exportar desvios
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                Filtros e colunas opcionais para a exportacao.
              </p>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mes
                  </label>
                  <select
                    value={exportMonth}
                    onChange={(e) => setExportMonth(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Todos</option>
                    {Array.from({ length: 12 }, (_, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {idx + 1}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ano
                  </label>
                  <input
                    type="number"
                    value={exportYear}
                    onChange={(e) => setExportYear(e.target.value)}
                    placeholder="Ex: 2026"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={exportStatus}
                  onChange={(e) => setExportStatus(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="Aguardando Avaliacao">Aguardando Avaliacao</option>
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Concluido">Concluido</option>
                  <option value="Vencido">Vencido</option>
                </select>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Colunas</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedColumns(EXPORT_COLUMNS.map((column) => column.id))}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Selecionar tudo
                    </button>
                    <button
                      onClick={() => setSelectedColumns([])}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EXPORT_COLUMNS.map((column) => (
                    <label key={column.id} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={selectedColumns.includes(column.id)}
                        onChange={() => toggleColumn(column.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      {column.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-2 justify-end">
              <button
                onClick={resetExportFilters}
                className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Limpar filtros
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={exportToExcel}
                className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                Exportar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
