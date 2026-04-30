import type { ChartFamily } from '@/components/charts/core'

export const chartFamilySummary: Array<{
  description: string
  family: ChartFamily
  label: string
  total: number
}> = [
  { description: 'Series temporais com preenchimento.', family: 'area', label: 'Area', total: 3 },
  { description: 'Comparacoes por categoria ou periodo.', family: 'bar', label: 'Bar', total: 4 },
  { description: 'Tendencias, evolucao e comparacoes.', family: 'line', label: 'Line', total: 3 },
  { description: 'Distribuicoes proporcionais.', family: 'pie', label: 'Pie', total: 3 },
  { description: 'Comparacao multidimensional.', family: 'radar', label: 'Radar', total: 3 },
  { description: 'Indicadores radiais e progresso.', family: 'radial', label: 'Radial', total: 3 },
  { description: 'Variacoes de tooltip e formatacao.', family: 'tooltip', label: 'Tooltip', total: 3 },
]

export const totalChartExamples = chartFamilySummary.reduce(
  (acc, item) => acc + item.total,
  0,
)
