'use client'

import type { ComponentType } from 'react'

import {
  buildChartConfig,
  type ChartCatalogItem,
  createChartCatalogItem,
  createExampleComponent,
  demoRadialData,
  RadialChartCard,
  type RadialChartCardProps,
} from '@/components/charts/core'

const radialChartConfig = buildChartConfig([
  { key: 'apto', label: 'Apto' },
  { key: 'alerta', label: 'Alerta' },
  { key: 'risco', label: 'Risco' },
  { key: 'value', label: 'Score' },
])

const ChartRadialDefault = createExampleComponent('ChartRadialDefault', RadialChartCard, {
  config: radialChartConfig,
  data: demoRadialData,
  description: 'Radial bar para progresso por categoria.',
  nameKey: 'name',
  title: 'Radial default',
  valueKey: 'value',
} satisfies RadialChartCardProps)

const ChartRadialGauge = createExampleComponent('ChartRadialGauge', RadialChartCard, {
  config: radialChartConfig,
  data: [{ name: 'apto', value: 78 }],
  description: 'Gauge radial para um indicador unico.',
  endAngle: -180,
  innerRadius: 72,
  nameKey: 'name',
  outerRadius: 108,
  showLabels: false,
  startAngle: 180,
  title: 'Radial gauge',
  valueKey: 'value',
} satisfies RadialChartCardProps)

const ChartRadialStacked = createExampleComponent('ChartRadialStacked', RadialChartCard, {
  config: radialChartConfig,
  data: demoRadialData,
  description: 'Radiais multiplos para leitura comparativa compacta.',
  innerRadius: 36,
  nameKey: 'name',
  outerRadius: 112,
  title: 'Radial stacked',
  valueKey: 'value',
} satisfies RadialChartCardProps)

export const radialChartsCatalog: ChartCatalogItem[] = [
  createRadialCatalogItem('chart-radial-default', 'Radial default', 'Radial bar por categoria.', 'ChartRadialDefault', ChartRadialDefault),
  createRadialCatalogItem('chart-radial-gauge', 'Radial gauge', 'Gauge radial de indicador unico.', 'ChartRadialGauge', ChartRadialGauge),
  createRadialCatalogItem('chart-radial-stacked', 'Radial stacked', 'Radiais multiplos comparativos.', 'ChartRadialStacked', ChartRadialStacked),
]

function createRadialCatalogItem(
  slug: string,
  title: string,
  description: string,
  componentName: string,
  Component: ComponentType<Record<string, unknown>>,
) {
  return createChartCatalogItem(slug, 'radial', title, description, componentName, Component)
}

export { ChartRadialDefault, ChartRadialGauge, ChartRadialStacked }
