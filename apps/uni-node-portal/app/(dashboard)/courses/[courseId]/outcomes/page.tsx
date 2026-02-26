'use client'

import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useCourseOutcomes } from '@/hooks/use-courses'
import { OutcomeEditor } from '@/components/course/outcome-editor'
import { Button } from '@/components/ui/button'

interface OutcomesPageProps {
  params: Promise<{ courseId: string }>
}

export default function OutcomesPage({
  params,
}: OutcomesPageProps): React.ReactElement {
  const { courseId } = use(params)
  const { data: outcomes, isLoading } = useCourseOutcomes(courseId)

  const outcomeItems = outcomes?.CFItems?.map((item, index) => ({
    identifier: item.identifier,
    fullStatement: item.fullStatement,
    humanCodingScheme: item.humanCodingScheme,
    bloomLevel: item.bloomLevel,
    sortOrder: item.sortOrder ?? index + 1,
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
            จัดการ Learning Outcomes: {courseId}
          </h1>
          <p className="text-muted-foreground">
            กำหนดผลลัพธ์การเรียนรู้ตามมาตรฐาน CASE v1.1
          </p>
        </div>
      </div>

      {/* Editor */}
      <OutcomeEditor
        courseId={courseId}
        outcomes={outcomeItems}
        isLoading={isLoading}
      />
    </div>
  )
}
