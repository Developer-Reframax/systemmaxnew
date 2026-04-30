# Guia para IA: solucao dinamica de graficos shadcn

Este documento orienta uma IA a construir, em qualquer projeto React/Next.js, uma solucao de graficos semelhante a `src/components/charts`: importar os graficos/base do shadcn, transforma-los em componentes dinamicos e criar uma pagina de catalogo reutilizavel.

Nao documente paginas de relatorio especificas. A solucao deve nascer como biblioteca interna de graficos e depois ser consumida por relatorios, dashboards ou outras telas.

## Objetivo

Ao final, o projeto deve ter:

- `src/components/ui/chart.tsx` instalado pelo shadcn.
- `recharts` instalado e compativel com a versao do shadcn usada.
- tokens CSS `--chart-1` ate `--chart-5` em tema claro e escuro.
- `src/components/charts/core.tsx` com wrappers dinamicos por familia de grafico.
- arquivos por familia: `area.tsx`, `bar.tsx`, `line.tsx`, `pie.tsx`, `radar.tsx`, `radial.tsx`, `tooltip.tsx`.
- arquivos de catalogo: `catalog-page.tsx`, `catalog-family-section.tsx`, `catalog-*.tsx`, `catalog-meta.ts`.
- `src/components/charts/index.ts` exportando a API publica.
- uma rota/pagina de catalogo, por exemplo `src/app/admin/relatorios/catalogo/page.tsx`.

## Principios

1. Use o shadcn apenas como base visual e de integracao com Recharts.
2. Nao copie dezenas de exemplos estaticos direto para telas de negocio.
3. Converta cada exemplo em preset dinamico usando props e dados externos.
4. Preserve a composicao do Recharts: o wrapper deve facilitar o uso, nao bloquear personalizacoes.
5. Centralize tipagem, cores, frame, empty state, tooltip e legend em `core.tsx`.
6. Separe catalogo de consumo real. O catalogo demonstra presets; as paginas de negocio passam seus proprios dados.

## 1. Verificar stack do projeto

Antes de editar, a IA deve identificar:

- framework: Next.js, Vite ou outro React.
- alias de importacao, geralmente `@/`.
- local de componentes UI, geralmente `src/components/ui`.
- local do CSS global, geralmente `src/app/globals.css`.
- se ja existem `Card`, `cn`, tema dark mode e Tailwind.

Comandos uteis:

```bash
rg -n "components/ui|globals.css|tailwind|recharts|ChartContainer" src package.json
```

## 2. Instalar a base chart do shadcn

Consulte a documentacao oficial do shadcn antes de implementar em outro projeto:

- https://ui.shadcn.com/docs/components/chart

Instale o componente:

```bash
npx shadcn@latest add chart
```

Se o projeto usa outro gerenciador:

```bash
pnpm dlx shadcn@latest add chart
yarn shadcn@latest add chart
bunx shadcn@latest add chart
```

Garanta que `recharts` esteja em `dependencies`. Se nao estiver:

```bash
npm install recharts
```

Observacao importante: a documentacao atual do shadcn informa que o componente `chart` usa Recharts v3. Ao adaptar projetos antigos, valide breaking changes do Recharts e do shadcn.

## 3. Configurar tokens de cor

No CSS global, adicione ou ajuste os tokens:

```css
@layer base {
  :root {
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
  }

  .dark {
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
  }
}
```

Se o projeto usa tokens em OKLCH, mantenha o padrao do projeto. O ponto essencial e ter cinco cores semanticamente reutilizaveis para series.

## 4. Criar `src/components/charts/core.tsx`

Este arquivo e o centro da solucao. Ele deve ser `use client` porque Recharts e os componentes do shadcn dependem de renderizacao client-side.

Responsabilidades:

- declarar tipos compartilhados.
- criar uma interface de dados generica: `Record<string, number | string | boolean | null | undefined>`.
- criar tipos de familias: `area`, `bar`, `line`, `pie`, `radar`, `radial`, `tooltip`.
- criar `buildChartConfig`.
- criar `getDefaultChartColor` e `getChartColor`.
- criar `createExampleComponent` para presets com props sobrescritiveis.
- criar `createChartCatalogItem`.
- criar um frame padrao com `Card`, titulo, descricao, footer, altura e empty state.
- criar wrappers dinamicos por familia.

Wrappers minimos:

- `CartesianChartCard`: cobre area, bar e line usando `ComposedChart`.
- `PieChartCard`: cobre pie, donut, labels, center label e stacked rings.
- `RadarChartCard`: cobre radar simples e multiplas series.
- `RadialChartCard`: cobre radial bar, progresso e center label.

O wrapper cartesiano deve aceitar:

- `data`
- `config`
- `categoryKey`
- `series`
- `layout`
- `showGrid`
- `showXAxis`
- `showYAxis`
- `showTooltip`
- `showLegend`
- `showBrush`
- formatadores de eixo e tooltip
- opcoes de stack, gradient, label e radius

Exemplo de API desejada:

```tsx
<CartesianChartCard
  data={data}
  config={config}
  categoryKey="month"
  series={[
    { key: "desktop", type: "bar", radius: [8, 8, 0, 0] },
    { key: "mobile", type: "bar", radius: [8, 8, 0, 0] },
  ]}
  showLegend
  title="Acessos por mes"
/>
```

## 5. Converter exemplos do shadcn em presets dinamicos

Para cada exemplo oficial do shadcn:

1. Identifique familia e variacao: `chart-bar-default`, `chart-area-gradient`, `chart-pie-donut`, etc.
2. Nao mantenha o exemplo como componente isolado acoplado a dados fixos.
3. Mapeie a estrutura para um wrapper dinamico de `core.tsx`.
4. Crie dados demo somente para o catalogo.
5. Crie `ChartConfig` com `buildChartConfig`.
6. Crie o componente via `createExampleComponent`.
7. Registre o item em um array `*ChartsCatalog`.

Padrao recomendado para uma familia:

```tsx
"use client"

import type { ComponentType } from "react"

import {
  buildChartConfig,
  CartesianChartCard,
  type CartesianChartCardProps,
  type ChartCatalogItem,
  createChartCatalogItem,
  createExampleComponent,
  demoMonthlyData,
  formatShortMonth,
} from "@/components/charts/core"

const barChartConfig = buildChartConfig([
  { key: "desktop", label: "Desktop" },
  { key: "mobile", label: "Mobile" },
])

const ChartBarDefault = createExampleComponent(
  "ChartBarDefault",
  CartesianChartCard,
  {
    categoryKey: "month",
    config: barChartConfig,
    data: demoMonthlyData,
    description: "Barras simples para serie unica.",
    series: [{ key: "desktop", radius: [8, 8, 0, 0], type: "bar" }],
    title: "chart-bar-default",
    xAxisTickFormatter: formatShortMonth,
  } satisfies CartesianChartCardProps,
)

function createBarCatalogItem(
  slug: string,
  title: string,
  description: string,
  componentName: string,
  Component: ComponentType<Record<string, unknown>>,
): ChartCatalogItem {
  return createChartCatalogItem(
    slug,
    "bar",
    title,
    description,
    componentName,
    Component,
  )
}

export const barChartsCatalog: ChartCatalogItem[] = [
  createBarCatalogItem(
    "chart-bar-default",
    "Bar default",
    "Barras simples para serie unica.",
    "ChartBarDefault",
    ChartBarDefault as ComponentType<Record<string, unknown>>,
  ),
]

export { ChartBarDefault }
```

## 6. Organizar arquivos por familia

Crie um arquivo por familia em `src/components/charts`:

- `area.tsx`
- `bar.tsx`
- `line.tsx`
- `pie.tsx`
- `radar.tsx`
- `radial.tsx`
- `tooltip.tsx`

Cada arquivo deve:

- iniciar com `"use client"`.
- importar wrappers e tipos do `core.tsx`.
- definir um `ChartConfig` local.
- criar presets com `createExampleComponent`.
- exportar um array `*ChartsCatalog`.
- exportar os componentes individuais para uso fora do catalogo.

Exemplos de presets por familia:

- Area: default, linear, step, stacked, stacked expand, icons, gradient, axes, legend, interactive.
- Bar: default, horizontal, multiple, stacked, labels, mixed, active, negative, interactive.
- Line: default, linear, step, multiple, dots, label, custom label, natural, interactive.
- Pie: default, donut, label, label list, legend, stacked, separator, active, interactive.
- Radar: default, dots, multiple, legend, grid circle, grid none, grid fill, labels.
- Radial: simple, label, grid, text, shape, stacked.
- Tooltip: default, indicator line, indicator none, label custom, formatter, icons, advanced.

## 7. Criar export publico

Em `src/components/charts/index.ts`, exporte tudo que paginas externas devem consumir:

```ts
import { areaChartsCatalog } from "@/components/charts/area"
import { barChartsCatalog } from "@/components/charts/bar"
import { lineChartsCatalog } from "@/components/charts/line"
import { pieChartsCatalog } from "@/components/charts/pie"
import { radarChartsCatalog } from "@/components/charts/radar"
import { radialChartsCatalog } from "@/components/charts/radial"
import { tooltipChartsCatalog } from "@/components/charts/tooltip"

export * from "@/components/charts/area"
export * from "@/components/charts/bar"
export * from "@/components/charts/core"
export * from "@/components/charts/line"
export * from "@/components/charts/pie"
export * from "@/components/charts/radar"
export * from "@/components/charts/radial"
export * from "@/components/charts/tooltip"

export const chartCatalog = [
  ...areaChartsCatalog,
  ...barChartsCatalog,
  ...lineChartsCatalog,
  ...pieChartsCatalog,
  ...radarChartsCatalog,
  ...radialChartsCatalog,
  ...tooltipChartsCatalog,
]
```

Evite importar o catalogo completo em telas que so precisam de um wrapper, pois isso aumenta o bundle.

## 8. Criar metadata leve para a pagina de catalogo

Crie `catalog-meta.ts` sem importar componentes pesados:

```ts
import type { ChartFamily } from "@/components/charts/core"

export const chartFamilySummary: Array<{
  family: ChartFamily
  label: string
  total: number
}> = [
  { family: "area", label: "Area", total: 10 },
  { family: "bar", label: "Bar", total: 10 },
  { family: "line", label: "Line", total: 10 },
  { family: "pie", label: "Pie", total: 11 },
  { family: "radar", label: "Radar", total: 12 },
  { family: "radial", label: "Radial", total: 6 },
  { family: "tooltip", label: "Tooltip", total: 9 },
]

export const totalChartExamples = chartFamilySummary.reduce(
  (acc, item) => acc + item.total,
  0,
)
```

Motivo: a pagina principal do catalogo consegue renderizar contadores e navegacao sem carregar todas as familias.

## 9. Criar componentes de catalogo por familia

Para cada familia, crie um arquivo `catalog-*.tsx`.

Exemplo:

```tsx
import { barChartsCatalog } from "@/components/charts/bar"
import { ChartCatalogFamilySection } from "@/components/charts/catalog-family-section"

export default function BarChartsGallery() {
  return (
    <ChartCatalogFamilySection
      family="bar"
      items={barChartsCatalog}
      label="Bar Charts"
    />
  )
}
```

Esses arquivos devem ser default exports para facilitar `next/dynamic`.

## 10. Criar `catalog-family-section.tsx`

Este componente recebe os itens de uma familia e renderiza cards de demonstracao.

Requisitos:

- receber `family`, `items` e `label`.
- mostrar titulo e descricao da familia.
- renderizar uma grid responsiva.
- para cada item, mostrar titulo, slug, descricao e o componente.
- nao acoplar dados de negocio.

O tipo `ChartCatalogItem` deve carregar:

```ts
{
  slug: string
  family: ChartFamily
  title: string
  description: string
  componentName: string
  Component: React.ComponentType<Record<string, unknown>>
}
```

## 11. Criar `catalog-page.tsx`

A pagina do catalogo deve ser um client component com estado de familia ativa e carregamento lazy.

Padrao recomendado:

```tsx
"use client"

import dynamic from "next/dynamic"
import { useMemo, useState } from "react"

import {
  chartFamilySummary,
  totalChartExamples,
} from "@/components/charts/catalog-meta"
import type { ChartFamily } from "@/components/charts/core"

const familyLoaders = {
  area: dynamic(() => import("@/components/charts/catalog-area")),
  bar: dynamic(() => import("@/components/charts/catalog-bar")),
  line: dynamic(() => import("@/components/charts/catalog-line")),
  pie: dynamic(() => import("@/components/charts/catalog-pie")),
  radar: dynamic(() => import("@/components/charts/catalog-radar")),
  radial: dynamic(() => import("@/components/charts/catalog-radial")),
  tooltip: dynamic(() => import("@/components/charts/catalog-tooltip")),
} satisfies Record<ChartFamily, ReturnType<typeof dynamic>>
```

Requisitos da UI:

- cabecalho com titulo do catalogo.
- cards ou indicadores com total de exemplos e familias.
- botoes/tabs para selecionar familia.
- mostrar somente a familia ativa.
- usar `dynamic()` para nao renderizar todos os graficos de uma vez.

## 12. Criar rota do catalogo

Em Next.js App Router:

```tsx
import { ChartsCatalogPage } from "@/components/charts/catalog-page"

export default function ChartsCatalogRoute() {
  return <ChartsCatalogPage />
}
```

Exemplo de caminho:

```txt
src/app/admin/relatorios/catalogo/page.tsx
```

Adapte o caminho para a navegacao do projeto. O catalogo e uma ferramenta interna de desenvolvimento e descoberta.

## 13. Como usar em paginas reais

Paginas de negocio devem importar wrappers ou presets especificos, nao a pagina de catalogo.

Exemplo com dados reais:

```tsx
import {
  buildChartConfig,
  CartesianChartCard,
} from "@/components/charts"

const config = buildChartConfig([
  { key: "completed", label: "Concluidos" },
  { key: "pending", label: "Pendentes" },
])

<CartesianChartCard
  categoryKey="group"
  config={config}
  data={rows}
  series={[
    { key: "completed", type: "bar", radius: [8, 8, 0, 0] },
    { key: "pending", type: "bar", radius: [8, 8, 0, 0] },
  ]}
  showLegend
  title="Status por grupo"
/>
```

## 14. Checklist de qualidade

Antes de concluir, a IA deve validar:

- `npm run type-check` passa.
- `npm run lint` passa ou os avisos sao justificados.
- `npm run build` passa.
- a rota do catalogo abre sem erro.
- trocar de familia no catalogo nao quebra.
- empty state aparece quando `data` e array vazio.
- tooltips e legends usam labels do `ChartConfig`.
- cada `series.key` existe nos dados e no config ou tem fallback de cor.
- componentes que usam Recharts possuem `"use client"`.
- `ChartContainer` tem altura, `min-h`, `aspect` ou wrapper com altura fixa.
- a pagina de catalogo usa lazy loading por familia.

## 15. Erros comuns a evitar

- Importar todos os exemplos do catalogo dentro de uma pagina de relatorio.
- Criar um componente diferente para cada grafico de negocio quando um wrapper dinamico resolveria.
- Deixar dados demo misturados com dados reais.
- Usar cores hardcoded sem passar por `ChartConfig`.
- Esquecer `"use client"` em arquivos que renderizam Recharts.
- Usar `ResponsiveContainer` sem altura mensuravel.
- Duplicar `ChartContainer`, tooltip e legend em cada exemplo em vez de centralizar.
- Atualizar os totais em `catalog-meta.ts` manualmente e esquecer de sincronizar com os arrays de catalogo.

## 16. Ordem recomendada de implementacao

1. Instalar `chart` do shadcn e `recharts`.
2. Configurar tokens CSS de graficos.
3. Criar `core.tsx` com tipos, helpers e wrappers.
4. Criar dados demo apenas para o catalogo.
5. Converter exemplos shadcn por familia.
6. Exportar a API em `index.ts`.
7. Criar `catalog-meta.ts`.
8. Criar `catalog-family-section.tsx`.
9. Criar `catalog-*.tsx`.
10. Criar `catalog-page.tsx` com lazy loading por familia.
11. Criar rota do catalogo.
12. Rodar type-check, lint e build.

## Resultado esperado

A IA deve entregar uma biblioteca interna de graficos que permita:

- escolher rapidamente um preset no catalogo.
- reutilizar o mesmo preset com dados reais via props.
- manter comportamento visual consistente em todos os relatorios.
- evoluir novos tipos de graficos sem reescrever paginas existentes.
