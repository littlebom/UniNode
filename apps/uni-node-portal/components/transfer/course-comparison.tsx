'use client'

import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { TransferDetail } from '@/hooks/use-transfers'

interface CourseComparisonProps {
  transfer: TransferDetail
}

function getGradeBadgeVariant(
  grade: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const upper = grade.toUpperCase()
  if (upper === 'A' || upper === 'A+') return 'default'
  if (upper === 'B' || upper === 'B+') return 'secondary'
  if (upper === 'F') return 'destructive'
  return 'outline'
}

function getMatchColor(percentage: number): string {
  if (percentage >= 80) return 'text-emerald-600'
  if (percentage >= 60) return 'text-amber-600'
  return 'text-red-600'
}

function getMatchBgColor(percentage: number): string {
  if (percentage >= 80) return 'bg-emerald-500'
  if (percentage >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}

export function CourseComparison({
  transfer,
}: CourseComparisonProps): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          เปรียบเทียบวิชา
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr]">
          {/* Source Course */}
          <div className="rounded-lg border p-4">
            <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
              วิชาต้นทาง
            </p>
            <p className="text-sm font-semibold">{transfer.sourceCourseId}</p>
            {transfer.sourceCourseName && (
              <p className="mt-1 text-sm text-muted-foreground">
                {transfer.sourceCourseName}
              </p>
            )}
            {transfer.sourceGrade && (
              <div className="mt-3">
                <span className="mr-2 text-xs text-muted-foreground">
                  เกรด:
                </span>
                <Badge variant={getGradeBadgeVariant(transfer.sourceGrade)}>
                  {transfer.sourceGrade}
                </Badge>
              </div>
            )}
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center">
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
          </div>

          {/* Target Course */}
          <div className="rounded-lg border p-4">
            <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
              วิชาปลายทาง
            </p>
            <p className="text-sm font-semibold">{transfer.targetCourseId}</p>
            {transfer.targetCourseName && (
              <p className="mt-1 text-sm text-muted-foreground">
                {transfer.targetCourseName}
              </p>
            )}
            <div className="mt-3">
              <span className="text-xs text-muted-foreground">
                Node: {transfer.targetNodeId}
              </span>
            </div>
          </div>
        </div>

        {/* LO Match Percentage */}
        {transfer.loMatchPercentage != null && (
          <div className="mt-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Learning Outcome Match
              </span>
              <span
                className={cn(
                  'text-lg font-bold',
                  getMatchColor(transfer.loMatchPercentage),
                )}
              >
                {transfer.loMatchPercentage}%
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  getMatchBgColor(transfer.loMatchPercentage),
                )}
                style={{ width: `${Math.min(transfer.loMatchPercentage, 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
