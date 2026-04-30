import { tooltipChartsCatalog } from '@/components/charts/tooltip'
import { ChartCatalogFamilySection } from '@/components/charts/catalog-family-section'

export default function TooltipChartsGallery() {
  return (
    <ChartCatalogFamilySection
      family="tooltip"
      items={tooltipChartsCatalog}
      label="Tooltip Charts"
    />
  )
}
