'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useCoursePopularity } from '@/hooks/use-reports'

function getPassRateColor(rate: number): string {
  if (rate >= 80) return 'bg-emerald-500'
  if (rate >= 60) return 'bg-blue-500'
  if (rate >= 40) return 'bg-amber-500'
  return 'bg-red-500'
}

function PassRateBar({ rate }: { rate: number }): React.ReactElement {
  return (
    <div className="flex items-center gap-3">
      <div className="h-2.5 w-24 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', getPassRateColor(rate))}
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>
      <span className="text-sm font-medium tabular-nums">
        {rate.toFixed(1)}%
      </span>
    </div>
  )
}

function CoursePopularitySkeleton(): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function CoursePopularity(): React.ReactElement {
  const { data, isLoading } = useCoursePopularity()

  if (isLoading) {
    return <CoursePopularitySkeleton />
  }

  const courses = data?.topCourses ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          วิชายอดนิยม
        </CardTitle>
      </CardHeader>
      <CardContent>
        {courses.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            ไม่มีข้อมูลวิชา
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>รหัสวิชา</TableHead>
                <TableHead>ชื่อวิชา</TableHead>
                <TableHead className="text-right">จำนวน VC</TableHead>
                <TableHead>อัตราผ่าน</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course, index) => (
                <TableRow key={course.courseId}>
                  <TableCell className="font-medium text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {course.courseId}
                  </TableCell>
                  <TableCell>{course.courseName}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {course.vcCount.toLocaleString('th-TH')}
                  </TableCell>
                  <TableCell>
                    <PassRateBar rate={course.passRate} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
