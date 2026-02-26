'use client'

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { GradeDistribution } from '@/hooks/use-dashboard'

interface GradeChartProps {
  data: GradeDistribution[] | undefined
  isLoading: boolean
}

/** Hex colors mapped to each grade for Recharts pie slices */
const GRADE_COLORS: Record<string, string> = {
  'A': '#16a34a',
  'B+': '#2563eb',
  'B': '#3b82f6',
  'C+': '#ca8a04',
  'C': '#eab308',
  'D+': '#ea580c',
  'D': '#f97316',
  'F': '#dc2626',
  'S': '#9333ea',
  'U': '#6b7280',
  'W': '#9ca3af',
  'I': '#9ca3af',
}

function getGradeHexColor(grade: string): string {
  return GRADE_COLORS[grade] ?? '#6b7280'
}

function GradeChartSkeleton(): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="mx-auto h-[300px] w-[300px] rounded-full" />
      </CardContent>
    </Card>
  )
}

interface CustomLabelProps {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percent: number
  grade: string
}

function renderCustomLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  grade,
}: CustomLabelProps): React.ReactElement | null {
  if (percent < 0.05) return null

  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {grade}
    </text>
  )
}

export function GradeChart({ data, isLoading }: GradeChartProps): React.ReactElement {
  if (isLoading) {
    return <GradeChartSkeleton />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          สัดส่วน Grade
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data ?? []}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="count"
                nameKey="grade"
                label={renderCustomLabel}
                labelLine={false}
              >
                {(data ?? []).map((entry) => (
                  <Cell
                    key={entry.grade}
                    fill={getGradeHexColor(entry.grade)}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid hsl(var(--border))',
                  backgroundColor: 'hsl(var(--card))',
                  fontSize: '13px',
                }}
                formatter={(value: number, name: string) => [
                  `${value.toLocaleString('th-TH')} คน`,
                  `Grade ${name}`,
                ]}
              />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
