import { areaChartsCatalog } from '@/components/charts/area'
import { barChartsCatalog } from '@/components/charts/bar'
import { lineChartsCatalog } from '@/components/charts/line'
import { pieChartsCatalog } from '@/components/charts/pie'
import { radarChartsCatalog } from '@/components/charts/radar'
import { radialChartsCatalog } from '@/components/charts/radial'
import { tooltipChartsCatalog } from '@/components/charts/tooltip'

export * from '@/components/charts/area'
export * from '@/components/charts/bar'
export * from '@/components/charts/core'
export * from '@/components/charts/line'
export * from '@/components/charts/pie'
export * from '@/components/charts/radar'
export * from '@/components/charts/radial'
export * from '@/components/charts/tooltip'

export const chartCatalog = [
  ...areaChartsCatalog,
  ...barChartsCatalog,
  ...lineChartsCatalog,
  ...pieChartsCatalog,
  ...radarChartsCatalog,
  ...radialChartsCatalog,
  ...tooltipChartsCatalog,
]
