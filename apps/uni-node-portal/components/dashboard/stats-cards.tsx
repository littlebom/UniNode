'use client'

import {
  FileCheck,
  CalendarDays,
  ArrowLeftRight,
  Globe,
  GraduationCap,
  BookOpen,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { DashboardStats } from '@/hooks/use-dashboard'

interface StatsCardsProps {
  stats: DashboardStats | undefined
  isLoading: boolean
}

interface StatCardConfig {
  label: string
  key: keyof DashboardStats
  icon: LucideIcon
  colorClass: string
  amberWhenPositive: boolean
}

const statCards: StatCardConfig[] = [
  {
    label: 'VC ที่ออกทั้งหมด',
    key: 'totalVCsIssued',
    icon: FileCheck,
    colorClass: 'text-primary-600 bg-primary-50',
    amberWhenPositive: false,
  },
  {
    label: 'VC เดือนนี้',
    key: 'vcsIssuedThisMonth',
    icon: CalendarDays,
    colorClass: 'text-blue-600 bg-blue-50',
    amberWhenPositive: false,
  },
  {
    label: 'Transfer รออนุมัติ',
    key: 'pendingTransfers',
    icon: ArrowLeftRight,
    colorClass: 'text-slate-600 bg-slate-50',
    amberWhenPositive: true,
  },
  {
    label: 'External VC รออนุมัติ',
    key: 'pendingExternalReviews',
    icon: Globe,
    colorClass: 'text-slate-600 bg-slate-50',
    amberWhenPositive: true,
  },
  {
    label: 'นักศึกษา Active',
    key: 'activeStudents',
    icon: GraduationCap,
    colorClass: 'text-emerald-600 bg-emerald-50',
    amberWhenPositive: false,
  },
  {
    label: 'วิชาทั้งหมด',
    key: 'totalCourses',
    icon: BookOpen,
    colorClass: 'text-violet-600 bg-violet-50',
    amberWhenPositive: false,
  },
]

function getIconColorClass(config: StatCardConfig, value: number): string {
  if (config.amberWhenPositive && value > 0) {
    return 'text-amber-600 bg-amber-50'
  }
  return config.colorClass
}

function StatCardSkeleton(): React.ReactElement {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-12 w-12 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}

export function StatsCards({ stats, isLoading }: StatsCardsProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {statCards.map((config) => {
        const value = stats?.[config.key] ?? 0
        const Icon = config.icon
        const iconColor = getIconColorClass(config, value)

        return (
          <Card key={config.key}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {config.label}
                  </p>
                  <p className="mt-1 text-3xl font-bold tracking-tight">
                    {value.toLocaleString('th-TH')}
                  </p>
                </div>
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-lg',
                    iconColor,
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
