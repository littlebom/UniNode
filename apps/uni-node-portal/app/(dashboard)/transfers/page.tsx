'use client'

import { useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTransferList } from '@/hooks/use-transfers'
import type { TransferListParams } from '@/hooks/use-transfers'
import { TransferTable } from '@/components/transfer/transfer-table'
import { TransferFilters } from '@/components/transfer/transfer-filters'

export default function TransfersPage(): React.ReactElement {
  const [filters, setFilters] = useState<TransferListParams>({
    page: 1,
    limit: 20,
  })

  const { data, isLoading } = useTransferList(filters)

  const transfers = data?.data ?? []
  const pendingCount = transfers.filter((t) => t.status === 'pending').length

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Credit Transfer
          </h1>
          <p className="text-muted-foreground">
            จัดการคำขอโอนหน่วยกิตระหว่างสถาบัน
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="secondary" className="gap-1.5 bg-amber-100 text-amber-700">
            <ArrowLeftRight className="h-3.5 w-3.5" />
            {pendingCount} รออนุมัติ
          </Badge>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <TransferFilters filters={filters} onFilterChange={setFilters} />
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            รายการ Credit Transfer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TransferTable data={transfers} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  )
}
