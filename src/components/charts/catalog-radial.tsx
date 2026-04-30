import { radialChartsCatalog } from '@/components/charts/radial'
import { ChartCatalogFamilySection } from '@/components/charts/catalog-family-section'

export default function RadialChartsGallery() {
  return (
    <ChartCatalogFamilySection
      family="radial"
      items={radialChartsCatalog}
      label="Radial Charts"
    />
  )
}
