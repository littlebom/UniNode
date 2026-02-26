'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { DeliveryModeBreakdown } from '@/hooks/use-dashboard'

interface DeliveryChartProps {
  data: DeliveryModeBreakdown[] | undefined
  isLoading: boolean
}

const MODE_COLORS: Record<string, string> = {
  Onsite: '#2563eb',
  Online: '#16a34a',
  Hybrid: '#9333ea',
}

function getModeColor(mode: string): string {
  return MODE_COLORS[mode] ?? '#6b7280'
}

function DeliveryChartSkeleton(): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-36" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  )
}

export function DeliveryChart({ data, isLoading }: DeliveryChartProps): React.ReactElement {
  if (isLoading) {
    return <DeliveryChartSkeleton />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          รูปแบบการสอน
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data ?? []}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="mode"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid hsl(var(--border))',
                  backgroundColor: 'hsl(var(--card))',
                  fontSize: '13px',
                }}
                formatter={(value: number) => [
                  `${value.toLocaleString('th-TH')} วิชา`,
                  'จำนวน',
                ]}
              />
              <Bar dataKey="count" name="จำนวนวิชา" radius={[4, 4, 0, 0]}>
                {(data ?? []).map((entry) => (
                  <Cell key={entry.mode} fill={getModeColor(entry.mode)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
