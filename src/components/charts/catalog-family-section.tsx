'use client'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { ChartCatalogItem, ChartFamily } from '@/components/charts/core'

interface ChartCatalogFamilySectionProps {
  family: ChartFamily
  items: ChartCatalogItem[]
  label: string
}

export function ChartCatalogFamilySection({
  family,
  items,
  label,
}: ChartCatalogFamilySectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{label}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Presets dinamicos da familia {family}, prontos para receber dados reais via props.
          </p>
        </div>
        <Badge variant="secondary">{items.length} exemplos</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {items.map((item) => {
          const Component = item.Component

          return (
            <Card key={item.slug} className="overflow-hidden">
              <CardHeader className="space-y-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </div>
                  <Badge variant="outline">{item.slug}</Badge>
                </div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {item.componentName}
                </p>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Component />
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
