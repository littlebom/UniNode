'use client'

import Link from 'next/link'
import { Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatThaiDateFromISO } from '@unilink/ui'
import type { TransferListItem } from '@/hooks/use-transfers'

interface TransferTableProps {
  data: TransferListItem[]
  isLoading: boolean
}

type TransferStatus = TransferListItem['status']

interface StatusBadgeConfig {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
}

const STATUS_BADGE_MAP: Record<TransferStatus, StatusBadgeConfig> = {
  pending: { label: 'รออนุมัติ', variant: 'secondary' },
  approved: { label: 'อนุมัติแล้ว', variant: 'default' },
  rejected: { label: 'ปฏิเสธแล้ว', variant: 'destructive' },
}

function truncateId(id: string, length: number = 8): string {
  if (id.length <= length) return id
  return `${id.slice(0, length)}...`
}

function TransferTableSkeleton(): React.ReactElement {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Transfer ID</TableHead>
          <TableHead>นักศึกษา</TableHead>
          <TableHead>วิชาต้นทาง</TableHead>
          <TableHead>วิชาปลายทาง</TableHead>
          <TableHead>สถานะ</TableHead>
          <TableHead>วันที่ขอ</TableHead>
          <TableHead className="w-[80px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
            <TableCell><Skeleton className="h-8 w-8" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function TransferTable({ data, isLoading }: TransferTableProps): React.ReactElement {
  if (isLoading) {
    return <TransferTableSkeleton />
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">
          ไม่พบรายการ Credit Transfer
        </p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Transfer ID</TableHead>
          <TableHead>นักศึกษา</TableHead>
          <TableHead>วิชาต้นทาง</TableHead>
          <TableHead>วิชาปลายทาง</TableHead>
          <TableHead>สถานะ</TableHead>
          <TableHead>วันที่ขอ</TableHead>
          <TableHead className="w-[80px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((transfer) => {
          const statusConfig = STATUS_BADGE_MAP[transfer.status]
          return (
            <TableRow key={transfer.transferId}>
              <TableCell className="font-mono text-sm">
                {truncateId(transfer.transferId)}
              </TableCell>
              <TableCell>{transfer.studentId}</TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {transfer.sourceCourseId}
                  </span>
                  {transfer.sourceCourseName && (
                    <span className="text-xs text-muted-foreground">
                      {transfer.sourceCourseName}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {transfer.targetCourseId}
                  </span>
                  {transfer.targetCourseName && (
                    <span className="text-xs text-muted-foreground">
                      {transfer.targetCourseName}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={statusConfig.variant}>
                  {statusConfig.label}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatThaiDateFromISO(transfer.requestedAt)}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/transfers/${transfer.transferId}`}>
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">ดูรายละเอียด</span>
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
