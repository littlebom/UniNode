'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CourseForm } from '@/components/course/course-form'
import { Button } from '@/components/ui/button'

export default function CreateCoursePage(): React.ReactElement {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/courses">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">สร้างวิชาใหม่</h1>
          <p className="text-muted-foreground">
            กรอกข้อมูลรายวิชาตามมาตรฐาน LIS v2.0
          </p>
        </div>
      </div>

      {/* Form */}
      <CourseForm mode="create" />
    </div>
  )
}
