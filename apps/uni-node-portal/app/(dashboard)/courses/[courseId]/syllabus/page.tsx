'use client'

import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useCourseSyllabus } from '@/hooks/use-courses'
import { SyllabusEditor } from '@/components/course/syllabus-editor'
import { Button } from '@/components/ui/button'

interface SyllabusPageProps {
  params: Promise<{ courseId: string }>
}

export default function SyllabusPage({
  params,
}: SyllabusPageProps): React.ReactElement {
  const { courseId } = use(params)
  const { data: syllabus, isLoading } = useCourseSyllabus(courseId)

  const syllabusItems = syllabus?.map((item) => ({
    week: item.week,
    topic: item.topic,
    description: item.description,
  })) ?? []

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
            จัดการ Syllabus: {courseId}
          </h1>
          <p className="text-muted-foreground">
            กำหนดหัวข้อการสอนรายสัปดาห์ (16 สัปดาห์)
          </p>
        </div>
      </div>

      {/* Editor */}
      <SyllabusEditor
        courseId={courseId}
        syllabus={syllabusItems}
        isLoading={isLoading}
      />
    </div>
  )
}
