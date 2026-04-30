import { pieChartsCatalog } from '@/components/charts/pie'
import { ChartCatalogFamilySection } from '@/components/charts/catalog-family-section'

export default function PieChartsGallery() {
  return (
    <ChartCatalogFamilySection
      family="pie"
      items={pieChartsCatalog}
      label="Pie Charts"
    />
  )
}
