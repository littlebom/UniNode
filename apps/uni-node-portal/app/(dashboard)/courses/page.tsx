'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { useCourseList } from '@/hooks/use-courses'
import type { CourseListParams } from '@/hooks/use-courses'
import { CourseTable } from '@/components/course/course-table'
import { CourseFilters } from '@/components/course/course-filters'
import { Button } from '@/components/ui/button'
import { PermissionGate } from '@/components/layout/permission-gate'

export default function CoursesPage(): React.ReactElement {
  const [filters, setFilters] = useState<CourseListParams>({
    page: 1,
    limit: 20,
  })

  const { data, isLoading } = useCourseList(filters)

  function handleFilterChange(newFilters: CourseListParams): void {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }))
  }

  function handlePageChange(page: number): void {
    setFilters((prev) => ({ ...prev, page }))
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Course Catalog</h1>
          <p className="text-muted-foreground">
            จัดการรายวิชาและหลักสูตรทั้งหมดในระบบ
          </p>
        </div>
        <PermissionGate permission="course:create">
          <Button asChild>
            <Link href="/courses/new">
              <Plus className="mr-2 h-4 w-4" />
              สร้างวิชาใหม่
            </Link>
          </Button>
        </PermissionGate>
      </div>

      {/* Filters */}
      <CourseFilters filters={filters} onFilterChange={handleFilterChange} />

      {/* Table */}
      <CourseTable
        data={data?.data ?? []}
        isLoading={isLoading}
        page={filters.page ?? 1}
        totalPages={data?.meta.totalPages ?? 1}
        onPageChange={handlePageChange}
      />
    </div>
  )
}
