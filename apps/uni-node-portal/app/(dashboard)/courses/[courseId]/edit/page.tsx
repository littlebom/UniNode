'use client'

import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useCourseDetail } from '@/hooks/use-courses'
import { CourseForm } from '@/components/course/course-form'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface EditCoursePageProps {
  params: Promise<{ courseId: string }>
}

export default function EditCoursePage({
  params,
}: EditCoursePageProps): React.ReactElement {
  const { courseId } = use(params)
  const { data: course, isLoading } = useCourseDetail(courseId)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/courses/${courseId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isLoading ? (
              <Skeleton className="h-8 w-64" />
            ) : (
              `แก้ไขวิชา: ${courseId}`
            )}
          </h1>
          <p className="text-muted-foreground">
            แก้ไขข้อมูลรายวิชาตามมาตรฐาน LIS v2.0
          </p>
        </div>
      </div>

      {/* Form */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : course ? (
        <CourseForm
          mode="edit"
          courseId={courseId}
          defaultValues={{
            courseId: course.courseId,
            courseName: course.courseName,
            courseNameTH: course.courseNameTH,
            credits: course.credits,
            courseType: course.courseType,
            deliveryMode: course.deliveryMode as 'Onsite' | 'Online' | 'Hybrid',
            faculty: course.org?.faculty ?? '',
            department: course.org?.department ?? '',
            description: course.description,
          }}
        />
      ) : null}
    </div>
  )
}
