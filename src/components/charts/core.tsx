'use client'

import type { ComponentType, ReactNode } from 'react'
import {
  Area,
  Bar,
  Brush,
  CartesianGrid,
  Cell,
  ComposedChart,
  Label,
  LabelList,
  Line,
  Pie,
  PieChart as RechartsPieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart as RechartsRadarChart,
  RadialBar,
  RadialBarChart as RechartsRadialBarChart,
  XAxis,
  YAxis,
} from 'recharts'

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type ChartValue = string | number | boolean | null | undefined
export type ChartDatum = Record<string, ChartValue>
export type ChartFamily =
  | 'area'
  | 'bar'
  | 'line'
  | 'pie'
  | 'radar'
  | 'radial'
  | 'tooltip'

export type CartesianSeriesType = 'area' | 'bar' | 'line'
export type ChartRadius = number | [number, number, number, number]
export type ChartLayout = 'horizontal' | 'vertical'
export type TooltipIndicator = 'dot' | 'line' | 'dashed'

export interface ChartSeries {
  barSize?: number
  color?: string
  curveType?: 'basis' | 'linear' | 'monotone' | 'natural' | 'step'
  dataLabelPosition?: 'top' | 'right' | 'insideRight' | 'insideLeft' | 'center'
  fillOpacity?: number
  gradient?: boolean
  key: string
  label?: string
  minPointSize?: number
  radius?: ChartRadius
  showDot?: boolean
  showLabel?: boolean
  stackId?: string
  strokeWidth?: number
  type: CartesianSeriesType
  yAxisId?: string
}

export interface ChartConfigEntry {
  color?: string
  key: string
  label: string
}

export interface ChartCatalogItem {
  Component: ComponentType<Record<string, unknown>>
  componentName: string
  description: string
  family: ChartFamily
  slug: string
  title: string
}

interface ChartCardFrameProps {
  children: ReactNode
  className?: string
  contentClassName?: string
  data?: ChartDatum[]
  description?: ReactNode
  emptyMessage?: string
  footer?: ReactNode
  height?: number
  innerHeight?: number
  scrollable?: boolean
  title?: ReactNode
}

export interface CartesianChartCardProps {
  categoryKey: string
  className?: string
  config: ChartConfig
  data: ChartDatum[]
  description?: ReactNode
  emptyMessage?: string
  footer?: ReactNode
  height?: number
  layout?: ChartLayout
  margin?: { bottom?: number; left?: number; right?: number; top?: number }
  series: ChartSeries[]
  chartContentHeight?: number
  chartScrollable?: boolean
  showBrush?: boolean
  showGrid?: boolean
  showLegend?: boolean
  showTooltip?: boolean
  showXAxis?: boolean
  showYAxis?: boolean
  title?: ReactNode
  tooltipIndicator?: TooltipIndicator
  tooltipLabelFormatter?: (label: ReactNode, payload: unknown[]) => ReactNode
  tooltipValueFormatter?: (
    value: ReactNode,
    name: string | number | undefined,
    item: unknown,
    index: number,
  ) => ReactNode
  xAxisTickFormatter?: (value: string | number) => string
  yAxisWidth?: number
  yAxisTickFormatter?: (value: string | number) => string
}

export interface PieChartCardProps {
  className?: string
  config: ChartConfig
  data: ChartDatum[]
  description?: ReactNode
  emptyMessage?: string
  footer?: ReactNode
  height?: number
  innerRadius?: number
  nameKey: string
  outerRadius?: number
  paddingAngle?: number
  showLabels?: boolean
  showLegend?: boolean
  showTooltip?: boolean
  title?: ReactNode
  totalLabel?: string
  valueFormatter?: (value: number) => string
  valueKey: string
}

interface PieLabelRenderProps {
  cx?: number | string
  cy?: number | string
  midAngle?: number
  outerRadius?: number | string
  payload?: ChartDatum
  value?: number | string
}

export interface RadarChartCardProps {
  categoryKey: string
  className?: string
  config: ChartConfig
  data: ChartDatum[]
  description?: ReactNode
  emptyMessage?: string
  footer?: ReactNode
  height?: number
  series: Array<Omit<ChartSeries, 'type'>>
  showGrid?: boolean
  showLegend?: boolean
  showTooltip?: boolean
  title?: ReactNode
}

export interface RadialChartCardProps {
  className?: string
  config: ChartConfig
  data: ChartDatum[]
  description?: ReactNode
  emptyMessage?: string
  endAngle?: number
  footer?: ReactNode
  height?: number
  innerRadius?: number
  nameKey: string
  outerRadius?: number
  showLabels?: boolean
  showTooltip?: boolean
  startAngle?: number
  title?: ReactNode
  valueKey: string
}

export const demoMonthlyData: ChartDatum[] = [
  { month: 'Janeiro', desktop: 186, mobile: 80, tablet: 48 },
  { month: 'Fevereiro', desktop: 305, mobile: 200, tablet: 82 },
  { month: 'Marco', desktop: 237, mobile: 120, tablet: 70 },
  { month: 'Abril', desktop: 73, mobile: 190, tablet: 96 },
  { month: 'Maio', desktop: 209, mobile: 130, tablet: 105 },
  { month: 'Junho', desktop: 214, mobile: 140, tablet: 88 },
]

export const demoCategoryData: ChartDatum[] = [
  { category: 'Operacao', atual: 58, meta: 70 },
  { category: 'Manutencao', atual: 82, meta: 75 },
  { category: 'Logistica', atual: 64, meta: 68 },
  { category: 'Qualidade', atual: 76, meta: 72 },
  { category: 'SSMA', atual: 91, meta: 85 },
]

export const demoPieData: ChartDatum[] = [
  { name: 'concluidos', value: 44 },
  { name: 'andamento', value: 28 },
  { name: 'pendentes', value: 18 },
  { name: 'atrasados', value: 10 },
]

export const demoRadarData: ChartDatum[] = [
  { area: 'Planejamento', atual: 86, anterior: 72 },
  { area: 'Execucao', atual: 72, anterior: 68 },
  { area: 'Seguranca', atual: 94, anterior: 88 },
  { area: 'Qualidade', atual: 78, anterior: 74 },
  { area: 'Custo', atual: 69, anterior: 65 },
  { area: 'Prazo', atual: 81, anterior: 70 },
]

export const demoRadialData: ChartDatum[] = [
  { name: 'apto', value: 78 },
  { name: 'alerta', value: 48 },
  { name: 'risco', value: 24 },
]

export function buildChartConfig(entries: ChartConfigEntry[]): ChartConfig {
  return entries.reduce<ChartConfig>((acc, entry, index) => {
    acc[entry.key] = {
      label: entry.label,
      color: entry.color || getDefaultChartColor(index),
    }

    return acc
  }, {})
}

export function getDefaultChartColor(index: number) {
  return `var(--chart-${(index % 5) + 1})`
}

export function getChartColor(key: string, index = 0) {
  return `var(--color-${key}, ${getDefaultChartColor(index)})`
}

export function formatShortMonth(value: string | number) {
  return String(value).slice(0, 3)
}

export function formatCompactNumber(value: string | number) {
  return new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(Number(value))
}

export function createExampleComponent<P extends object>(
  displayName: string,
  Component: ComponentType<P>,
  defaultProps: P,
) {
  const ChartExample = (props: Partial<P>) => {
    const mergedProps = { ...defaultProps, ...props } as P
    return <Component {...mergedProps} />
  }

  ChartExample.displayName = displayName
  return ChartExample
}

export function createChartCatalogItem(
  slug: string,
  family: ChartFamily,
  title: string,
  description: string,
  componentName: string,
  Component: ComponentType<Record<string, unknown>>,
): ChartCatalogItem {
  return {
    Component,
    componentName,
    description,
    family,
    slug,
    title,
  }
}

function ChartCardFrame({
  children,
  className,
  contentClassName,
  data,
  description,
  emptyMessage = 'Nenhum dado disponivel para este grafico.',
  footer,
  height = 280,
  innerHeight,
  scrollable = false,
  title,
}: ChartCardFrameProps) {
  const isEmpty = Array.isArray(data) && data.length === 0
  const contentHeight = Math.max(innerHeight || height, height)

  return (
    <Card className={cn('overflow-hidden', className)}>
      {(title || description) && (
        <CardHeader className="space-y-1 p-4">
          {title && <CardTitle className="text-base">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className={cn('p-4 pt-0', !title && !description && 'pt-4', contentClassName)}>
        <div
          style={{ height }}
          className={cn('w-full', scrollable && !isEmpty && 'overflow-y-auto pr-2')}
        >
          {isEmpty ? (
            <div className="flex h-full items-center justify-center rounded-md border border-dashed border-gray-200 px-4 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              {emptyMessage}
            </div>
          ) : (
            <div style={{ height: scrollable ? contentHeight : height }} className="w-full">
              {children}
            </div>
          )}
        </div>
      </CardContent>
      {footer && <CardFooter className="px-4 pb-4 pt-0 text-sm text-muted-foreground">{footer}</CardFooter>}
    </Card>
  )
}

export function CartesianChartCard({
  categoryKey,
  chartContentHeight,
  chartScrollable = false,
  className,
  config,
  data,
  description,
  emptyMessage,
  footer,
  height,
  layout = 'horizontal',
  margin = { bottom: 8, left: 8, right: 8, top: 12 },
  series,
  showBrush = false,
  showGrid = true,
  showLegend = false,
  showTooltip = true,
  showXAxis = true,
  showYAxis = true,
  title,
  tooltipIndicator = 'dot',
  tooltipLabelFormatter,
  tooltipValueFormatter,
  xAxisTickFormatter,
  yAxisWidth,
  yAxisTickFormatter,
}: CartesianChartCardProps) {
  return (
    <ChartCardFrame
      className={className}
      data={data}
      description={description}
      emptyMessage={emptyMessage}
      footer={footer}
      height={height}
      innerHeight={chartContentHeight}
      scrollable={chartScrollable}
      title={title}
    >
      <ChartContainer config={config} className="h-full w-full">
        <ComposedChart accessibilityLayer data={data} layout={layout} margin={margin}>
          <ChartGradients series={series} />
          {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} />}
          {showXAxis && (
            <XAxis
              axisLine={false}
              dataKey={layout === 'vertical' ? undefined : categoryKey}
              tickFormatter={xAxisTickFormatter}
              tickLine={false}
              tickMargin={10}
              type={layout === 'vertical' ? 'number' : 'category'}
            />
          )}
          {showYAxis && (
            <YAxis
              axisLine={false}
              dataKey={layout === 'vertical' ? categoryKey : undefined}
              tickFormatter={yAxisTickFormatter}
              tickLine={false}
              tickMargin={10}
              type={layout === 'vertical' ? 'category' : 'number'}
              width={yAxisWidth ?? (layout === 'vertical' ? 90 : 40)}
            />
          )}
          {showTooltip && (
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={tooltipValueFormatter}
                  indicator={tooltipIndicator}
                  labelFormatter={tooltipLabelFormatter}
                />
              }
            />
          )}
          {showLegend && <ChartLegend content={<ChartLegendContent />} />}
          {series.map((item, index) => renderCartesianSeries(item, index))}
          {showBrush && <Brush dataKey={categoryKey} height={24} stroke="var(--chart-1)" />}
        </ComposedChart>
      </ChartContainer>
    </ChartCardFrame>
  )
}

export function PieChartCard({
  className,
  config,
  data,
  description,
  emptyMessage,
  footer,
  height,
  innerRadius = 0,
  nameKey,
  outerRadius = 92,
  paddingAngle = 0,
  showLabels = false,
  showLegend = false,
  showTooltip = true,
  title,
  totalLabel = 'Total',
  valueFormatter,
  valueKey,
}: PieChartCardProps) {
  const total = data.reduce((sum, item) => sum + Number(item[valueKey] || 0), 0)

  return (
    <ChartCardFrame
      className={className}
      data={data}
      description={description}
      emptyMessage={emptyMessage}
      footer={footer}
      height={height}
      title={title}
    >
      <ChartContainer config={config} className="h-full w-full">
        <RechartsPieChart accessibilityLayer>
          {showTooltip && (
            <ChartTooltip
              content={<ChartTooltipContent hideLabel nameKey={nameKey} />}
            />
          )}
          <Pie
            data={data}
            dataKey={valueKey}
            innerRadius={innerRadius}
            label={
              showLabels
                ? (props: PieLabelRenderProps) =>
                    renderPieDataLabel(props, valueKey, valueFormatter)
                : false
            }
            labelLine={showLabels}
            nameKey={nameKey}
            outerRadius={outerRadius}
            paddingAngle={paddingAngle}
          >
            {data.map((item, index) => (
              <Cell
                key={String(item[nameKey] || index)}
                fill={getChartColor(String(item[nameKey] || valueKey), index)}
              />
            ))}
            {innerRadius > 0 && (
              <Label
                content={({ viewBox }) => {
                  if (!viewBox || !('cx' in viewBox) || !('cy' in viewBox)) return null

                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan
                        x={viewBox.cx}
                        y={viewBox.cy}
                        className="fill-foreground text-2xl font-bold"
                      >
                        {valueFormatter ? valueFormatter(total) : total}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 22}
                        className="fill-muted-foreground text-xs"
                      >
                        {totalLabel}
                      </tspan>
                    </text>
                  )
                }}
              />
            )}
          </Pie>
          {showLegend && <ChartLegend content={<ChartLegendContent nameKey={nameKey} />} />}
        </RechartsPieChart>
      </ChartContainer>
    </ChartCardFrame>
  )
}

function renderPieDataLabel(
  props: PieLabelRenderProps,
  valueKey: string,
  valueFormatter?: (value: number) => string,
) {
  const cx = Number(props.cx)
  const cy = Number(props.cy)
  const outerRadius = Number(props.outerRadius)
  const midAngle = Number(props.midAngle)

  if ([cx, cy, outerRadius, midAngle].some((value) => Number.isNaN(value))) {
    return null
  }

  const rawValue = Number(props.payload?.[valueKey] ?? props.value ?? 0)
  const value = valueFormatter ? valueFormatter(rawValue) : formatNumberForLabel(rawValue)
  const radius = outerRadius + 22
  const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180))
  const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180))

  return (
    <text
      x={x}
      y={y}
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="fill-foreground text-sm font-semibold"
      style={{
        paintOrder: 'stroke',
        stroke: 'hsl(var(--background))',
        strokeLinejoin: 'round',
        strokeWidth: 4,
      }}
    >
      {value}
    </text>
  )
}

function formatNumberForLabel(value: number) {
  return Number.isFinite(value) ? value.toLocaleString('pt-BR') : '0'
}

export function RadarChartCard({
  categoryKey,
  className,
  config,
  data,
  description,
  emptyMessage,
  footer,
  height,
  series,
  showGrid = true,
  showLegend = false,
  showTooltip = true,
  title,
}: RadarChartCardProps) {
  return (
    <ChartCardFrame
      className={className}
      data={data}
      description={description}
      emptyMessage={emptyMessage}
      footer={footer}
      height={height}
      title={title}
    >
      <ChartContainer config={config} className="h-full w-full">
        <RechartsRadarChart accessibilityLayer data={data}>
          {showGrid && <PolarGrid />}
          <PolarAngleAxis dataKey={categoryKey} tickLine={false} />
          {showTooltip && <ChartTooltip content={<ChartTooltipContent />} />}
          {series.map((item, index) => (
            <Radar
              key={item.key}
              dataKey={item.key}
              fill={getChartColor(item.key, index)}
              fillOpacity={item.fillOpacity ?? 0.2}
              stroke={getChartColor(item.key, index)}
              strokeWidth={item.strokeWidth ?? 2}
            />
          ))}
          {showLegend && <ChartLegend content={<ChartLegendContent />} />}
        </RechartsRadarChart>
      </ChartContainer>
    </ChartCardFrame>
  )
}

export function RadialChartCard({
  className,
  config,
  data,
  description,
  emptyMessage,
  endAngle = -270,
  footer,
  height,
  innerRadius = 28,
  nameKey,
  outerRadius = 104,
  showLabels = true,
  showTooltip = true,
  startAngle = 90,
  title,
  valueKey,
}: RadialChartCardProps) {
  return (
    <ChartCardFrame
      className={className}
      data={data}
      description={description}
      emptyMessage={emptyMessage}
      footer={footer}
      height={height}
      title={title}
    >
      <ChartContainer config={config} className="h-full w-full">
        <RechartsRadialBarChart
          accessibilityLayer
          data={data}
          endAngle={endAngle}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
        >
          {showTooltip && <ChartTooltip content={<ChartTooltipContent hideLabel nameKey={nameKey} />} />}
          <RadialBar background dataKey={valueKey}>
            {data.map((item, index) => (
              <Cell
                key={String(item[nameKey] || index)}
                fill={getChartColor(String(item[nameKey] || valueKey), index)}
              />
            ))}
            {showLabels && (
              <LabelList
                dataKey={nameKey}
                position="insideStart"
                className="fill-white capitalize"
                fontSize={11}
              />
            )}
          </RadialBar>
        </RechartsRadialBarChart>
      </ChartContainer>
    </ChartCardFrame>
  )
}

function ChartGradients({ series }: { series: ChartSeries[] }) {
  const gradientSeries = series.filter((item) => item.gradient)

  if (!gradientSeries.length) {
    return null
  }

  return (
    <defs>
      {gradientSeries.map((item, index) => (
        <linearGradient key={item.key} id={`fill-${item.key}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="5%" stopColor={getChartColor(item.key, index)} stopOpacity={0.8} />
          <stop offset="95%" stopColor={getChartColor(item.key, index)} stopOpacity={0.1} />
        </linearGradient>
      ))}
    </defs>
  )
}

function renderCartesianSeries(series: ChartSeries, index: number) {
  const color = getChartColor(series.key, index)

  if (series.type === 'area') {
    return (
      <Area
        key={series.key}
        dataKey={series.key}
        fill={series.gradient ? `url(#fill-${series.key})` : color}
        fillOpacity={series.fillOpacity ?? 0.35}
        stackId={series.stackId}
        stroke={color}
        strokeWidth={series.strokeWidth ?? 2}
        type={series.curveType ?? 'natural'}
        yAxisId={series.yAxisId}
      />
    )
  }

  if (series.type === 'line') {
    return (
      <Line
        key={series.key}
        dataKey={series.key}
        dot={series.showDot ?? false}
        stroke={color}
        strokeWidth={series.strokeWidth ?? 2}
        type={series.curveType ?? 'monotone'}
        yAxisId={series.yAxisId}
      />
    )
  }

  return (
    <Bar
      barSize={series.barSize}
      key={series.key}
      dataKey={series.key}
      fill={color}
      minPointSize={series.minPointSize}
      radius={series.radius}
      stackId={series.stackId}
      yAxisId={series.yAxisId}
    >
      {series.showLabel && (
        <LabelList
          dataKey={series.key}
          position={series.dataLabelPosition || 'right'}
          className="fill-foreground"
          fontSize={12}
        />
      )}
    </Bar>
  )
}
