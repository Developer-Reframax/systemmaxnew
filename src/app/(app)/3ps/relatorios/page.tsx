'use client'

import type { ComponentType } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Download,
  Filter,
  ListTree,
  Target,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  buildChartConfig,
  CartesianChartCard,
  PieChartCard,
  type ChartDatum,
} from '@/components/charts'
import { MetricCard } from '@/components/reports/MetricCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/hooks/useAuth'

type BooleanField =
  | 'paralisacao_realizada'
  | 'riscos_avaliados'
  | 'ambiente_avaliado'
  | 'passo_descrito'
  | 'hipoteses_levantadas'
  | 'atividade_segura'

interface Participante3P {
  matricula: number
  nome: string
}

interface ReportRow {
  atividade: string
  atividade_segura: boolean | null
  ambiente_avaliado: boolean | null
  area: string
  areaId: number | string | null
  contrato: string
  createdAt: string | null
  criadorMatricula: number | null
  criadorNome: string
  hipoteses_levantadas: boolean | null
  id: string
  oportunidades: string
  paralisacao_realizada: boolean | null
  participantes: Participante3P[]
  passo_descrito: boolean | null
  riscos_avaliados: boolean | null
  tipo: string
}

interface ReportData {
  generatedAt: string
  rows: ReportRow[]
}

interface ChartItem {
  key: string
  label: string
  total: number
}

interface DateRangeFilter {
  createdFrom: string
  createdTo: string
}

interface TableRowData {
  atividade: string
  createdAt: string | null
  desvios: number
  id: string
  modeLabel: string
  oportunidades: string
  participantesResumo: string
  pessoasEnvolvidas: number
  responsavel: string
  rowKey: string
  source: ReportRow
  tipo: string
}

type FilterKey = 'area' | 'tipo'
type ReportFilters = Record<FilterKey, string[]>
type TableMode = 'original' | 'expanded'

const EMPTY_FILTERS: ReportFilters = {
  area: [],
  tipo: [],
}

const BOOLEAN_FIELDS: Array<{ key: BooleanField; label: string }> = [
  { key: 'paralisacao_realizada', label: 'Paralisacao realizada' },
  { key: 'riscos_avaliados', label: 'Riscos avaliados' },
  { key: 'ambiente_avaliado', label: 'Ambiente avaliado' },
  { key: 'passo_descrito', label: 'Passo descrito' },
  { key: 'hipoteses_levantadas', label: 'Hipoteses levantadas' },
  { key: 'atividade_segura', label: 'Atividade segura' },
]

const FILTER_GROUPS: Array<{
  description: string
  key: FilterKey
  title: string
}> = [
  {
    description: 'Filtra os registros pelo nome da area vinculada ao 3P.',
    key: 'area',
    title: 'Area',
  },
  {
    description: 'Filtra os registros pelo tipo informado no cadastro do 3P.',
    key: 'tipo',
    title: 'Tipo',
  },
]

export default function Relatorios3PsPage() {
  useAuth()
  const router = useRouter()
  const [data, setData] = useState<ReportData | null>(null)
  const [dateRange, setDateRange] = useState<DateRangeFilter>(() => getCurrentMonthDateRange())
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tableMode, setTableMode] = useState<TableMode>('original')

  useEffect(() => {
    const loadReport = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(buildReportUrl(dateRange), {
          method: 'GET',
        })
        const payload = await response.json().catch(() => ({}))

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'Erro ao carregar relatorio de 3Ps')
        }

        setData(payload.data as ReportData)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao carregar relatorio de 3Ps'
        setError(message)
        toast.error(message)
      } finally {
        setLoading(false)
      }
    }

    loadReport()
  }, [dateRange])

  const rows = data?.rows || []

  const filterOptions = useMemo(() => buildFilterOptions(rows), [rows])

  const activeFiltersCount = useMemo(
    () =>
      Object.values(filters).reduce((total, values) => total + values.length, 0) +
      (dateRange.createdFrom || dateRange.createdTo ? 1 : 0),
    [dateRange.createdFrom, dateRange.createdTo, filters],
  )

  const filteredRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          matchesOptionFilter(row.area, filters.area) &&
          matchesOptionFilter(row.tipo, filters.tipo) &&
          isWithinCreatedDateRange(row.createdAt, dateRange),
      ),
    [dateRange, filters, rows],
  )

  const dailySeries = useMemo(
    () => buildDailySeries(filteredRows, dateRange),
    [dateRange, filteredRows],
  )

  const summary = useMemo(
    () => buildSummary(filteredRows, dailySeries),
    [dailySeries, filteredRows],
  )

  const charts = useMemo(
    () => ({
      byArea: buildGroupedChart(filteredRows, (row) => row.area),
      byType: buildGroupedChart(filteredRows, (row) => row.tipo),
    }),
    [filteredRows],
  )

  const tableRows = useMemo(
    () => buildTableRows(filteredRows, tableMode),
    [filteredRows, tableMode],
  )

  const toggleFilterValue = (key: FilterKey, value: string) => {
    setFilters((current) => {
      const currentValues = current[key]
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value]

      return {
        ...current,
        [key]: nextValues,
      }
    })
  }

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS)
    setDateRange(getCurrentMonthDateRange())
  }

  const filterToday = () => {
    const today = getLocalDateKey(new Date())
    setDateRange({
      createdFrom: today,
      createdTo: today,
    })
  }

  const exportTableToExcel = async () => {
    if (tableRows.length === 0) {
      toast.warning('Nao ha dados na tabela para exportar.')
      return
    }

    try {
      const ExcelJS = await import('exceljs')
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Relatorio 3Ps')

      worksheet.columns = [
        { header: 'Modo da linha', key: 'modeLabel', width: 24 },
        { header: 'Data do registro', key: 'dataRegistro', width: 18 },
        { header: 'Hora do registro', key: 'horaRegistro', width: 16 },
        { header: 'Responsavel', key: 'responsavel', width: 30 },
        { header: 'Area', key: 'area', width: 26 },
        { header: 'Contrato', key: 'contrato', width: 18 },
        { header: 'Tipo', key: 'tipo', width: 16 },
        { header: 'Atividade', key: 'atividade', width: 50 },
        { header: 'Pessoas envolvidas', key: 'pessoasEnvolvidas', width: 20 },
        { header: 'Participantes', key: 'participantesResumo', width: 42 },
        { header: 'Oportunidades', key: 'oportunidades', width: 42 },
        ...BOOLEAN_FIELDS.map((field) => ({
          header: field.label,
          key: field.key,
          width: 22,
        })),
        { header: 'Total de desvios', key: 'desvios', width: 18 },
      ]

      tableRows.forEach((row) => {
        worksheet.addRow({
          atividade: row.atividade || '-',
          area: row.source.area,
          atividade_segura: formatBoolean(row.source.atividade_segura),
          ambiente_avaliado: formatBoolean(row.source.ambiente_avaliado),
          contrato: row.source.contrato,
          dataRegistro: formatDate(row.createdAt),
          desvios: row.desvios,
          hipoteses_levantadas: formatBoolean(row.source.hipoteses_levantadas),
          horaRegistro: formatTime(row.createdAt),
          modeLabel: row.modeLabel,
          oportunidades: row.oportunidades || '-',
          paralisacao_realizada: formatBoolean(row.source.paralisacao_realizada),
          participantesResumo: row.participantesResumo,
          passo_descrito: formatBoolean(row.source.passo_descrito),
          pessoasEnvolvidas: row.pessoasEnvolvidas,
          responsavel: row.responsavel,
          riscos_avaliados: formatBoolean(row.source.riscos_avaliados),
          tipo: row.tipo,
        })
      })

      worksheet.getRow(1).font = { bold: true }
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F3FF' },
      }
      worksheet.views = [{ state: 'frozen', ySplit: 1 }]

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_')

      link.href = url
      link.download = `relatorio_3ps_${timestamp}.xlsx`
      link.click()
      window.URL.revokeObjectURL(url)

      toast.success('Tabela exportada para Excel com sucesso.')
    } catch (err) {
      console.error('Erro ao exportar relatorio de 3Ps:', err)
      toast.error('Nao foi possivel exportar a tabela para Excel.')
    }
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Button variant="outline" onClick={() => router.push('/3ps')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao modulo
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Relatorios graficos de 3Ps
            </h1>
            <p className="max-w-3xl text-gray-600 dark:text-gray-400">
              Visao consolidada dos registros de Pausar, Processar e Prosseguir,
              com medias, desvios, distribuicao por area e tipo, e tabela detalhada.
            </p>
          </div>
        </div>
        {data?.generatedAt && (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            Atualizado em {formatDateTime(data.generatedAt)}
          </div>
        )}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Filtros do relatorio
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Use os filtros para recalcular cards, graficos e tabela com o mesmo recorte.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {activeFiltersCount > 0 && (
              <Badge variant="secondary">
                {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''} ativo{activeFiltersCount > 1 ? 's' : ''}
              </Badge>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => setFiltersOpen(true)}
              disabled={loading}
            >
              <Filter className="mr-2 h-4 w-4" />
              Abrir filtros
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={clearFilters}
              disabled={loading || activeFiltersCount === 0}
            >
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
          <CardContent className="flex items-start gap-3 p-4 text-sm text-red-800 dark:text-red-200">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Nao foi possivel carregar os dados do relatorio.</p>
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Indicadores gerais de 3Ps
          </h2>
          <p className="max-w-4xl text-sm text-gray-600 dark:text-gray-400">
            Os indicadores usam os registros originais. A duplicacao de participantes
            como criadores acontece somente no modo expandido da tabela.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <MetricCard
            description="Quantidade total de registros 3P no recorte selecionado."
            icon={Target}
            loading={loading}
            title="Total de 3Ps"
            tone="blue"
            value={formatNumber(summary.total3ps)}
          />
          <MetricCard
            description="Media de pessoas envolvidas por registro, contando criador e participantes unicos."
            icon={Users}
            loading={loading}
            title="Media de participantes"
            tone="green"
            value={formatDecimal(summary.averageParticipants)}
          />
          <MetricCard
            description="Quantidade media de registros por dia dentro do periodo analisado."
            icon={CalendarDays}
            loading={loading}
            title="Media de registros por dia"
            tone="purple"
            value={formatDecimal(summary.averageRecordsPerDay)}
          />
          <MetricCard
            description="Media das variacoes percentuais diarias, ignorando dias sem base anterior."
            footer="Calculada a partir da contagem diaria de registros."
            icon={TrendingUp}
            loading={loading}
            title="Evolucao media por dia"
            tone="yellow"
            value={formatPercent(summary.averageDailyEvolution)}
          />
          <MetricCard
            description="Media de campos booleanos marcados como Nao por registro."
            footer="Cada resposta Nao em uma etapa do 3P conta como um desvio."
            icon={AlertCircle}
            loading={loading}
            title="Media de desvios"
            tone="gray"
            value={formatDecimal(summary.averageDeviations)}
          />
          <MetricCard
            description="Soma de todos os desvios encontrados no recorte selecionado."
            icon={ListTree}
            loading={loading}
            title="Total de desvios"
            tone="blue"
            value={formatNumber(summary.totalDeviations)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ReportBarChart
            data={charts.byArea}
            description="Agrupa os registros 3P pela area vinculada ao cadastro."
            icon={BarChart3}
            title="Total de 3Ps por area"
          />
          <ReportPieChart
            data={charts.byType}
            description="Distribui os registros 3P pelo tipo informado no cadastro."
            title="Total de 3Ps por tipo"
          />
        </div>
      </section>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <CardTitle>Tabela detalhada de 3Ps</CardTitle>
              <CardDescription className="max-w-3xl">
                Exibe os dados do relatorio com nomes no lugar de IDs. No modo expandido,
                cada participante vira uma linha adicional como responsavel pelo mesmo 3P.
              </CardDescription>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto xl:items-center">
              <div className="flex rounded-md border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900">
                <Button
                  type="button"
                  size="sm"
                  variant={tableMode === 'original' ? 'default' : 'ghost'}
                  onClick={() => setTableMode('original')}
                >
                  Original
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={tableMode === 'expanded' ? 'default' : 'ghost'}
                  onClick={() => setTableMode('expanded')}
                >
                  Participantes como criadores
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={exportTableToExcel}
                disabled={loading || tableRows.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar Excel
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Exibindo {tableRows.length} linha{tableRows.length === 1 ? '' : 's'} da tabela.
            Registros originais filtrados: {filteredRows.length}. Total carregado: {rows.length}.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-12 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          ) : tableRows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              Nenhum 3P encontrado para os filtros selecionados.
            </div>
          ) : (
            <div className="max-h-[620px] overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <Table className="min-w-[1560px]">
                <TableHeader className="bg-blue-50 dark:bg-blue-950 [&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-blue-50 dark:[&_th]:bg-blue-950">
                  <TableRow className="hover:bg-blue-50 dark:hover:bg-blue-950">
                    <TableHead>Modo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Responsavel</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="min-w-[280px]">Atividade</TableHead>
                    <TableHead>Pessoas envolvidas</TableHead>
                    <TableHead className="min-w-[240px]">Participantes</TableHead>
                    {BOOLEAN_FIELDS.map((field) => (
                      <TableHead key={field.key}>{field.label}</TableHead>
                    ))}
                    <TableHead>Total desvios</TableHead>
                    <TableHead className="min-w-[240px]">Oportunidades</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableRows.map((row) => (
                    <TableRow key={row.rowKey}>
                      <TableCell>
                        <Badge variant="secondary">{row.modeLabel}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(row.createdAt)}</TableCell>
                      <TableCell className="font-medium text-gray-900 dark:text-white">
                        {row.responsavel}
                      </TableCell>
                      <TableCell>{row.source.area}</TableCell>
                      <TableCell>{row.tipo}</TableCell>
                      <TableCell>
                        <p className="line-clamp-3 text-sm text-gray-700 dark:text-gray-200">
                          {row.atividade || '-'}
                        </p>
                      </TableCell>
                      <TableCell>{row.pessoasEnvolvidas}</TableCell>
                      <TableCell>{row.participantesResumo}</TableCell>
                      {BOOLEAN_FIELDS.map((field) => (
                        <TableCell key={field.key}>
                          {formatBoolean(row.source[field.key])}
                        </TableCell>
                      ))}
                      <TableCell>{row.desvios}</TableCell>
                      <TableCell>
                        <p className="line-clamp-3 text-sm text-gray-700 dark:text-gray-200">
                          {row.oportunidades || '-'}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {!loading && rows.length === 0 && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <AlertCircle className="h-10 w-10 text-gray-400" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Nenhum 3P encontrado
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Nao ha registros de 3P para o contrato disponivel ao seu usuario.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <ReportFiltersDrawer
        activeFiltersCount={activeFiltersCount}
        dateRange={dateRange}
        filters={filters}
        filterOptions={filterOptions}
        onClear={clearFilters}
        onClose={() => setFiltersOpen(false)}
        onDateRangeChange={setDateRange}
        onFilterToday={filterToday}
        onToggle={toggleFilterValue}
        open={filtersOpen}
      />
    </div>
  )
}

function ReportFiltersDrawer({
  activeFiltersCount,
  dateRange,
  filters,
  filterOptions,
  onClear,
  onClose,
  onDateRangeChange,
  onFilterToday,
  onToggle,
  open,
}: {
  activeFiltersCount: number
  dateRange: DateRangeFilter
  filters: ReportFilters
  filterOptions: Record<FilterKey, string[]>
  onClear: () => void
  onClose: () => void
  onDateRangeChange: (dateRange: DateRangeFilter) => void
  onFilterToday: () => void
  onToggle: (key: FilterKey, value: string) => void
  open: boolean
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Fechar filtros"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-5 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Filtros do relatorio
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Selecione valores para recalcular todos os indicadores exibidos.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Periodo de cadastro
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Filtra os registros pela coluna created_at.
              </p>
            </div>
            <div className="space-y-3 rounded-md border border-gray-200 p-3 dark:border-gray-700">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm text-gray-700 dark:text-gray-200">
                  <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                    Data inicial
                  </span>
                  <Input
                    type="date"
                    value={dateRange.createdFrom}
                    onChange={(event) =>
                      onDateRangeChange({
                        ...dateRange,
                        createdFrom: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="space-y-1.5 text-sm text-gray-700 dark:text-gray-200">
                  <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                    Data final
                  </span>
                  <Input
                    type="date"
                    value={dateRange.createdTo}
                    onChange={(event) =>
                      onDateRangeChange({
                        ...dateRange,
                        createdTo: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
              <Button type="button" variant="outline" className="w-full" onClick={onFilterToday}>
                <CalendarDays className="mr-2 h-4 w-4" />
                Filtrar dia atual
              </Button>
            </div>
          </section>

          {FILTER_GROUPS.map((group) => {
            const options = filterOptions[group.key]

            return (
              <section key={group.key} className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {group.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {group.description}
                  </p>
                </div>

                {options.length === 0 ? (
                  <div className="rounded-md border border-dashed border-gray-200 p-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    Nenhuma opcao disponivel.
                  </div>
                ) : (
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-gray-200 p-3 dark:border-gray-700">
                    {options.map((option) => (
                      <label
                        key={`${group.key}-${option}`}
                        className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                      >
                        <Checkbox
                          checked={filters[group.key].includes(option)}
                          onCheckedChange={() => onToggle(group.key, option)}
                        />
                        <span className="leading-5">{option}</span>
                      </label>
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-200 p-5 dark:border-gray-700">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {activeFiltersCount} filtro{activeFiltersCount === 1 ? '' : 's'} ativo{activeFiltersCount === 1 ? '' : 's'}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClear}
              disabled={activeFiltersCount === 0}
            >
              Limpar todos
            </Button>
            <Button type="button" onClick={onClose}>
              Aplicar
            </Button>
          </div>
        </div>
      </aside>
    </div>
  )
}

function ReportBarChart({
  data,
  description,
  icon: Icon,
  title,
}: {
  data: ChartItem[]
  description: string
  icon: ComponentType<{ className?: string }>
  title: string
}) {
  const chartData = data.map((item) => ({
    label: item.label,
    total: item.total,
  })) satisfies ChartDatum[]
  const config = buildChartConfig([{ key: 'total', label: 'Quantidade' }])
  const fixedHeight = 340
  const contentHeight = Math.max(fixedHeight, chartData.length * 44 + 48)

  return (
    <div className="relative">
      <div className="pointer-events-none absolute right-4 top-4 z-10 rounded-lg bg-blue-100 p-2 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
        <Icon className="h-4 w-4" />
      </div>
      <CartesianChartCard
        categoryKey="label"
        chartContentHeight={contentHeight}
        chartScrollable={chartData.length > 6}
        config={config}
        data={chartData}
        description={description}
        emptyMessage="Nao ha registros suficientes para montar este grafico."
        height={fixedHeight}
        layout="vertical"
        margin={{ bottom: 8, left: 8, right: 52, top: 12 }}
        series={[
          {
            barSize: 24,
            dataLabelPosition: 'right',
            key: 'total',
            minPointSize: 8,
            radius: [0, 6, 6, 0],
            showLabel: true,
            type: 'bar',
          },
        ]}
        showTooltip
        title={title}
        yAxisWidth={260}
      />
    </div>
  )
}

function ReportPieChart({
  data,
  description,
  title,
}: {
  data: ChartItem[]
  description: string
  title: string
}) {
  const config = buildChartConfig(data.map((item) => ({ key: item.key, label: item.label })))
  const chartData = data.map((item) => ({
    key: item.key,
    total: item.total,
  })) satisfies ChartDatum[]

  return (
    <PieChartCard
      config={config}
      data={chartData}
      description={description}
      emptyMessage="Nao ha registros suficientes para montar este grafico."
      height={320}
      innerRadius={62}
      nameKey="key"
      showLabels
      showLegend
      title={title}
      totalLabel="3Ps"
      valueKey="total"
    />
  )
}

function buildFilterOptions(rows: ReportRow[]) {
  return {
    area: getUniqueSortedValues(rows.map((row) => row.area)),
    tipo: getUniqueSortedValues(rows.map((row) => row.tipo)),
  } satisfies Record<FilterKey, string[]>
}

function buildReportUrl(dateRange: DateRangeFilter) {
  const params = new URLSearchParams()

  if (dateRange.createdFrom) {
    params.set('data_inicio', dateRange.createdFrom)
  }

  if (dateRange.createdTo) {
    params.set('data_fim', dateRange.createdTo)
  }

  const query = params.toString()

  return query ? `/api/3ps/relatorios/geral?${query}` : '/api/3ps/relatorios/geral'
}

function buildSummary(
  rows: ReportRow[],
  dailySeries: Array<{ change: number | null; count: number; date: string; label: string }>,
) {
  const totalParticipants = rows.reduce((sum, row) => sum + getPeopleForRow(row).length, 0)
  const totalDeviations = rows.reduce((sum, row) => sum + countDeviations(row), 0)
  const validDailyChanges = dailySeries
    .map((item) => item.change)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  const dailyChangesSum = validDailyChanges.reduce((sum, value) => sum + value, 0)
  const days = Math.max(dailySeries.length, 1)

  return {
    averageDailyEvolution:
      validDailyChanges.length > 0 ? dailyChangesSum / validDailyChanges.length : 0,
    averageDeviations: rows.length > 0 ? totalDeviations / rows.length : 0,
    averageParticipants: rows.length > 0 ? totalParticipants / rows.length : 0,
    averageRecordsPerDay: rows.length > 0 ? rows.length / days : 0,
    total3ps: rows.length,
    totalDeviations,
  }
}

function buildGroupedChart(rows: ReportRow[], getLabel: (row: ReportRow) => string) {
  const totals = new Map<string, number>()

  rows.forEach((row) => {
    const label = normalizeLabel(getLabel(row), 'Nao informado')
    totals.set(label, (totals.get(label) || 0) + 1)
  })

  return Array.from(totals.entries())
    .map(([label, total], index) => ({
      key: createChartKey(label, index),
      label,
      total,
    }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, 'pt-BR'))
}

function buildDailySeries(rows: ReportRow[], dateRange: DateRangeFilter) {
  const bounds = getDateBounds(rows, dateRange)

  if (!bounds) {
    return []
  }

  const counts = new Map<string, number>()
  rows.forEach((row) => {
    const key = getDateKeyFromValue(row.createdAt)
    if (key) {
      counts.set(key, (counts.get(key) || 0) + 1)
    }
  })

  const series: Array<{ change: number | null; count: number; date: string; label: string }> = []
  const cursor = new Date(bounds.from)

  while (cursor.getTime() <= bounds.to.getTime()) {
    const key = getLocalDateKey(cursor)
    const count = counts.get(key) || 0
    const previousCount = series.length > 0 ? series[series.length - 1].count : null
    const change =
      previousCount && previousCount > 0 ? ((count - previousCount) / previousCount) * 100 : null

    series.push({
      change,
      count,
      date: key,
      label: formatShortDateKey(key),
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  return series
}

function buildTableRows(rows: ReportRow[], tableMode: TableMode) {
  if (tableMode === 'original') {
    return rows.map((row) => toTableRow(row, row.criadorNome, 'Original', row.id))
  }

  return rows.flatMap((row) =>
    getPeopleForRow(row).map((person, index) =>
      toTableRow(row, person.nome, index === 0 ? 'Criador' : 'Participante', `${row.id}-${person.matricula || index}`),
    ),
  )
}

function toTableRow(row: ReportRow, responsible: string, modeLabel: string, rowKey: string): TableRowData {
  const people = getPeopleForRow(row)
  const participantNames = row.participantes
    .filter((participante) => participante.matricula !== row.criadorMatricula)
    .map((participante) => participante.nome)

  return {
    atividade: row.atividade,
    createdAt: row.createdAt,
    desvios: countDeviations(row),
    id: row.id,
    modeLabel,
    oportunidades: row.oportunidades,
    participantesResumo: participantNames.length > 0 ? participantNames.join(', ') : '-',
    pessoasEnvolvidas: people.length,
    responsavel: responsible || 'Nao informado',
    rowKey,
    source: row,
    tipo: row.tipo,
  }
}

function getPeopleForRow(row: ReportRow) {
  const people = new Map<number | string, { matricula?: number | null; nome: string }>()

  people.set(row.criadorMatricula || `criador-${row.id}`, {
    matricula: row.criadorMatricula,
    nome: row.criadorNome || 'Criador nao informado',
  })

  row.participantes.forEach((participante) => {
    if (participante.matricula === row.criadorMatricula) {
      return
    }

    people.set(participante.matricula, {
      matricula: participante.matricula,
      nome: participante.nome || String(participante.matricula),
    })
  })

  return Array.from(people.values())
}

function countDeviations(row: ReportRow) {
  return BOOLEAN_FIELDS.reduce((total, field) => total + (row[field.key] === false ? 1 : 0), 0)
}

function matchesOptionFilter(value: string, selectedValues: string[]) {
  return selectedValues.length === 0 || selectedValues.includes(normalizeLabel(value, 'Nao informado'))
}

function isWithinCreatedDateRange(createdAt: string | null, dateRange: DateRangeFilter) {
  if (!dateRange.createdFrom && !dateRange.createdTo) {
    return true
  }

  if (!createdAt) {
    return false
  }

  const createdTime = new Date(createdAt).getTime()

  if (Number.isNaN(createdTime)) {
    return false
  }

  if (dateRange.createdFrom) {
    const fromTime = new Date(`${dateRange.createdFrom}T00:00:00`).getTime()
    if (!Number.isNaN(fromTime) && createdTime < fromTime) {
      return false
    }
  }

  if (dateRange.createdTo) {
    const toTime = new Date(`${dateRange.createdTo}T23:59:59.999`).getTime()
    if (!Number.isNaN(toTime) && createdTime > toTime) {
      return false
    }
  }

  return true
}

function getDateBounds(rows: ReportRow[], dateRange: DateRangeFilter) {
  const rowDates = rows
    .map((row) => getDateKeyFromValue(row.createdAt))
    .filter((value): value is string => Boolean(value))
    .sort()
  const fromKey = dateRange.createdFrom || rowDates[0]
  const toKey = dateRange.createdTo || rowDates[rowDates.length - 1]

  if (!fromKey || !toKey) {
    return null
  }

  const from = new Date(`${fromKey}T00:00:00`)
  const to = new Date(`${toKey}T00:00:00`)

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from.getTime() > to.getTime()) {
    return null
  }

  return { from, to }
}

function getDateKeyFromValue(value?: string | null) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return getLocalDateKey(date)
}

function getLocalDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function getCurrentMonthDateRange() {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  return {
    createdFrom: getLocalDateKey(firstDay),
    createdTo: getLocalDateKey(lastDay),
  }
}

function getUniqueSortedValues(values: string[]) {
  return Array.from(new Set(values.map((value) => normalizeLabel(value, 'Nao informado')))).sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  )
}

function createChartKey(label: string, index: number) {
  const normalizedLabel = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return `${normalizedLabel || 'item'}-${index}`
}

function normalizeLabel(value: string, fallback: string) {
  const label = value.trim()

  return label || fallback
}

function formatBoolean(value: boolean | null) {
  if (value === null) return '-'
  return value ? 'Sim' : 'Nao'
}

function formatDate(value?: string | null) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleDateString('pt-BR')
}

function formatTime(value?: string | null) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR')
}

function formatShortDateKey(value: string) {
  const [year, month, day] = value.split('-')
  const date = new Date(Number(year), Number(month) - 1, Number(day))

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })
}

function formatNumber(value: number) {
  return value.toLocaleString('pt-BR')
}

function formatDecimal(value: number) {
  return value.toLocaleString('pt-BR', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  })
}

function formatPercent(value: number) {
  const prefix = value > 0 ? '+' : ''

  return `${prefix}${value.toLocaleString('pt-BR', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  })}%`
}
