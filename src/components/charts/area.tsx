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

const areaChartConfig = buildChartConfig([
  { key: 'desktop', label: 'Desktop' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'tablet', label: 'Tablet' },
])

const ChartAreaDefault = createExampleComponent('ChartAreaDefault', CartesianChartCard, {
  categoryKey: 'month',
  config: areaChartConfig,
  data: demoMonthlyData,
  description: 'Area simples para acompanhar uma serie ao longo do tempo.',
  series: [{ key: 'desktop', type: 'area' }],
  title: 'Area default',
  xAxisTickFormatter: formatShortMonth,
} satisfies CartesianChartCardProps)

const ChartAreaGradient = createExampleComponent('ChartAreaGradient', CartesianChartCard, {
  categoryKey: 'month',
  config: areaChartConfig,
  data: demoMonthlyData,
  description: 'Area com gradiente controlado pelo ChartConfig.',
  series: [{ key: 'mobile', gradient: true, type: 'area' }],
  title: 'Area gradient',
  xAxisTickFormatter: formatShortMonth,
} satisfies CartesianChartCardProps)

const ChartAreaStacked = createExampleComponent('ChartAreaStacked', CartesianChartCard, {
  categoryKey: 'month',
  config: areaChartConfig,
  data: demoMonthlyData,
  description: 'Multiplas series empilhadas para volume acumulado.',
  series: [
    { key: 'desktop', gradient: true, stackId: 'visits', type: 'area' },
    { key: 'mobile', gradient: true, stackId: 'visits', type: 'area' },
    { key: 'tablet', gradient: true, stackId: 'visits', type: 'area' },
  ],
  showLegend: true,
  title: 'Area stacked',
  xAxisTickFormatter: formatShortMonth,
} satisfies CartesianChartCardProps)

export const areaChartsCatalog: ChartCatalogItem[] = [
  createAreaCatalogItem('chart-area-default', 'Area default', 'Area simples para serie unica.', 'ChartAreaDefault', ChartAreaDefault),
  createAreaCatalogItem('chart-area-gradient', 'Area gradient', 'Area com preenchimento em gradiente.', 'ChartAreaGradient', ChartAreaGradient),
  createAreaCatalogItem('chart-area-stacked', 'Area stacked', 'Areas empilhadas com legenda.', 'ChartAreaStacked', ChartAreaStacked),
]

function createAreaCatalogItem(
  slug: string,
  title: string,
  description: string,
  componentName: string,
  Component: ComponentType<Record<string, unknown>>,
) {
  return createChartCatalogItem(slug, 'area', title, description, componentName, Component)
}

export { ChartAreaDefault, ChartAreaGradient, ChartAreaStacked }
