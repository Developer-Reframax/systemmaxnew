'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import * as ExcelJS from 'exceljs'
import {
  Eye,
  Users,
  TrendingUp,
  BarChart3,
  PieChart,
  Plus,
  Filter,
  Download,
  Calendar,
  MapPin,
  AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { formatDateTimeFromDatabase } from '@/lib/datetime'

interface OacStats {
  total_oacs: number
  total_pessoas_observadas: number
  media_pessoas_por_oac: number
  desvios_por_categoria: Array<{
    categoria: string
    total: number
  }>
  top_observadores: Array<{
    observador: number
    total: number
  }>
  top_locais: Array<{
    local: string
    total: number
  }>
  periodo: {
    inicio: string
    fim: string
    filtro: string
  }
}

interface RecentOac {
  id: string
  local: string
  equipe: string
  datahora_inicio: string
  observador_info: {
    nome: string
  }
  local_info?: {
    id: string
    local: string
  }
  equipe_info?: {
    id: string
    equipe: string
  }
  qtd_pessoas_local: number
  qtd_pessoas_abordadas: number
  desvios: Array<{
    quantidade_desvios: number
  }>
}

interface OacExportRow {
  id: string
  contrato: string
  datahora_inicio: string
  created_at: string | null
  tempo_observacao: number
  qtd_pessoas_local: number
  qtd_pessoas_abordadas: number
  local_nome: string
  equipe_nome: string
  observador_matricula: string | number
  observador_nome: string | null
  observador_funcao: string | null
  observador_equipe: string | null
  observador_letra: string | null
  total_desvios: number
  categorias_desvios: string | null
  topicos_categoria_desvios: string | null
  subcategorias_desvios: string | null
  topicos_subcategoria_desvios: string | null
  desvios_detalhados: string | null
  acao_recomendada: string | null
  reconhecimento: string | null
  condicao_abaixo_padrao: string | null
  compromisso_formado: string | null
}

export default function OacDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<OacStats>({
    total_oacs: 0,
    total_pessoas_observadas: 0,
    media_pessoas_por_oac: 0,
    desvios_por_categoria: [],
    top_observadores: [],
    top_locais: [],
    periodo: {
      inicio: '',
      fim: '',
      filtro: '30d'
    }
  })
  const [recentOacs, setRecentOacs] = useState<RecentOac[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('30')

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      

      // Converter período para formato da API
      let filtroApi = '30d'
      switch (periodo) {
        case '7':
          filtroApi = '7d'
          break
        case '30':
          filtroApi = '30d'
          break
        case '90':
          filtroApi = '90d'
          break
        case '365':
          filtroApi = '1y'
          break
        default:
          filtroApi = '30d'
      }

      console.log('🔍 Carregando dados com filtro:', filtroApi)

      const [statsResponse, oacsResponse] = await Promise.all([
        fetch(`/api/oac/relatorios/estatisticas?filtro=${filtroApi}`, {
          method: 'GET'
        }),
        fetch(`/api/oac?limit=5&page=1`, {
          method: 'GET'
        })
      ])

      if (!statsResponse.ok || !oacsResponse.ok) {
        console.error('❌ Erro nas respostas:', {
          statsStatus: statsResponse.status,
          oacsStatus: oacsResponse.status
        })
        throw new Error('Erro ao carregar dados')
      }

      const [statsData, oacsData] = await Promise.all([
        statsResponse.json(),
        oacsResponse.json()
      ])
      
      console.log('📊 Dados recebidos da API de estatísticas:', statsData)
      
      // A API retorna os dados diretamente, sem wrapper success/data
      if (statsData && typeof statsData === 'object') {
        setStats(statsData)
        console.log('✅ Estatísticas atualizadas:', statsData)
      } else {
        console.warn('⚠️ Dados de estatísticas inválidos:', statsData)
        setStats({
          total_oacs: 0,
          total_pessoas_observadas: 0,
          media_pessoas_por_oac: 0,
          desvios_por_categoria: [],
          top_observadores: [],
          top_locais: [],
          periodo: {
            inicio: '',
            fim: '',
            filtro: filtroApi
          }
        })
      }

      if (oacsData.success) {
        setRecentOacs(oacsData.data)
        console.log('✅ OACs recentes carregadas:', oacsData.data.length)
      }
      
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast.error('Erro ao carregar dados do dashboard')
    } finally {
      setLoading(false)
    }
  }, [periodo])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const formatDate = (dateString: string) => {
    return formatDateTimeFromDatabase(dateString)
  }

  const getTotalDesvios = (oac: RecentOac) => {
    return oac.desvios?.reduce((total, desvio) => total + desvio.quantidade_desvios, 0) || 0
  }

  const exportToExcel = async () => {
    try {
      const response = await fetch('/api/oac/export', { method: 'GET' })
      const data = await response.json()

      if (!response.ok || !data.success) {
        toast.error(data.message || 'Erro ao carregar dados para exportacao')
        return
      }

      const oacs: OacExportRow[] = data.data || []
      if (oacs.length === 0) {
        toast.error('Nenhuma OAC encontrada para exportacao')
        return
      }

      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('OACs')

      const formatDateTime = (value?: string | null) => {
        if (!value) return '-'
        return formatDateTimeFromDatabase(value)
      }

      worksheet.columns = [
        { header: 'ID OAC', key: 'id', width: 14 },
        { header: 'Contrato', key: 'contrato', width: 16 },
        { header: 'Data/Hora inicio', key: 'datahora_inicio', width: 22 },
        { header: 'Data/Hora cadastro', key: 'created_at', width: 22 },
        { header: 'Tempo observacao (min)', key: 'tempo_observacao', width: 22 },
        { header: 'Pessoas no local', key: 'qtd_pessoas_local', width: 18 },
        { header: 'Pessoas abordadas', key: 'qtd_pessoas_abordadas', width: 18 },
        { header: 'Local', key: 'local_nome', width: 28 },
        { header: 'Equipe', key: 'equipe_nome', width: 24 },
        { header: 'Matricula observador', key: 'observador_matricula', width: 18 },
        { header: 'Nome observador', key: 'observador_nome', width: 28 },
        { header: 'Funcao observador', key: 'observador_funcao', width: 24 },
        { header: 'Equipe observador', key: 'observador_equipe', width: 24 },
        { header: 'Letra observador', key: 'observador_letra', width: 16 },
        { header: 'Total desvios', key: 'total_desvios', width: 14 },
        { header: 'Categorias dos desvios', key: 'categorias_desvios', width: 36 },
        { header: 'Topicos da categoria', key: 'topicos_categoria_desvios', width: 36 },
        { header: 'Subcategorias dos desvios', key: 'subcategorias_desvios', width: 36 },
        { header: 'Topicos da subcategoria', key: 'topicos_subcategoria_desvios', width: 36 },
        { header: 'Desvios detalhados', key: 'desvios_detalhados', width: 80 },
        { header: 'Acao recomendada', key: 'acao_recomendada', width: 40 },
        { header: 'Reconhecimento', key: 'reconhecimento', width: 40 },
        { header: 'Condicao abaixo do padrao', key: 'condicao_abaixo_padrao', width: 40 },
        { header: 'Compromisso firmado', key: 'compromisso_formado', width: 40 }
      ]

      oacs.forEach((oac) => {
        worksheet.addRow({
          id: oac.id,
          contrato: oac.contrato || '-',
          datahora_inicio: formatDateTime(oac.datahora_inicio),
          created_at: formatDateTime(oac.created_at),
          tempo_observacao: oac.tempo_observacao ?? '-',
          qtd_pessoas_local: oac.qtd_pessoas_local ?? '-',
          qtd_pessoas_abordadas: oac.qtd_pessoas_abordadas ?? '-',
          local_nome: oac.local_nome || '-',
          equipe_nome: oac.equipe_nome || '-',
          observador_matricula: oac.observador_matricula ?? '-',
          observador_nome: oac.observador_nome || '-',
          observador_funcao: oac.observador_funcao || '-',
          observador_equipe: oac.observador_equipe || '-',
          observador_letra: oac.observador_letra || '-',
          total_desvios: oac.total_desvios ?? 0,
          categorias_desvios: oac.categorias_desvios || '-',
          topicos_categoria_desvios: oac.topicos_categoria_desvios || '-',
          subcategorias_desvios: oac.subcategorias_desvios || '-',
          topicos_subcategoria_desvios: oac.topicos_subcategoria_desvios || '-',
          desvios_detalhados: oac.desvios_detalhados || '-',
          acao_recomendada: oac.acao_recomendada || '-',
          reconhecimento: oac.reconhecimento || '-',
          condicao_abaixo_padrao: oac.condicao_abaixo_padrao || '-',
          compromisso_formado: oac.compromisso_formado || '-'
        })
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
      link.download = `oacs-${new Date().toISOString().split('T')[0]}.xlsx`
      link.click()
      window.URL.revokeObjectURL(url)

      toast.success('Exportacao concluida com sucesso')
    } catch (error) {
      console.error('Erro ao exportar OACs:', error)
      toast.error('Erro ao exportar OACs')
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
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <Eye className="h-12 w-12 mr-4" />
              <div>
                <h1 className="text-2xl font-bold">OAC - Observações Comportamentais</h1>
                <p className="text-blue-100 mt-1">
                  Gestão e acompanhamento de observações comportamentais de segurança
                </p>
                <p className="text-blue-200 text-sm mt-1">
                  Usuário: {user?.nome} • Função: {user?.funcao || user?.role}
                </p>
              </div>
            </div>
            <div className="flex w-full md:w-auto justify-start md:justify-end">
              <Link
                href="/oac/nova"
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center w-full md:w-auto justify-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova OAC
              </Link>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Período:</span>
            </div>
            
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="365">Último ano</option>
            </select>

            <button
              type="button"
              onClick={exportToExcel}
              className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700 transition-colors flex items-center"
            >
              <Download className="h-4 w-4 mr-1" />
              Exportar
            </button>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Eye className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de OACs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_oacs}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pessoas Observadas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_pessoas_observadas}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <TrendingUp className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Média por OAC</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.media_pessoas_por_oac}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Desvios</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.desvios_por_categoria.reduce((total, categoria) => total + categoria.total, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navegação Rápida */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/oac/nova"
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-blue-500"
          >
            <div className="flex items-center">
              <Plus className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Nova OAC</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Registrar nova observação</p>
              </div>
            </div>
          </Link>

          <Link
            href="/oac/historico"
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-green-500"
          >
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Histórico</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ver OACs realizadas</p>
              </div>
            </div>
          </Link>

          <Link
            href="/oac/relatorios"
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-purple-500"
          >
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Relatórios</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Gráficos e estatísticas</p>
              </div>
            </div>
          </Link>

          <Link
            href="/oac/categorias"
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-orange-500"
          >
            <div className="flex items-center">
              <PieChart className="h-8 w-8 text-orange-600 mr-3" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Categorias</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Gerenciar categorias</p>
              </div>
            </div>
          </Link>
        </div>

        {/* OACs Recentes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">OACs Recentes</h2>
              <Link
                href="/oac/historico"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Ver todas
              </Link>
            </div>
          </div>
          <div className="p-6">
            {recentOacs.length === 0 ? (
              <div className="text-center py-8">
                <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">Nenhuma OAC encontrada</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Comece registrando sua primeira observação comportamental
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentOacs.map((oac) => (
                  <div
                    key={oac.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <MapPin className="h-4 w-4 mr-1" />
                            {oac.local_info?.local || oac.local}
                          </div>
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <Users className="h-4 w-4 mr-1" />
                            {oac.equipe_info?.equipe || oac.equipe}
                          </div>
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <Calendar className="h-4 w-4 mr-1" />
                            {formatDate(oac.datahora_inicio)}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center space-x-4 text-sm">
                          <span className="text-gray-900 dark:text-white font-medium">
                            Observador: {oac.observador_info?.nome}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            Pessoas: {oac.qtd_pessoas_local} observadas, {oac.qtd_pessoas_abordadas} abordadas
                          </span>
                          {getTotalDesvios(oac) > 0 && (
                            <span className="flex items-center text-orange-600">
                              <AlertTriangle className="h-4 w-4 mr-1" />
                              {getTotalDesvios(oac)} desvios
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
  )
}
