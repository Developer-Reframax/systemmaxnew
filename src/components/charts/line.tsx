'use client'

import type { ComponentType } from 'react'

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

const lineChartConfig = buildChartConfig([
  { key: 'desktop', label: 'Desktop' },
  { key: 'mobile', label: 'Mobile' },
])

const ChartLineDefault = createExampleComponent('ChartLineDefault', CartesianChartCard, {
  categoryKey: 'month',
  config: lineChartConfig,
  data: demoMonthlyData,
  description: 'Linha simples para tendencia temporal.',
  series: [{ key: 'desktop', type: 'line' }],
  title: 'Line default',
  xAxisTickFormatter: formatShortMonth,
} satisfies CartesianChartCardProps)

const ChartLineMultiple = createExampleComponent('ChartLineMultiple', CartesianChartCard, {
  categoryKey: 'month',
  config: lineChartConfig,
  data: demoMonthlyData,
  description: 'Multiplas linhas para comparacao entre series.',
  series: [
    { key: 'desktop', type: 'line' },
    { key: 'mobile', type: 'line' },
  ],
  showLegend: true,
  title: 'Line multiple',
  xAxisTickFormatter: formatShortMonth,
} satisfies CartesianChartCardProps)

const ChartLineDots = createExampleComponent('ChartLineDots', CartesianChartCard, {
  categoryKey: 'month',
  config: lineChartConfig,
  data: demoMonthlyData,
  description: 'Linha com pontos para destacar cada observacao.',
  series: [{ key: 'desktop', showDot: true, type: 'line' }],
  title: 'Line dots',
  xAxisTickFormatter: formatShortMonth,
} satisfies CartesianChartCardProps)

export const lineChartsCatalog: ChartCatalogItem[] = [
  createLineCatalogItem('chart-line-default', 'Line default', 'Linha simples para serie unica.', 'ChartLineDefault', ChartLineDefault),
  createLineCatalogItem('chart-line-multiple', 'Line multiple', 'Linhas multiplas com legenda.', 'ChartLineMultiple', ChartLineMultiple),
  createLineCatalogItem('chart-line-dots', 'Line dots', 'Linha com marcadores por ponto.', 'ChartLineDots', ChartLineDots),
]

function createLineCatalogItem(
  slug: string,
  title: string,
  description: string,
  componentName: string,
  Component: ComponentType<Record<string, unknown>>,
) {
  return createChartCatalogItem(slug, 'line', title, description, componentName, Component)
}

export { ChartLineDefault, ChartLineDots, ChartLineMultiple }
