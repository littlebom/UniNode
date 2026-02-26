'use client'

import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Pencil, ListTree, CalendarDays } from 'lucide-react'
import { useCourseDetail, useCourseOutcomes, useCourseSyllabus } from '@/hooks/use-courses'
import { CourseDetail } from '@/components/course/course-detail'
import { Button } from '@/components/ui/button'
import { PermissionGate } from '@/components/layout/permission-gate'

interface CourseDetailPageProps {
  params: Promise<{ courseId: string }>
}

export default function CourseDetailPage({
  params,
}: CourseDetailPageProps): React.ReactElement {
  const { courseId } = use(params)
  const { data: course, isLoading: courseLoading } = useCourseDetail(courseId)
  const { data: outcomes, isLoading: outcomesLoading } = useCourseOutcomes(courseId)
  const { data: syllabus, isLoading: syllabusLoading } = useCourseSyllabus(courseId)

  const isLoading = courseLoading || outcomesLoading || syllabusLoading

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/courses">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {course ? `${course.courseId} - ${course.courseNameTH}` : 'รายละเอียดวิชา'}
            </h1>
            <p className="text-muted-foreground">
              รายละเอียดวิชาและข้อมูลหลักสูตร
            </p>
          </div>
        </div>

        <PermissionGate permission="course:edit">
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={`/courses/${courseId}/outcomes`}>
                <ListTree className="mr-2 h-4 w-4" />
                จัดการ LO
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/courses/${courseId}/syllabus`}>
                <CalendarDays className="mr-2 h-4 w-4" />
                จัดการ Syllabus
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/courses/${courseId}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                แก้ไข
              </Link>
            </Button>
          </div>
        </PermissionGate>
      </div>

      {/* Detail View */}
      <CourseDetail
        course={course}
        outcomes={outcomes}
        syllabus={syllabus}
        isLoading={isLoading}
      />
    </div>
  )
}
