'use client'

import type { ComponentType, ReactNode } from 'react'

import {
  buildChartConfig,
  CartesianChartCard,
  type CartesianChartCardProps,
  type ChartCatalogItem,
  createChartCatalogItem,
  createExampleComponent,
  demoMonthlyData,
  formatShortMonth,
} from '@/components/charts/core'

const tooltipChartConfig = buildChartConfig([
  { key: 'desktop', label: 'Desktop' },
  { key: 'mobile', label: 'Mobile' },
])

const ChartTooltipDefault = createExampleComponent('ChartTooltipDefault', CartesianChartCard, {
  categoryKey: 'month',
  config: tooltipChartConfig,
  data: demoMonthlyData,
  description: 'Tooltip padrao com indicador em ponto.',
  series: [{ key: 'desktop', radius: [6, 6, 0, 0], type: 'bar' }],
  title: 'Tooltip default',
  tooltipIndicator: 'dot',
  xAxisTickFormatter: formatShortMonth,
} satisfies CartesianChartCardProps)

const ChartTooltipLine = createExampleComponent('ChartTooltipLine', CartesianChartCard, {
  categoryKey: 'month',
  config: tooltipChartConfig,
  data: demoMonthlyData,
  description: 'Tooltip com indicador em linha para series temporais.',
  series: [{ key: 'desktop', type: 'line' }],
  title: 'Tooltip line',
  tooltipIndicator: 'line',
  xAxisTickFormatter: formatShortMonth,
} satisfies CartesianChartCardProps)

const ChartTooltipFormatter = createExampleComponent('ChartTooltipFormatter', CartesianChartCard, {
  categoryKey: 'month',
  config: tooltipChartConfig,
  data: demoMonthlyData,
  description: 'Tooltip com formatador de valor injetado por props.',
  series: [
    { key: 'desktop', radius: [6, 6, 0, 0], type: 'bar' },
    { key: 'mobile', radius: [6, 6, 0, 0], type: 'bar' },
  ],
  showLegend: true,
  title: 'Tooltip formatter',
  tooltipValueFormatter: (value: ReactNode, name: string | number | undefined) => (
    <div className="flex min-w-[140px] items-center justify-between gap-4">
      <span className="text-muted-foreground">{name}</span>
      <span className="font-mono font-medium">{Number(value).toLocaleString('pt-BR')} visitas</span>
    </div>
  ),
  xAxisTickFormatter: formatShortMonth,
} satisfies CartesianChartCardProps)

export const tooltipChartsCatalog: ChartCatalogItem[] = [
  createTooltipCatalogItem('chart-tooltip-default', 'Tooltip default', 'Tooltip padrao com indicador dot.', 'ChartTooltipDefault', ChartTooltipDefault),
  createTooltipCatalogItem('chart-tooltip-line', 'Tooltip line', 'Tooltip com indicador em linha.', 'ChartTooltipLine', ChartTooltipLine),
  createTooltipCatalogItem('chart-tooltip-formatter', 'Tooltip formatter', 'Tooltip com formatador customizado.', 'ChartTooltipFormatter', ChartTooltipFormatter),
]

function createTooltipCatalogItem(
  slug: string,
  title: string,
  description: string,
  componentName: string,
  Component: ComponentType<Record<string, unknown>>,
) {
  return createChartCatalogItem(slug, 'tooltip', title, description, componentName, Component)
}

export { ChartTooltipDefault, ChartTooltipFormatter, ChartTooltipLine }
