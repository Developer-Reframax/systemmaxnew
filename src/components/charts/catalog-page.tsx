'use client'

import dynamic from 'next/dynamic'
import { BarChart3, Boxes, Layers3 } from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  chartFamilySummary,
  totalChartExamples,
} from '@/components/charts/catalog-meta'
import type { ChartFamily } from '@/components/charts/core'
import { cn } from '@/lib/utils'

const familyLoaders = {
  area: dynamic(() => import('@/components/charts/catalog-area'), {
    loading: () => <ChartFamilyLoading />,
  }),
  bar: dynamic(() => import('@/components/charts/catalog-bar'), {
    loading: () => <ChartFamilyLoading />,
  }),
  line: dynamic(() => import('@/components/charts/catalog-line'), {
    loading: () => <ChartFamilyLoading />,
  }),
  pie: dynamic(() => import('@/components/charts/catalog-pie'), {
    loading: () => <ChartFamilyLoading />,
  }),
  radar: dynamic(() => import('@/components/charts/catalog-radar'), {
    loading: () => <ChartFamilyLoading />,
  }),
  radial: dynamic(() => import('@/components/charts/catalog-radial'), {
    loading: () => <ChartFamilyLoading />,
  }),
  tooltip: dynamic(() => import('@/components/charts/catalog-tooltip'), {
    loading: () => <ChartFamilyLoading />,
  }),
}

export function ChartsCatalogPage() {
  const [activeFamily, setActiveFamily] = useState<ChartFamily>('bar')
  const ActiveFamilyComponent = familyLoaders[activeFamily]
  const activeSummary = useMemo(
    () => chartFamilySummary.find((item) => item.family === activeFamily),
    [activeFamily],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Catalogo de Graficos
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Presets reutilizaveis para relatorios, dashboards e indicadores.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:min-w-[320px]">
          <CatalogStat icon={Boxes} label="Exemplos" value={totalChartExamples} />
          <CatalogStat icon={Layers3} label="Familias" value={chartFamilySummary.length} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {chartFamilySummary.map((item) => (
          <button
            key={item.family}
            type="button"
            onClick={() => setActiveFamily(item.family)}
            className={cn(
              'rounded-lg border px-3 py-3 text-left transition-colors',
              activeFamily === item.family
                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-200'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{item.label}</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {item.total}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
              {item.description}
            </p>
          </button>
        ))}
      </div>

      {activeSummary && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-100">
          Familia ativa: <span className="font-semibold">{activeSummary.label}</span> com{' '}
          <span className="font-semibold">{activeSummary.total}</span> presets.
        </div>
      )}

      <ActiveFamilyComponent />
    </div>
  )
}

function CatalogStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-blue-600 dark:text-blue-300" />
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  )
}

function ChartFamilyLoading() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {[0, 1].map((item) => (
        <div
          key={item}
          className="h-[380px] animate-pulse rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800"
        />
      ))}
    </div>
  )
}
