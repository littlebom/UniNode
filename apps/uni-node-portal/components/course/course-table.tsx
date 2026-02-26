'use client'

import Link from 'next/link'
import { Eye } from 'lucide-react'
import type { LISCourseTemplate } from '@unilink/dto'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface CourseTableProps {
  data: LISCourseTemplate[]
  isLoading: boolean
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

const deliveryModeColors: Record<string, string> = {
  Onsite: 'bg-green-100 text-green-800 border-green-200',
  Online: 'bg-blue-100 text-blue-800 border-blue-200',
  Hybrid: 'bg-purple-100 text-purple-800 border-purple-200',
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 border-green-200',
  inactive: 'bg-gray-100 text-gray-600 border-gray-200',
}

function TableSkeleton(): React.ReactElement {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell>
            <div className="space-y-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-32" />
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-4 w-8" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-5 w-14" /></TableCell>
          <TableCell><Skeleton className="h-8 w-8" /></TableCell>
        </TableRow>
      ))}
    </>
  )
}

export function CourseTable({
  data,
  isLoading,
  page,
  totalPages,
  onPageChange,
}: CourseTableProps): React.ReactElement {
  if (!isLoading && data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <p className="text-lg font-medium text-muted-foreground">
          ไม่พบรายวิชา
        </p>
        <p className="text-sm text-muted-foreground">
          ยังไม่มีรายวิชาในระบบ หรือไม่ตรงกับตัวกรองที่เลือก
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">รหัสวิชา</TableHead>
              <TableHead>ชื่อวิชา</TableHead>
              <TableHead className="w-[80px] text-center">หน่วยกิต</TableHead>
              <TableHead className="w-[100px]">ประเภท</TableHead>
              <TableHead className="w-[100px]">รูปแบบ</TableHead>
              <TableHead>คณะ</TableHead>
              <TableHead className="w-[90px]">สถานะ</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton />
            ) : (
              data.map((course) => (
                <TableRow key={course.courseId}>
                  <TableCell className="font-mono text-sm font-medium">
                    {course.courseId}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{course.courseName}</p>
                      <p className="text-sm text-muted-foreground">
                        {course.courseNameTH}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {course.credits}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{course.courseType}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        course.deliveryMode ? deliveryModeColors[course.deliveryMode] : ''
                      )}
                    >
                      {course.deliveryMode}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{course.org?.faculty ?? '-'}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        course.isActive ? statusColors['active'] : statusColors['inactive']
                      )}
                    >
                      {course.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/courses/${course.courseId}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            หน้า {page} จาก {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              ก่อนหน้า
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              ถัดไป
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
