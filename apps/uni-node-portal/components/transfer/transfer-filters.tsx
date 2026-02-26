'use client'

import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TransferListParams } from '@/hooks/use-transfers'

interface TransferFiltersProps {
  filters: TransferListParams
  onFilterChange: (filters: TransferListParams) => void
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'pending', label: 'รออนุมัติ' },
  { value: 'approved', label: 'อนุมัติแล้ว' },
  { value: 'rejected', label: 'ปฏิเสธแล้ว' },
] as const

export function TransferFilters({
  filters,
  onFilterChange,
}: TransferFiltersProps): React.ReactElement {
  function handleSearchChange(value: string): void {
    onFilterChange({ ...filters, search: value || undefined, page: 1 })
  }

  function handleStatusChange(value: string): void {
    onFilterChange({
      ...filters,
      status: value === 'all' ? undefined : value,
      page: 1,
    })
  }

  function handleClear(): void {
    onFilterChange({ page: 1, limit: filters.limit })
  }

  const hasActiveFilters = !!filters.search || !!filters.status

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="ค้นหา Transfer ID, รหัสนักศึกษา, รหัสวิชา..."
          value={filters.search ?? ''}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select
        value={filters.status ?? 'all'}
        onValueChange={handleStatusChange}
      >
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="สถานะ" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={handleClear}>
          <X className="mr-1 h-4 w-4" />
          ล้างตัวกรอง
        </Button>
      )}
    </div>
  )
}
