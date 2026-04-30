'use client'

import type { ComponentType } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  Eye,
  Filter,
  FolderOpen,
  Layers3,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  buildChartConfig,
  CartesianChartCard,
  type ChartDatum,
} from '@/components/charts'
import { MetricCard } from '@/components/reports/MetricCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/hooks/useAuth'

interface OacDeviation {
  categoria: string
  quantidade: number
  subcategoria: string
}

interface OacReportRow {
  area: string
  celula: string
  contrato: string
  contratoCodigo: string
  createdAt: string | null
  dataRegistro: string | null
  desvios: OacDeviation[]
  id: string
  observador: string
  pessoasAbordadas: number
  tempoObservacao: number
}

interface OacReportData {
  generatedAt: string
  rows: OacReportRow[]
}

interface ChartItem {
  key: string
  label: string
  total: number
}

interface FilterOption {
  label: string
  value: string
}

type FilterKey = 'month' | 'year' | 'area' | 'celula' | 'categoria' | 'subcategoria' | 'contrato'

type ReportFilters = Record<FilterKey, string[]>

const EMPTY_FILTERS: ReportFilters = {
  area: [],
  categoria: [],
  celula: [],
  contrato: [],
  month: [],
  subcategoria: [],
  year: [],
}

const FILTER_GROUPS: Array<{
  description: string
  key: FilterKey
  title: string
}> = [
  {
    description: 'Filtra pelo mes da data de registro da observacao.',
    key: 'month',
    title: 'Mes de registro',
  },
  {
    description: 'Filtra pelo ano da data de registro da observacao.',
    key: 'year',
    title: 'Ano de registro',
  },
  {
    description: 'Filtra pelo local da OAC, tratado no relatorio como area.',
    key: 'area',
    title: 'Area',
  },
  {
    description: 'Filtra pela equipe da OAC, tratada no relatorio como celula.',
    key: 'celula',
    title: 'Celula',
  },
  {
    description: 'Filtra OACs que possuem desvios na categoria selecionada.',
    key: 'categoria',
    title: 'Categoria',
  },
  {
    description: 'Filtra OACs que possuem desvios na subcategoria selecionada.',
    key: 'subcategoria',
    title: 'Subcategoria',
  },
  {
    description: 'Filtra pelos contratos que o usuario possui permissao de acesso.',
    key: 'contrato',
    title: 'Contrato',
  },
]

export default function OacRelatoriosPage() {
  useAuth()
  const router = useRouter()
  const [data, setData] = useState<OacReportData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadReport = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/oac/relatorios/geral', {
          method: 'GET',
        })
        const payload = await response.json().catch(() => ({}))

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || payload?.message || 'Erro ao carregar relatorio de OAC')
        }

        setData(payload.data as OacReportData)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao carregar relatorio de OAC'
        setError(message)
        toast.error(message)
      } finally {
        setLoading(false)
      }
    }

    loadReport()
  }, [])

  const rows = useMemo(() => data?.rows || [], [data?.rows])

  const filterOptions = useMemo(() => buildFilterOptions(rows), [rows])

  const activeFiltersCount = useMemo(
    () => Object.values(filters).reduce((total, values) => total + values.length, 0),
    [filters],
  )

  const filteredRows = useMemo(
    () => rows.filter((row) => rowMatchesFilters(row, filters)),
    [filters, rows],
  )

  const filteredDeviationRows = useMemo(
    () => filteredRows.flatMap((row) => getDeviationRowsForFilters(row, filters)),
    [filteredRows, filters],
  )

  const summary = useMemo(() => buildSummary(filteredRows), [filteredRows])

  const charts = useMemo(
    () => ({
      byCategory: buildDeviationChart(filteredDeviationRows, 'categoria'),
      byObserver: buildCountChart(filteredRows, (row) => row.observador || 'Observador nao informado'),
      bySubcategory: buildDeviationChart(filteredDeviationRows, 'subcategoria'),
    }),
    [filteredDeviationRows, filteredRows],
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
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Button variant="outline" onClick={() => router.push('/oac')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao modulo
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Relatorios graficos de OAC
            </h1>
            <p className="max-w-3xl text-gray-600 dark:text-gray-400">
              Visao consolidada das observacoes comportamentais, com volume de registros, tempo medio, pessoas abordadas e distribuicao dos desvios por classificacao.
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
              Use os filtros para recalcular todos os indicadores e graficos com o mesmo recorte de dados.
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
            Dados gerais de OAC
          </h2>
          <p className="max-w-4xl text-sm text-gray-600 dark:text-gray-400">
            Este bloco resume as OACs encontradas nos contratos permitidos, considerando a data de registro, observadores, areas, celulas e classificacoes de desvios.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <MetricCard
            description="Quantidade total de observacoes comportamentais encontradas no recorte selecionado."
            icon={Eye}
            loading={loading}
            title="Total de OACs"
            tone="blue"
            value={formatNumber(summary.totalOacs)}
          />
          <MetricCard
            description="Media do tempo de observacao informado nas OACs filtradas."
            footer="Calculado a partir do campo tempo_observacao."
            icon={Clock}
            loading={loading}
            title="Tempo medio de observacao"
            tone="purple"
            value={formatDuration(summary.averageObservationTime)}
          />
          <MetricCard
            description="Soma das pessoas abordadas nas observacoes do recorte atual."
            icon={Users}
            loading={loading}
            title="Total de pessoas abordadas"
            tone="green"
            value={formatNumber(summary.totalPeopleApproached)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ReportBarChart
            data={charts.byObserver}
            description="Conta quantas OACs cada observador registrou no recorte atual."
            icon={Users}
            title="Total de OACs por observador"
          />
          <ReportBarChart
            data={charts.byCategory}
            description="Soma a quantidade de desvios registrada nas OACs para cada categoria."
            icon={FolderOpen}
            title="Total de desvios por categoria"
          />
          <div className="xl:col-span-2">
            <ReportBarChart
              data={charts.bySubcategory}
              description="Soma a quantidade de desvios registrada nas OACs para cada subcategoria."
              icon={Layers3}
              title="Total de desvios por subcategoria"
            />
          </div>
        </div>
      </section>

      {!loading && rows.length === 0 && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <AlertCircle className="h-10 w-10 text-gray-400" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Nenhuma OAC encontrada
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Nao ha registros de OAC para os contratos disponiveis ao seu usuario.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <ReportFiltersDrawer
        activeFiltersCount={activeFiltersCount}
        filters={filters}
        filterOptions={filterOptions}
        onClear={clearFilters}
        onClose={() => setFiltersOpen(false)}
        onToggle={toggleFilterValue}
        open={filtersOpen}
      />
    </div>
  )
}

function ReportFiltersDrawer({
  activeFiltersCount,
  filters,
  filterOptions,
  onClear,
  onClose,
  onToggle,
  open,
}: {
  activeFiltersCount: number
  filters: ReportFilters
  filterOptions: Record<FilterKey, FilterOption[]>
  onClear: () => void
  onClose: () => void
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
              Selecione um ou mais valores para recalcular os indicadores exibidos.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
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
                        key={`${group.key}-${option.value}`}
                        className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                      >
                        <Checkbox
                          checked={filters[group.key].includes(option.value)}
                          onCheckedChange={() => onToggle(group.key, option.value)}
                        />
                        <span className="leading-5">{option.label}</span>
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
  const chartData = toBarData(data)
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
        config={config}
        data={chartData}
        description={description}
        emptyMessage="Nao ha registros suficientes para montar este grafico."
        height={fixedHeight}
        chartContentHeight={contentHeight}
        chartScrollable={chartData.length > 6}
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

function buildFilterOptions(rows: OacReportRow[]) {
  return {
    area: toFilterOptions(rows.map((row) => row.area)),
    categoria: toFilterOptions(rows.flatMap((row) => row.desvios.map((desvio) => desvio.categoria))),
    celula: toFilterOptions(rows.map((row) => row.celula)),
    contrato: toFilterOptions(rows.map((row) => row.contrato)),
    month: buildMonthOptions(rows),
    subcategoria: toFilterOptions(rows.flatMap((row) => row.desvios.map((desvio) => desvio.subcategoria))),
    year: toFilterOptions(rows.map((row) => getYearValue(row.dataRegistro)).filter(Boolean)),
  } satisfies Record<FilterKey, FilterOption[]>
}

function rowMatchesFilters(row: OacReportRow, filters: ReportFilters) {
  return (
    matchesOptionFilter(row.area, filters.area) &&
    matchesOptionFilter(row.celula, filters.celula) &&
    matchesOptionFilter(row.contrato, filters.contrato) &&
    matchesOptionFilter(getMonthValue(row.dataRegistro), filters.month) &&
    matchesOptionFilter(getYearValue(row.dataRegistro), filters.year) &&
    matchesDeviationFilter(row, 'categoria', filters.categoria) &&
    matchesDeviationFilter(row, 'subcategoria', filters.subcategoria)
  )
}

function matchesOptionFilter(value: string, selectedValues: string[]) {
  return selectedValues.length === 0 || selectedValues.includes(value)
}

function matchesDeviationFilter(
  row: OacReportRow,
  key: 'categoria' | 'subcategoria',
  selectedValues: string[],
) {
  if (selectedValues.length === 0) {
    return true
  }

  return row.desvios.some((desvio) => selectedValues.includes(desvio[key]))
}

function getDeviationRowsForFilters(row: OacReportRow, filters: ReportFilters) {
  return row.desvios.filter((desvio) => {
    const matchesCategory =
      filters.categoria.length === 0 || filters.categoria.includes(desvio.categoria)
    const matchesSubcategory =
      filters.subcategoria.length === 0 || filters.subcategoria.includes(desvio.subcategoria)

    return matchesCategory && matchesSubcategory
  })
}

function buildSummary(rows: OacReportRow[]) {
  const totalObservationTime = rows.reduce((sum, row) => sum + row.tempoObservacao, 0)

  return {
    averageObservationTime: rows.length > 0 ? Math.round(totalObservationTime / rows.length) : 0,
    totalOacs: rows.length,
    totalPeopleApproached: rows.reduce((sum, row) => sum + row.pessoasAbordadas, 0),
  }
}

function buildCountChart(rows: OacReportRow[], getLabel: (row: OacReportRow) => string) {
  const counts = new Map<string, number>()

  rows.forEach((row) => {
    const label = normalizeLabel(getLabel(row), 'Nao informado')
    counts.set(label, (counts.get(label) || 0) + 1)
  })

  return toChartItems(counts)
}

function buildDeviationChart(rows: OacDeviation[], key: 'categoria' | 'subcategoria') {
  const counts = new Map<string, number>()

  rows.forEach((row) => {
    const label = normalizeLabel(row[key], key === 'categoria' ? 'Sem categoria' : 'Sem subcategoria')
    counts.set(label, (counts.get(label) || 0) + row.quantidade)
  })

  return toChartItems(counts)
}

function toFilterOptions(values: string[]) {
  return Array.from(new Set(values.map((value) => normalizeLabel(value, 'Nao informado'))))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    .map((value) => ({
      label: value,
      value,
    }))
}

function buildMonthOptions(rows: OacReportRow[]) {
  const values = new Set<string>()

  rows.forEach((row) => {
    const value = getMonthValue(row.dataRegistro)
    if (value) values.add(value)
  })

  return Array.from(values)
    .sort((a, b) => b.localeCompare(a))
    .map((value) => ({
      label: formatMonthLabel(value),
      value,
    }))
}

function toChartItems(counts: Map<string, number>) {
  return Array.from(counts.entries())
    .map(([label, total], index) => ({
      key: createChartKey(label, index),
      label,
      total,
    }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, 'pt-BR'))
}

function toBarData(data: ChartItem[]) {
  return data.map((item) => ({
    label: item.label,
    total: item.total,
  })) satisfies ChartDatum[]
}

function getMonthValue(value?: string | null) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getYearValue(value?: string | null) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return String(date.getFullYear())
}

function formatMonthLabel(value: string) {
  const [year, month] = value.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  const monthLabel = date.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })

  return monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)
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

function formatNumber(value: number) {
  return value.toLocaleString('pt-BR')
}

function formatDuration(minutes: number) {
  if (!minutes) return '0 min'

  if (minutes < 60) {
    return `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR')
}
