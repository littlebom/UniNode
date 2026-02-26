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
import type { ExternalListItem } from '@/hooks/use-external'

interface ExternalTableProps {
  data: ExternalListItem[]
  isLoading: boolean
}

type ExternalStatus = ExternalListItem['status']

interface StatusBadgeConfig {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
}

const STATUS_BADGE_MAP: Record<ExternalStatus, StatusBadgeConfig> = {
  pending: { label: 'รอตรวจสอบ', variant: 'secondary' },
  approved: { label: 'อนุมัติแล้ว', variant: 'default' },
  rejected: { label: 'ปฏิเสธแล้ว', variant: 'destructive' },
}

function getPlatformBadgeClass(platform: string): string {
  const lower = platform.toLowerCase()
  if (lower === 'coursera') return 'bg-blue-100 text-blue-700'
  if (lower === 'edx') return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-700'
}

function truncateId(id: string, length: number = 8): string {
  if (id.length <= length) return id
  return `${id.slice(0, length)}...`
}

function ExternalTableSkeleton(): React.ReactElement {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Request ID</TableHead>
          <TableHead>นักศึกษา</TableHead>
          <TableHead>แพลตฟอร์ม</TableHead>
          <TableHead>ชื่อคอร์ส</TableHead>
          <TableHead>สถาบัน</TableHead>
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
            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
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

export function ExternalTable({ data, isLoading }: ExternalTableProps): React.ReactElement {
  if (isLoading) {
    return <ExternalTableSkeleton />
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">
          ไม่พบรายการ External Credential
        </p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Request ID</TableHead>
          <TableHead>นักศึกษา</TableHead>
          <TableHead>แพลตฟอร์ม</TableHead>
          <TableHead>ชื่อคอร์ส</TableHead>
          <TableHead>สถาบัน</TableHead>
          <TableHead>สถานะ</TableHead>
          <TableHead>วันที่ขอ</TableHead>
          <TableHead className="w-[80px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => {
          const statusConfig = STATUS_BADGE_MAP[item.status]
          return (
            <TableRow key={item.requestId}>
              <TableCell className="font-mono text-sm">
                {truncateId(item.requestId)}
              </TableCell>
              <TableCell>{item.studentId}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={getPlatformBadgeClass(item.platform)}
                >
                  {item.platform}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-sm">
                {item.courseName}
              </TableCell>
              <TableCell className="text-sm">{item.institution}</TableCell>
              <TableCell>
                <Badge variant={statusConfig.variant}>
                  {statusConfig.label}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatThaiDateFromISO(item.requestedAt)}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/external/${item.requestId}`}>
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
