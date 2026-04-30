import { radarChartsCatalog } from '@/components/charts/radar'
import { ChartCatalogFamilySection } from '@/components/charts/catalog-family-section'

export default function RadarChartsGallery() {
  return (
    <ChartCatalogFamilySection
      family="radar"
      items={radarChartsCatalog}
      label="Radar Charts"
    />
  )
}
