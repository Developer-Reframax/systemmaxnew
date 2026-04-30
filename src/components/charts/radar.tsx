'use client'

import type { ComponentType } from 'react'

import {
  buildChartConfig,
  type ChartCatalogItem,
  createChartCatalogItem,
  createExampleComponent,
  demoRadarData,
  RadarChartCard,
  type RadarChartCardProps,
} from '@/components/charts/core'

const radarChartConfig = buildChartConfig([
  { key: 'atual', label: 'Atual' },
  { key: 'anterior', label: 'Anterior' },
])

const ChartRadarDefault = createExampleComponent('ChartRadarDefault', RadarChartCard, {
  categoryKey: 'area',
  config: radarChartConfig,
  data: demoRadarData,
  description: 'Radar simples para comparar dimensoes de desempenho.',
  series: [{ key: 'atual' }],
  title: 'Radar default',
} satisfies RadarChartCardProps)

const ChartRadarMultiple = createExampleComponent('ChartRadarMultiple', RadarChartCard, {
  categoryKey: 'area',
  config: radarChartConfig,
  data: demoRadarData,
  description: 'Radar com duas series para comparacao temporal.',
  series: [
    { key: 'atual' },
    { key: 'anterior' },
  ],
  showLegend: true,
  title: 'Radar multiple',
} satisfies RadarChartCardProps)

const ChartRadarNoGrid = createExampleComponent('ChartRadarNoGrid', RadarChartCard, {
  categoryKey: 'area',
  config: radarChartConfig,
  data: demoRadarData,
  description: 'Radar sem grid para visual mais limpo.',
  series: [{ key: 'atual', fillOpacity: 0.3 }],
  showGrid: false,
  title: 'Radar no grid',
} satisfies RadarChartCardProps)

export const radarChartsCatalog: ChartCatalogItem[] = [
  createRadarCatalogItem('chart-radar-default', 'Radar default', 'Radar simples para dimensoes.', 'ChartRadarDefault', ChartRadarDefault),
  createRadarCatalogItem('chart-radar-multiple', 'Radar multiple', 'Radar com multiplas series.', 'ChartRadarMultiple', ChartRadarMultiple),
  createRadarCatalogItem('chart-radar-no-grid', 'Radar no grid', 'Radar sem grid radial.', 'ChartRadarNoGrid', ChartRadarNoGrid),
]

function createRadarCatalogItem(
  slug: string,
  title: string,
  description: string,
  componentName: string,
  Component: ComponentType<Record<string, unknown>>,
) {
  return createChartCatalogItem(slug, 'radar', title, description, componentName, Component)
}

export { ChartRadarDefault, ChartRadarMultiple, ChartRadarNoGrid }
