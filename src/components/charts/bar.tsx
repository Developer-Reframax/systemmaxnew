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

const barChartConfig = buildChartConfig([
  { key: 'desktop', label: 'Desktop' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'tablet', label: 'Tablet' },
])

const ChartBarDefault = createExampleComponent('ChartBarDefault', CartesianChartCard, {
  categoryKey: 'month',
  config: barChartConfig,
  data: demoMonthlyData,
  description: 'Barras simples para comparar valores por periodo.',
  series: [{ key: 'desktop', radius: [6, 6, 0, 0], type: 'bar' }],
  title: 'Bar default',
  xAxisTickFormatter: formatShortMonth,
} satisfies CartesianChartCardProps)

const ChartBarMultiple = createExampleComponent('ChartBarMultiple', CartesianChartCard, {
  categoryKey: 'month',
  config: barChartConfig,
  data: demoMonthlyData,
  description: 'Barras lado a lado para comparacao entre canais.',
  series: [
    { key: 'desktop', radius: [6, 6, 0, 0], type: 'bar' },
    { key: 'mobile', radius: [6, 6, 0, 0], type: 'bar' },
  ],
  showLegend: true,
  title: 'Bar multiple',
  xAxisTickFormatter: formatShortMonth,
} satisfies CartesianChartCardProps)

const ChartBarHorizontal = createExampleComponent('ChartBarHorizontal', CartesianChartCard, {
  categoryKey: 'month',
  config: barChartConfig,
  data: demoMonthlyData,
  description: 'Barras horizontais para categorias com nomes maiores.',
  layout: 'vertical',
  series: [{ key: 'desktop', radius: [0, 6, 6, 0], type: 'bar' }],
  title: 'Bar horizontal',
} satisfies CartesianChartCardProps)

const ChartBarEmpty = createExampleComponent('ChartBarEmpty', CartesianChartCard, {
  categoryKey: 'month',
  config: barChartConfig,
  data: [],
  description: 'Estado vazio padronizado para relatorios sem retorno.',
  emptyMessage: 'Sem dados para o periodo selecionado.',
  series: [{ key: 'desktop', radius: [6, 6, 0, 0], type: 'bar' }],
  title: 'Bar empty state',
} satisfies CartesianChartCardProps)

export const barChartsCatalog: ChartCatalogItem[] = [
  createBarCatalogItem('chart-bar-default', 'Bar default', 'Barras simples para serie unica.', 'ChartBarDefault', ChartBarDefault),
  createBarCatalogItem('chart-bar-multiple', 'Bar multiple', 'Barras lado a lado com legenda.', 'ChartBarMultiple', ChartBarMultiple),
  createBarCatalogItem('chart-bar-horizontal', 'Bar horizontal', 'Barras horizontais para categorias.', 'ChartBarHorizontal', ChartBarHorizontal),
  createBarCatalogItem('chart-bar-empty', 'Bar empty state', 'Exemplo do estado vazio padrao.', 'ChartBarEmpty', ChartBarEmpty),
]

function createBarCatalogItem(
  slug: string,
  title: string,
  description: string,
  componentName: string,
  Component: ComponentType<Record<string, unknown>>,
) {
  return createChartCatalogItem(slug, 'bar', title, description, componentName, Component)
}

export { ChartBarDefault, ChartBarEmpty, ChartBarHorizontal, ChartBarMultiple }
