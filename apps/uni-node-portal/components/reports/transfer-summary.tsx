'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import {
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useTransferSummary } from '@/hooks/use-reports'

interface StatConfig {
  label: string
  key: 'successRate' | 'totalApproved' | 'totalRejected' | 'totalPending'
  icon: typeof CheckCircle
  colorClass: string
  format: (value: number) => string
}

const statConfigs: StatConfig[] = [
  {
    label: 'อัตราอนุมัติ',
    key: 'successRate',
    icon: TrendingUp,
    colorClass: 'text-blue-600 bg-blue-50',
    format: (v: number) => `${v.toFixed(1)}%`,
  },
  {
    label: 'อนุมัติ',
    key: 'totalApproved',
    icon: CheckCircle,
    colorClass: 'text-emerald-600 bg-emerald-50',
    format: (v: number) => v.toLocaleString('th-TH'),
  },
  {
    label: 'ปฏิเสธ',
    key: 'totalRejected',
    icon: XCircle,
    colorClass: 'text-red-600 bg-red-50',
    format: (v: number) => v.toLocaleString('th-TH'),
  },
  {
    label: 'รอดำเนินการ',
    key: 'totalPending',
    icon: Clock,
    colorClass: 'text-amber-600 bg-amber-50',
    format: (v: number) => v.toLocaleString('th-TH'),
  },
]

function TransferSummarySkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-12 w-12 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

export function TransferSummary(): React.ReactElement {
  const { data, isLoading } = useTransferSummary()

  if (isLoading) {
    return <TransferSummarySkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statConfigs.map((config) => {
          const value = data?.[config.key] ?? 0
          const Icon = config.icon

          return (
            <Card key={config.key}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {config.label}
                    </p>
                    <p className="mt-1 text-3xl font-bold tracking-tight">
                      {config.format(value)}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-lg',
                      config.colorClass,
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

      {/* Stacked Bar Chart: รายเดือน */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            สถิติ Credit Transfer รายเดือน
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data?.byMonth ?? []}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  className="text-muted-foreground"
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    backgroundColor: 'hsl(var(--card))',
                    fontSize: '13px',
                  }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="square"
                  iconSize={10}
                  wrapperStyle={{ fontSize: '12px' }}
                />
                <Bar
                  dataKey="approved"
                  name="อนุมัติ"
                  stackId="transfer"
                  fill="#16a34a"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="rejected"
                  name="ปฏิเสธ"
                  stackId="transfer"
                  fill="#dc2626"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
