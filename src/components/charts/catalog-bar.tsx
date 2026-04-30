import { barChartsCatalog } from '@/components/charts/bar'
import { ChartCatalogFamilySection } from '@/components/charts/catalog-family-section'

export default function BarChartsGallery() {
  return (
    <ChartCatalogFamilySection
      family="bar"
      items={barChartsCatalog}
      label="Bar Charts"
    />
  )
}
