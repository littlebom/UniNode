'use client'

import type { LISCourseTemplate, CASEDocument, CourseSyllabus } from '@unilink/dto'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface CourseDetailProps {
  course?: LISCourseTemplate
  outcomes?: CASEDocument
  syllabus?: CourseSyllabus[]
  isLoading: boolean
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

function DetailSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-3 gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="col-span-2 h-4 w-48" />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

function InfoRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-1 py-2 sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm sm:col-span-2">{children}</dd>
    </div>
  )
}

export function CourseDetail({
  course,
  outcomes,
  syllabus,
  isLoading,
}: CourseDetailProps): React.ReactElement {
  if (isLoading) {
    return <DetailSkeleton />
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <p className="text-lg font-medium text-muted-foreground">
          ไม่พบข้อมูลวิชา
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* General Info */}
      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลทั่วไป</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y">
            <InfoRow label="รหัสวิชา">
              <span className="font-mono font-medium">{course.courseId}</span>
            </InfoRow>
            <InfoRow label="ชื่อวิชา (EN)">
              {course.courseName}
            </InfoRow>
            <InfoRow label="ชื่อวิชา (TH)">
              {course.courseNameTH}
            </InfoRow>
            <InfoRow label="หน่วยกิต">
              <Badge variant="secondary">{course.credits} หน่วยกิต</Badge>
            </InfoRow>
            <InfoRow label="ประเภทวิชา">
              <Badge variant="outline">{course.courseType}</Badge>
            </InfoRow>
            <InfoRow label="รูปแบบการสอน">
              <Badge
                variant="outline"
                className={cn(
                  course.deliveryMode ? deliveryModeColors[course.deliveryMode] : ''
                )}
              >
                {course.deliveryMode}
              </Badge>
            </InfoRow>
            <InfoRow label="คณะ">{course.org?.faculty ?? '-'}</InfoRow>
            {course.org?.department && (
              <InfoRow label="ภาควิชา">{course.org.department}</InfoRow>
            )}
            <InfoRow label="สถานะ">
              <Badge
                variant="outline"
                className={cn(
                  course.isActive ? statusColors['active'] : statusColors['inactive']
                )}
              >
                {course.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
              </Badge>
            </InfoRow>
            {course.description && (
              <InfoRow label="คำอธิบายวิชา">
                <p className="whitespace-pre-wrap">{course.description}</p>
              </InfoRow>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Learning Outcomes */}
      <Card>
        <CardHeader>
          <CardTitle>Learning Outcomes</CardTitle>
        </CardHeader>
        <CardContent>
          {outcomes?.CFItems && outcomes.CFItems.length > 0 ? (
            <div className="space-y-3">
              {outcomes.CFItems
                .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                .map((item, index) => (
                  <div
                    key={item.identifier ?? index}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {item.sortOrder ?? index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm">{item.fullStatement}</p>
                      <div className="mt-1 flex items-center gap-2">
                        {item.humanCodingScheme && (
                          <Badge variant="outline" className="text-xs">
                            {item.humanCodingScheme}
                          </Badge>
                        )}
                        {item.bloomLevel && (
                          <Badge variant="secondary" className="text-xs">
                            {item.bloomLevel}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-6">
              ยังไม่มี Learning Outcomes
            </p>
          )}
        </CardContent>
      </Card>

      {/* Syllabus */}
      <Card>
        <CardHeader>
          <CardTitle>Syllabus</CardTitle>
        </CardHeader>
        <CardContent>
          {syllabus && syllabus.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px] text-center">สัปดาห์</TableHead>
                    <TableHead>หัวข้อ</TableHead>
                    <TableHead>รายละเอียด</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syllabus
                    .sort((a, b) => a.week - b.week)
                    .map((item) => (
                      <TableRow key={item.week}>
                        <TableCell className="text-center font-medium">
                          {item.week}
                        </TableCell>
                        <TableCell>{item.topic}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.description ?? '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-6">
              ยังไม่มีข้อมูล Syllabus
            </p>
          )}
        </CardContent>
      </Card>

      {/* Assessment info */}
      <Separator />
      <Card>
        <CardHeader>
          <CardTitle>การประเมิน</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            ดูข้อมูลการประเมินได้ในหน้าแก้ไขวิชา
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
