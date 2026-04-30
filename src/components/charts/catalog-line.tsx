import { lineChartsCatalog } from '@/components/charts/line'
import { ChartCatalogFamilySection } from '@/components/charts/catalog-family-section'

export default function LineChartsGallery() {
  return (
    <ChartCatalogFamilySection
      family="line"
      items={lineChartsCatalog}
      label="Line Charts"
    />
  )
}
