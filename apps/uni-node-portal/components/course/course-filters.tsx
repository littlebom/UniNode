'use client'

import { Search, X } from 'lucide-react'
import type { CourseListParams } from '@/hooks/use-courses'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CourseFiltersProps {
  filters: CourseListParams
  onFilterChange: (filters: CourseListParams) => void
}

export function CourseFilters({
  filters,
  onFilterChange,
}: CourseFiltersProps): React.ReactElement {
  const hasActiveFilters =
    !!filters.search ||
    !!filters.faculty ||
    !!filters.deliveryMode ||
    !!filters.credits

  function handleClear(): void {
    onFilterChange({
      search: undefined,
      faculty: undefined,
      deliveryMode: undefined,
      credits: undefined,
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="ค้นหารหัสวิชาหรือชื่อวิชา..."
          className="pl-9"
          value={filters.search ?? ''}
          onChange={(e) =>
            onFilterChange({ search: e.target.value || undefined })
          }
        />
      </div>

      {/* Faculty */}
      <Input
        placeholder="คณะ"
        className="w-[180px]"
        value={filters.faculty ?? ''}
        onChange={(e) =>
          onFilterChange({ faculty: e.target.value || undefined })
        }
      />

      {/* Delivery Mode */}
      <Select
        value={filters.deliveryMode ?? 'all'}
        onValueChange={(value) =>
          onFilterChange({
            deliveryMode: value === 'all' ? undefined : value,
          })
        }
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="รูปแบบการสอน" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">ทุกรูปแบบ</SelectItem>
          <SelectItem value="Onsite">Onsite</SelectItem>
          <SelectItem value="Online">Online</SelectItem>
          <SelectItem value="Hybrid">Hybrid</SelectItem>
        </SelectContent>
      </Select>

      {/* Credits */}
      <Select
        value={filters.credits?.toString() ?? 'all'}
        onValueChange={(value) =>
          onFilterChange({
            credits: value === 'all' ? undefined : Number(value),
          })
        }
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="หน่วยกิต" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">ทุกหน่วยกิต</SelectItem>
          <SelectItem value="1">1 หน่วยกิต</SelectItem>
          <SelectItem value="2">2 หน่วยกิต</SelectItem>
          <SelectItem value="3">3 หน่วยกิต</SelectItem>
          <SelectItem value="4">4 หน่วยกิต</SelectItem>
          <SelectItem value="6">6 หน่วยกิต</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={handleClear}>
          <X className="mr-1 h-4 w-4" />
          ล้างตัวกรอง
        </Button>
      )}
    </div>
  )
}
