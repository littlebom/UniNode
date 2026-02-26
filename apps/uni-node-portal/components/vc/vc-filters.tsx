'use client'

import { useCallback } from 'react'
import { Search, X } from 'lucide-react'
import type { VCListParams } from '@/hooks/use-vcs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface VCFiltersProps {
  filters: VCListParams
  onFilterChange: (filters: VCListParams) => void
}

export function VCFilters({
  filters,
  onFilterChange,
}: VCFiltersProps): React.ReactElement {
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      onFilterChange({ search: e.target.value || undefined })
    },
    [onFilterChange]
  )

  const handleStatusChange = useCallback(
    (value: string): void => {
      onFilterChange({ status: value === 'all' ? undefined : value })
    },
    [onFilterChange]
  )

  const handleVCTypeChange = useCallback(
    (value: string): void => {
      onFilterChange({ vcType: value === 'all' ? undefined : value })
    },
    [onFilterChange]
  )

  const handleSemesterChange = useCallback(
    (value: string): void => {
      onFilterChange({ semester: value === 'all' ? undefined : value })
    },
    [onFilterChange]
  )

  const handleClearFilters = useCallback((): void => {
    onFilterChange({
      search: undefined,
      status: undefined,
      vcType: undefined,
      semester: undefined,
      academicYear: undefined,
    })
  }, [onFilterChange])

  const hasActiveFilters =
    filters.search ||
    filters.status ||
    filters.vcType ||
    filters.semester ||
    filters.academicYear

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="ค้นหา VC ID, รหัสนักศึกษา, รหัสวิชา..."
          value={filters.search ?? ''}
          onChange={handleSearchChange}
          className="pl-9"
        />
      </div>

      {/* Status Select */}
      <Select
        value={filters.status ?? 'all'}
        onValueChange={handleStatusChange}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="สถานะ" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">ทั้งหมด</SelectItem>
          <SelectItem value="issued">ออกแล้ว</SelectItem>
          <SelectItem value="revoked">ยกเลิกแล้ว</SelectItem>
        </SelectContent>
      </Select>

      {/* VC Type Select */}
      <Select
        value={filters.vcType ?? 'all'}
        onValueChange={handleVCTypeChange}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="ประเภท" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">ทั้งหมด</SelectItem>
          <SelectItem value="CourseCreditCredential">Course Credit</SelectItem>
          <SelectItem value="DegreeCredential">Degree</SelectItem>
          <SelectItem value="AchievementCredential">Achievement</SelectItem>
        </SelectContent>
      </Select>

      {/* Semester Select */}
      <Select
        value={filters.semester ?? 'all'}
        onValueChange={handleSemesterChange}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="ภาคเรียน" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">ทั้งหมด</SelectItem>
          <SelectItem value="1">ภาคเรียนที่ 1</SelectItem>
          <SelectItem value="2">ภาคเรียนที่ 2</SelectItem>
          <SelectItem value="S">ภาคฤดูร้อน</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="text-muted-foreground"
        >
          <X className="mr-1 h-4 w-4" />
          ล้างตัวกรอง
        </Button>
      )}
    </div>
  )
}
