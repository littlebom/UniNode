'use client'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface LOComparisonProps {
  loMatchPercentage?: number
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

function getMatchLabel(percentage: number): string {
  if (percentage >= 80) return 'ตรงกันสูง'
  if (percentage >= 60) return 'ตรงกันปานกลาง'
  return 'ตรงกันต่ำ'
}

function getMatchRingColor(percentage: number): string {
  if (percentage >= 80) return 'stroke-emerald-500'
  if (percentage >= 60) return 'stroke-amber-500'
  return 'stroke-red-500'
}

export function LOComparison({
  loMatchPercentage,
}: LOComparisonProps): React.ReactElement {
  if (loMatchPercentage == null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Learning Outcome Match
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm text-muted-foreground">
            ไม่มีข้อมูล LO Match
          </p>
        </CardContent>
      </Card>
    )
  }

  const percentage = Math.min(loMatchPercentage, 100)
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Learning Outcome Match
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4">
          {/* Circular Progress */}
          <div className="relative h-32 w-32">
            <svg
              className="h-32 w-32 -rotate-90"
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className={cn('transition-all duration-500', getMatchRingColor(percentage))}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={cn(
                  'text-2xl font-bold',
                  getMatchColor(percentage),
                )}
              >
                {percentage}%
              </span>
            </div>
          </div>

          {/* Label */}
          <div className="text-center">
            <p
              className={cn(
                'text-sm font-semibold',
                getMatchColor(percentage),
              )}
            >
              {getMatchLabel(percentage)}
            </p>
          </div>

          {/* Bar Progress */}
          <div className="w-full">
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  getMatchBgColor(percentage),
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
