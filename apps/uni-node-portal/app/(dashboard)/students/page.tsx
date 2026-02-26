'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useStudentList } from '@/hooks/use-students'
import type { StudentListParams } from '@/hooks/use-students'
import { StudentTable } from '@/components/student/student-table'

export default function StudentsPage(): React.ReactElement {
  const [filters, setFilters] = useState<StudentListParams>({
    page: 1,
    limit: 20,
  })

  const { data, isLoading } = useStudentList(filters)

  const students = data?.data ?? []

  function handleSearchChange(value: string): void {
    setFilters((prev) => ({ ...prev, search: value || undefined, page: 1 }))
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">นักศึกษา</h1>
        <p className="text-muted-foreground">
          จัดการข้อมูลนักศึกษาและดูประวัติ Verifiable Credentials
        </p>
      </div>

      {/* Search + Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base font-semibold">
              รายชื่อนักศึกษา
            </CardTitle>
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ค้นหารหัสนักศึกษา, DID..."
                value={filters.search ?? ''}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <StudentTable data={students} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  )
}
