'use client'

import type { ComponentType, ReactNode } from 'react'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

type MetricTone = 'blue' | 'green' | 'purple' | 'yellow' | 'gray'

interface MetricCardProps {
  className?: string
  description: ReactNode
  footer?: ReactNode
  icon?: ComponentType<{ className?: string }>
  loading?: boolean
  title: ReactNode
  tone?: MetricTone
  value: ReactNode
}

const toneClasses: Record<MetricTone, string> = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200',
}

export function MetricCard({
  className,
  description,
  footer,
  icon: Icon,
  loading = false,
  title,
  tone = 'blue',
  value,
}: MetricCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 p-4">
        <div className="space-y-1">
          <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
            {title}
          </CardTitle>
          <CardDescription className="leading-relaxed">{description}</CardDescription>
        </div>
        {Icon && (
          <div className={cn('rounded-lg p-2', toneClasses[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {loading ? (
          <div className="h-9 w-28 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
        ) : (
          <div className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {value}
          </div>
        )}
      </CardContent>
      {footer && (
        <CardFooter className="px-4 pb-4 pt-0 text-xs text-gray-500 dark:text-gray-400">
          {footer}
        </CardFooter>
      )}
    </Card>
  )
}
