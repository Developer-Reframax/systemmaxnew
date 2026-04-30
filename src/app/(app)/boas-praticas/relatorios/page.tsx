'use client'

import type { ComponentType } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Download,
  Eye,
  Filter,
  FolderOpen,
  Layers3,
  Lightbulb,
  Search,
  Star,
  Tags,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  buildChartConfig,
  CartesianChartCard,
  type ChartDatum,
  PieChartCard,
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
import { usePermissions } from '@/contexts/PermissionsContext'
import { useAuth } from '@/hooks/useAuth'

const BOASPRATICAS_MODULE_SLUG = 'boas_praticas'
const BOASPRATICAS_GESTAO_GERAL_SLUG = 'boaspraticas-gestao-geral'

interface ChartItem {
  key: string
  label: string
  total: number
}

interface ReportRow {
  areaAplicada: string
  cadastrante: string
  categoria: string
  comentarioValidacao: string | null
  contrato: string
  createdAt: string | null
  dataImplantacao: string | null
  descricao: string | null
  descricaoProblema: string | null
  eliminaDesperdicio: string
  eliminada: boolean
  envolvidos: string[]
  fabricouDispositivo: boolean
  geral: boolean
  id: string
  likes: number
  objetivo: string | null
  pilar: string
  projeto: string | null
  relevancia: number | null
  responsavelEtapa: string
  resultados: string | null
  status: string
  tags: string[]
  titulo: string
  updatedAt: string | null
  validacao: boolean | null
  visualizacoes: number
}

interface ReportData {
  charts: {
    byAppliedArea: ChartItem[]
    byCategory: ChartItem[]
    byLocal: ChartItem[]
    byPillar: ChartItem[]
    byStatus: ChartItem[]
  }
  generatedAt: string
  rows: ReportRow[]
  summary: {
    averageRelevance: number | null
    distinctParticipants: number
    totalPractices: number
  }
}

type FilterKey = 'contrato' | 'status' | 'categoria' | 'areaAplicada' | 'pilar'

type ReportFilters = Record<FilterKey, string[]>

const EMPTY_FILTERS: ReportFilters = {
  areaAplicada: [],
  categoria: [],
  contrato: [],
  pilar: [],
  status: [],
}

const FILTER_GROUPS: Array<{
  description: string
  key: FilterKey
  title: string
}> = [
  {
    description: 'Filtra os dados pelo contrato/local vinculado a cada boa pratica.',
    key: 'contrato',
    title: 'Local',
  },
  {
    description: 'Filtra os dados pela etapa atual do fluxo de avaliacao.',
    key: 'status',
    title: 'Status',
  },
  {
    description: 'Filtra os dados pela categoria cadastrada no catalogo.',
    key: 'categoria',
    title: 'Categoria',
  },
  {
    description: 'Filtra os dados pela area onde a pratica foi aplicada.',
    key: 'areaAplicada',
    title: 'Area aplicada',
  },
  {
    description: 'Filtra os dados pelo pilar associado ao cadastro.',
    key: 'pilar',
    title: 'Pilar',
  },
]

export default function BoasPraticasRelatoriosPage() {
  useAuth()
  const router = useRouter()
  const { canAccessFuncionalidade, loading: permissionsLoading } = usePermissions()
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_FILTERS)
  const [search, setSearch] = useState('')

  const hasAccess = canAccessFuncionalidade(
    BOASPRATICAS_MODULE_SLUG,
    BOASPRATICAS_GESTAO_GERAL_SLUG,
  )

  useEffect(() => {
    if (permissionsLoading) return
    if (!hasAccess) {
      setLoading(false)
      return
    }

    const loadReport = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/boas-praticas/relatorios/geral', {
          method: 'GET',
        })
        const payload = await response.json().catch(() => ({}))

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'Erro ao carregar o relatorio')
        }

        setData(payload.data as ReportData)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao carregar o relatorio'
        setError(message)
        toast.error(message)
      } finally {
        setLoading(false)
      }
    }

    loadReport()
  }, [hasAccess, permissionsLoading])

  const filterOptions = useMemo(() => {
    const rows = data?.rows || []

    return FILTER_GROUPS.reduce<Record<FilterKey, string[]>>(
      (acc, group) => {
        acc[group.key] = getUniqueSortedValues(rows.map((row) => row[group.key]))
        return acc
      },
      {
        areaAplicada: [],
        categoria: [],
        contrato: [],
        pilar: [],
        status: [],
      },
    )
  }, [data?.rows])

  const activeFiltersCount = useMemo(
    () => Object.values(filters).reduce((total, values) => total + values.length, 0),
    [filters],
  )

  const filteredReportRows = useMemo(() => {
    const rows = data?.rows || []

    return rows.filter((row) =>
      FILTER_GROUPS.every((group) => {
        const selectedValues = filters[group.key]

        return selectedValues.length === 0 || selectedValues.includes(row[group.key])
      }),
    )
  }, [data?.rows, filters])

  const filteredSummary = useMemo(() => buildSummary(filteredReportRows), [filteredReportRows])

  const filteredCharts = useMemo(
    () => ({
      byAppliedArea: buildGroupedChart(filteredReportRows, 'areaAplicada'),
      byCategory: buildGroupedChart(filteredReportRows, 'categoria'),
      byLocal: buildGroupedChart(filteredReportRows, 'contrato'),
      byPillar: buildGroupedChart(filteredReportRows, 'pilar'),
      byStatus: buildGroupedChart(filteredReportRows, 'status'),
    }),
    [filteredReportRows],
  )

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    const rows = filteredReportRows

    if (!term) return rows

    return rows.filter((row) =>
      [
        row.titulo,
        row.status,
        row.contrato,
        row.categoria,
        row.areaAplicada,
        row.pilar,
        row.cadastrante,
        row.responsavelEtapa,
        row.tags.join(' '),
      ]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [filteredReportRows, search])

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

  const exportTableToExcel = async () => {
    if (filteredRows.length === 0) {
      toast.warning('Nao ha dados na tabela para exportar.')
      return
    }

    try {
      const ExcelJS = await import('exceljs')
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Boas Praticas')

      worksheet.columns = [
        { header: 'Boa pratica', key: 'titulo', width: 36 },
        { header: 'Descricao exibida', key: 'descricao', width: 48 },
        { header: 'Status', key: 'status', width: 28 },
        { header: 'Local', key: 'contrato', width: 28 },
        { header: 'Categoria', key: 'categoria', width: 26 },
        { header: 'Area aplicada', key: 'areaAplicada', width: 26 },
        { header: 'Pilar', key: 'pilar', width: 26 },
        { header: 'Cadastrante', key: 'cadastrante', width: 28 },
        { header: 'Relevancia', key: 'relevancia', width: 14 },
        { header: 'Data de implantacao', key: 'dataImplantacao', width: 20 },
        { header: 'Elimina desperdicio', key: 'eliminaDesperdicio', width: 28 },
        { header: 'Tags', key: 'tags', width: 36 },
        { header: 'Visualizacoes', key: 'visualizacoes', width: 16 },
        { header: 'Likes', key: 'likes', width: 12 },
      ]

      filteredRows.forEach((row) => {
        worksheet.addRow({
          areaAplicada: row.areaAplicada,
          cadastrante: row.cadastrante,
          categoria: row.categoria,
          contrato: row.contrato,
          dataImplantacao: formatDate(row.dataImplantacao),
          descricao: row.descricao || row.descricaoProblema || row.objetivo || 'Sem descricao informada.',
          eliminaDesperdicio: row.eliminaDesperdicio,
          likes: row.likes,
          pilar: row.pilar,
          relevancia: row.relevancia ?? '-',
          status: row.status,
          tags: row.tags.length > 0 ? row.tags.join(', ') : 'Sem tags',
          titulo: row.titulo,
          visualizacoes: row.visualizacoes,
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
      link.download = `boas_praticas_relatorio_${timestamp}.xlsx`
      link.click()
      window.URL.revokeObjectURL(url)

      toast.success('Tabela exportada para Excel com sucesso.')
    } catch (err) {
      console.error('Erro ao exportar tabela de boas praticas:', err)
      toast.error('Nao foi possivel exportar a tabela para Excel.')
    }
  }

  if (!permissionsLoading && !hasAccess) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <Button variant="outline" onClick={() => router.push('/boas-praticas')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao modulo
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Acesso negado ao relatorio
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Para visualizar os relatorios graficos de Boas Praticas, seu usuario precisa da funcionalidade boaspraticas-gestao-geral.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Button variant="outline" onClick={() => router.push('/boas-praticas')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao modulo
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Relatorios graficos de Boas Praticas
            </h1>
            <p className="max-w-3xl text-gray-600 dark:text-gray-400">
              Visao corporativa para acompanhar volume de boas praticas, pessoas participantes e distribuicao dos registros por classificacoes importantes do modulo.
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
              Use os filtros para recalcular os cards, graficos e a tabela com o mesmo recorte de dados.
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

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Dados gerais de boas praticas
          </h2>
          <p className="max-w-4xl text-sm text-gray-600 dark:text-gray-400">
            Este bloco consolida todas as boas praticas cadastradas, as pessoas unicas que participaram dos registros e a distribuicao por local, status, categoria, area aplicada e pilar.
          </p>
        </div>

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

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <MetricCard
            description="Quantidade total de registros de boas praticas encontrados no modulo."
            icon={Lightbulb}
            loading={loading}
            title="Total de boas praticas cadastradas"
            tone="yellow"
            value={formatNumber(filteredSummary.totalPractices)}
          />
          <MetricCard
            description="Pessoas unicas que cadastraram ou foram vinculadas como envolvidas em alguma boa pratica."
            icon={Users}
            loading={loading}
            title="Participantes distintos"
            tone="green"
            value={formatNumber(filteredSummary.distinctParticipants)}
          />
          <MetricCard
            description="Media das notas de relevancia informadas nas boas praticas que possuem avaliacao."
            footer="Quando nao houver notas de relevancia, o indicador fica sem valor calculado."
            icon={Star}
            loading={loading}
            title="Relevancia media"
            tone="purple"
            value={filteredSummary.averageRelevance ?? '-'}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ReportBarChart
            data={filteredCharts.byLocal}
            description="Agrupa as boas praticas pelo contrato vinculado ao registro e exibe o nome do contrato como local."
            icon={Building2}
            title="Quantidade de boas praticas por local"
          />
          <ReportPieChart
            data={filteredCharts.byStatus}
            description="Mostra em qual etapa do fluxo as boas praticas estao concentradas."
            title="Quantidade de boas praticas por status"
          />
          <ReportBarChart
            data={filteredCharts.byCategory}
            description="Agrupa os registros pelo nome da categoria cadastrada no catalogo de Boas Praticas."
            icon={FolderOpen}
            title="Quantidade de boas praticas por categoria"
          />
          <ReportBarChart
            data={filteredCharts.byAppliedArea}
            description="Mostra onde as boas praticas foram aplicadas, usando o nome da area aplicada ou o texto informado no cadastro."
            icon={Tags}
            title="Quantidade de boas praticas por area aplicada"
          />
          <div className="xl:col-span-2">
            <ReportBarChart
              data={filteredCharts.byPillar}
              description="Distribui as boas praticas conforme o pilar selecionado no cadastro, ajudando a identificar temas mais recorrentes."
              icon={Layers3}
              title="Quantidade de boas praticas por pilar"
            />
          </div>
        </div>
      </section>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Lista detalhada de boas praticas</CardTitle>
              <CardDescription className="max-w-3xl">
                Tabela com todas as boas praticas do relatorio. Os campos de referencia sao exibidos por nome, nao por ID, para facilitar a leitura e a conferencia dos dados.
              </CardDescription>
            </div>
            <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
              <div className="flex w-full items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 lg:w-96 dark:border-gray-700 dark:bg-gray-900">
                <Search className="h-4 w-4 text-gray-500" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por titulo, status, local, categoria ou pessoa"
                  className="border-0 p-0 focus-visible:ring-0"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={exportTableToExcel}
                disabled={loading || filteredRows.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar Excel
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Exibindo {filteredRows.length} de {filteredReportRows.length} registros filtrados. Total carregado: {data?.rows.length || 0}.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-12 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              Nenhuma boa pratica encontrada para a busca informada.
            </div>
          ) : (
            <div className="max-h-[560px] overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <Table className="min-w-[1320px]">
              <TableHeader className="bg-blue-50 dark:bg-blue-950 [&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-blue-50 dark:[&_th]:bg-blue-950">
                <TableRow className="hover:bg-blue-50 dark:hover:bg-blue-950">
                  <TableHead className="min-w-[220px]">Boa pratica</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Area aplicada</TableHead>
                  <TableHead>Pilar</TableHead>
                  <TableHead>Cadastrante</TableHead>
                  <TableHead>Relevancia</TableHead>
                  <TableHead>Data de implantacao</TableHead>
                  <TableHead>Elimina desperdicio</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Indicadores</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-[280px]">
                      <div className="space-y-1">
                        <p className="font-medium text-gray-900 dark:text-white">{row.titulo}</p>
                        <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                          {row.descricao || row.descricaoProblema || row.objetivo || 'Sem descricao informada.'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{row.status}</Badge>
                    </TableCell>
                    <TableCell>{row.contrato}</TableCell>
                    <TableCell>{row.categoria}</TableCell>
                    <TableCell>{row.areaAplicada}</TableCell>
                    <TableCell>{row.pilar}</TableCell>
                    <TableCell>{row.cadastrante}</TableCell>
                    <TableCell>{row.relevancia ?? '-'}</TableCell>
                    <TableCell>{formatDate(row.dataImplantacao)}</TableCell>
                    <TableCell>{row.eliminaDesperdicio}</TableCell>
                    <TableCell className="min-w-[180px]">
                      {row.tags.length > 0 ? row.tags.join(', ') : 'Sem tags'}
                    </TableCell>
                    <TableCell className="min-w-[160px] text-xs text-gray-600 dark:text-gray-300">
                      Views: {row.visualizacoes} | Likes: {row.likes}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/boas-praticas/${row.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
  filterOptions: Record<FilterKey, string[]>
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
              Selecione um ou mais valores para recalcular todos os indicadores exibidos.
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
      totalLabel="Praticas"
      valueKey="total"
    />
  )
}

function toBarData(data: ChartItem[]) {
  return data.map((item) => ({
    label: item.label,
    total: item.total,
  })) satisfies ChartDatum[]
}

function buildSummary(rows: ReportRow[]) {
  const relevantRows = rows.filter((row) => typeof row.relevancia === 'number')
  const relevanceSum = relevantRows.reduce((sum, row) => sum + (row.relevancia || 0), 0)
  const participants = new Set<string>()

  rows.forEach((row) => {
    addParticipant(participants, row.cadastrante)
    row.envolvidos.forEach((envolvido) => addParticipant(participants, envolvido))
  })

  return {
    averageRelevance:
      relevantRows.length > 0 ? Number((relevanceSum / relevantRows.length).toFixed(1)) : null,
    distinctParticipants: participants.size,
    totalPractices: rows.length,
  }
}

function addParticipant(participants: Set<string>, value: string) {
  const participant = value.trim()

  if (participant && participant !== '-') {
    participants.add(participant)
  }
}

function buildGroupedChart(rows: ReportRow[], key: FilterKey) {
  const totals = new Map<string, number>()

  rows.forEach((row) => {
    const label = normalizeGroupLabel(row[key])
    totals.set(label, (totals.get(label) || 0) + 1)
  })

  return Array.from(totals.entries())
    .map(([label, total], index) => ({
      key: createChartKey(label, index),
      label,
      total,
    }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
}

function getUniqueSortedValues(values: string[]) {
  return Array.from(new Set(values.map(normalizeGroupLabel))).sort((a, b) => a.localeCompare(b))
}

function normalizeGroupLabel(value: string) {
  const label = value.trim()

  return label || 'Nao informado'
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

function formatNumber(value?: number | null) {
  if (value === null || value === undefined) {
    return '-'
  }

  return value.toLocaleString('pt-BR')
}

function formatDate(value?: string | null) {
  if (!value) return '-'

  return new Date(value).toLocaleDateString('pt-BR')
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR')
}
