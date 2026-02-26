'use client'

import { useState } from 'react'
import { Globe } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useExternalList } from '@/hooks/use-external'
import type { ExternalListParams } from '@/hooks/use-external'
import { ExternalTable } from '@/components/external/external-table'

const STATUS_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'pending', label: 'รอตรวจสอบ' },
  { value: 'approved', label: 'อนุมัติแล้ว' },
  { value: 'rejected', label: 'ปฏิเสธแล้ว' },
] as const

export default function ExternalPage(): React.ReactElement {
  const [filters, setFilters] = useState<ExternalListParams>({
    page: 1,
    limit: 20,
  })

  const { data, isLoading } = useExternalList(filters)

  const items = data?.data ?? []

  function handleStatusChange(value: string): void {
    setFilters((prev) => ({
      ...prev,
      status: value === 'all' ? undefined : value,
      page: 1,
    }))
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          External Credentials
        </h1>
        <p className="text-muted-foreground">
          ตรวจสอบและอนุมัติ Credential จากแพลตฟอร์มภายนอก (Coursera, edX ฯลฯ)
        </p>
      </div>

      {/* Filters + Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base font-semibold">
              รายการ External Credential
            </CardTitle>
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
          </div>
        </CardHeader>
        <CardContent>
          <ExternalTable data={items} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  )
}
