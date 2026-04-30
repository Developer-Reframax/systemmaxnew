'use client'

import type { ComponentType } from 'react'

import {
  buildChartConfig,
  type ChartCatalogItem,
  createChartCatalogItem,
  createExampleComponent,
  demoPieData,
  PieChartCard,
  type PieChartCardProps,
} from '@/components/charts/core'

const pieChartConfig = buildChartConfig([
  { key: 'concluidos', label: 'Concluidos' },
  { key: 'andamento', label: 'Em andamento' },
  { key: 'pendentes', label: 'Pendentes' },
  { key: 'atrasados', label: 'Atrasados' },
  { key: 'value', label: 'Total' },
])

const ChartPieDefault = createExampleComponent('ChartPieDefault', PieChartCard, {
  config: pieChartConfig,
  data: demoPieData,
  description: 'Pizza simples para distribuicao proporcional.',
  nameKey: 'name',
  showLegend: true,
  title: 'Pie default',
  valueKey: 'value',
} satisfies PieChartCardProps)

const ChartPieDonut = createExampleComponent('ChartPieDonut', PieChartCard, {
  config: pieChartConfig,
  data: demoPieData,
  description: 'Donut com total central calculado pelos dados.',
  innerRadius: 62,
  nameKey: 'name',
  showLegend: true,
  title: 'Pie donut',
  totalLabel: 'Itens',
  valueKey: 'value',
} satisfies PieChartCardProps)

const ChartPieLabels = createExampleComponent('ChartPieLabels', PieChartCard, {
  config: pieChartConfig,
  data: demoPieData,
  description: 'Pizza com labels renderizados em cada fatia.',
  nameKey: 'name',
  showLabels: true,
  title: 'Pie labels',
  valueKey: 'value',
} satisfies PieChartCardProps)

export const pieChartsCatalog: ChartCatalogItem[] = [
  createPieCatalogItem('chart-pie-default', 'Pie default', 'Distribuicao proporcional simples.', 'ChartPieDefault', ChartPieDefault),
  createPieCatalogItem('chart-pie-donut', 'Pie donut', 'Donut com total central dinamico.', 'ChartPieDonut', ChartPieDonut),
  createPieCatalogItem('chart-pie-labels', 'Pie labels', 'Pizza com labels por fatia.', 'ChartPieLabels', ChartPieLabels),
]

function createPieCatalogItem(
  slug: string,
  title: string,
  description: string,
  componentName: string,
  Component: ComponentType<Record<string, unknown>>,
) {
  return createChartCatalogItem(slug, 'pie', title, description, componentName, Component)
}

export { ChartPieDefault, ChartPieDonut, ChartPieLabels }
