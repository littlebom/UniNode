'use client'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { formatThaiDateFromISO } from '@unilink/ui'
import type { TransferDetail as TransferDetailType } from '@/hooks/use-transfers'

interface TransferDetailProps {
  transfer: TransferDetailType
  isLoading: boolean
}

type TransferStatus = TransferDetailType['status']

interface StatusBadgeConfig {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
}

const STATUS_BADGE_MAP: Record<TransferStatus, StatusBadgeConfig> = {
  pending: { label: 'รออนุมัติ', variant: 'secondary' },
  approved: { label: 'อนุมัติแล้ว', variant: 'default' },
  rejected: { label: 'ปฏิเสธแล้ว', variant: 'destructive' },
}

function getGradeBadgeVariant(
  grade: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const upper = grade.toUpperCase()
  if (upper === 'A' || upper === 'A+') return 'default'
  if (upper === 'B' || upper === 'B+') return 'secondary'
  if (upper === 'F') return 'destructive'
  return 'outline'
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
      <span className="min-w-[140px] text-sm font-medium text-muted-foreground">
        {label}
      </span>
      <div className="text-sm">{children}</div>
    </div>
  )
}

function DetailSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export function TransferDetailView({
  transfer,
  isLoading,
}: TransferDetailProps): React.ReactElement {
  if (isLoading) {
    return <DetailSkeleton />
  }

  const statusConfig = STATUS_BADGE_MAP[transfer.status]

  return (
    <div className="space-y-6">
      {/* Section 1: Transfer Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            ข้อมูลการโอน
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <DetailRow label="Transfer ID">
            <code className="rounded bg-muted px-2 py-0.5 font-mono text-sm">
              {transfer.transferId}
            </code>
          </DetailRow>
          <DetailRow label="รหัสนักศึกษา">{transfer.studentId}</DetailRow>
          <DetailRow label="สถานะ">
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          </DetailRow>
          <DetailRow label="วันที่ขอ">
            {formatThaiDateFromISO(transfer.requestedAt)}
          </DetailRow>
          {transfer.decidedAt && (
            <DetailRow label="วันที่ตัดสินใจ">
              {formatThaiDateFromISO(transfer.decidedAt)}
            </DetailRow>
          )}
          {transfer.decidedBy && (
            <DetailRow label="ผู้ตัดสินใจ">{transfer.decidedBy}</DetailRow>
          )}
          {transfer.reviewNote && (
            <>
              <Separator />
              <DetailRow label="หมายเหตุ">{transfer.reviewNote}</DetailRow>
            </>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Source VC Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            ข้อมูล VC ต้นทาง
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {transfer.sourceVcId && (
            <DetailRow label="VC ID">
              <code className="rounded bg-muted px-2 py-0.5 font-mono text-sm">
                {transfer.sourceVcId}
              </code>
            </DetailRow>
          )}
          <DetailRow label="รหัสวิชา">{transfer.sourceCourseId}</DetailRow>
          {transfer.sourceCourseName && (
            <DetailRow label="ชื่อวิชา">
              {transfer.sourceCourseName}
            </DetailRow>
          )}
          {transfer.sourceGrade && (
            <DetailRow label="เกรด">
              <Badge variant={getGradeBadgeVariant(transfer.sourceGrade)}>
                {transfer.sourceGrade}
              </Badge>
            </DetailRow>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Target Course Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            วิชาปลายทาง
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <DetailRow label="Node ID">{transfer.targetNodeId}</DetailRow>
          <DetailRow label="รหัสวิชา">{transfer.targetCourseId}</DetailRow>
          {transfer.targetCourseName && (
            <DetailRow label="ชื่อวิชา">
              {transfer.targetCourseName}
            </DetailRow>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
