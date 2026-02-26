'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { useVCList } from '@/hooks/use-vcs'
import type { VCListParams } from '@/hooks/use-vcs'
import { PermissionGate } from '@/components/layout/permission-gate'
import { Button } from '@/components/ui/button'
import { VCTable } from '@/components/vc/vc-table'
import { VCFilters } from '@/components/vc/vc-filters'

export default function VCListPage(): React.ReactElement {
  const [filters, setFilters] = useState<VCListParams>({
    page: 1,
    limit: 20,
  })

  const { data, isLoading } = useVCList(filters)

  function handleFilterChange(newFilters: VCListParams): void {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: 1,
    }))
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Verifiable Credentials
          </h1>
          <p className="text-muted-foreground">
            จัดการ Verifiable Credentials ทั้งหมดของสถาบัน
            {data && (
              <span className="ml-2 font-medium text-foreground">
                ({data.meta.total} รายการ)
              </span>
            )}
          </p>
        </div>
        <PermissionGate permission="vc:issue">
          <Button asChild>
            <Link href="/vcs/issue">
              <Plus className="mr-2 h-4 w-4" />
              ออก VC ใหม่
            </Link>
          </Button>
        </PermissionGate>
      </div>

      {/* Filters */}
      <VCFilters filters={filters} onFilterChange={handleFilterChange} />

      {/* Table */}
      <VCTable data={data?.data ?? []} isLoading={isLoading} />

      {/* Pagination Info */}
      {data && data.meta.total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            แสดง {(filters.page ?? 1 - 1) * (filters.limit ?? 20) + 1} -{' '}
            {Math.min(
              (filters.page ?? 1) * (filters.limit ?? 20),
              data.meta.total
            )}{' '}
            จาก {data.meta.total} รายการ
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={(filters.page ?? 1) <= 1}
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  page: (prev.page ?? 1) - 1,
                }))
              }
            >
              ก่อนหน้า
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={
                (filters.page ?? 1) * (filters.limit ?? 20) >= data.meta.total
              }
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  page: (prev.page ?? 1) + 1,
                }))
              }
            >
              ถัดไป
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
