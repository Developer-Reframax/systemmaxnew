import { areaChartsCatalog } from '@/components/charts/area'
import { ChartCatalogFamilySection } from '@/components/charts/catalog-family-section'

export default function AreaChartsGallery() {
  return (
    <ChartCatalogFamilySection
      family="area"
      items={areaChartsCatalog}
      label="Area Charts"
    />
  )
}
