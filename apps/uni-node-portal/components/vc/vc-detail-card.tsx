'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VCDetail } from '@/hooks/use-vcs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

interface VCDetailCardProps {
  vc: VCDetail
  isLoading: boolean
}

const vcTypeLabels: Record<string, string> = {
  CourseCreditCredential: 'Course Credit Credential',
  DegreeCredential: 'Degree Credential',
  AchievementCredential: 'Achievement Credential',
}

const vcTypeColors: Record<string, string> = {
  CourseCreditCredential: 'bg-blue-100 text-blue-800 border-blue-200',
  DegreeCredential: 'bg-purple-100 text-purple-800 border-purple-200',
  AchievementCredential: 'bg-amber-100 text-amber-800 border-amber-200',
}

const statusLabels: Record<string, string> = {
  issued: 'ออกแล้ว',
  revoked: 'ยกเลิกแล้ว',
}

const statusColors: Record<string, string> = {
  issued: 'bg-green-100 text-green-800 border-green-200',
  revoked: 'bg-red-100 text-red-800 border-red-200',
}

function formatThaiDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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
      <span className="text-sm font-medium text-muted-foreground min-w-[140px]">
        {label}
      </span>
      <div className="text-sm">{children}</div>
    </div>
  )
}

export function VCDetailCard({
  vc,
  isLoading,
}: VCDetailCardProps): React.ReactElement {
  const [showRawVC, setShowRawVC] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!vc) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-40">
          <p className="text-muted-foreground">ไม่พบข้อมูล VC</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* General Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ข้อมูลทั่วไป</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DetailRow label="VC ID">
            <code className="rounded bg-muted px-2 py-1 text-xs font-mono">
              {vc.vcId}
            </code>
          </DetailRow>

          <DetailRow label="ประเภท">
            <Badge
              variant="outline"
              className={cn(
                vcTypeColors[vc.vcType] ??
                  'bg-gray-100 text-gray-800 border-gray-200'
              )}
            >
              {vcTypeLabels[vc.vcType] ?? vc.vcType}
            </Badge>
          </DetailRow>

          <DetailRow label="สถานะ">
            <Badge
              variant="outline"
              className={cn(
                statusColors[vc.status] ??
                  'bg-gray-100 text-gray-800 border-gray-200'
              )}
            >
              {statusLabels[vc.status] ?? vc.status}
            </Badge>
          </DetailRow>
        </CardContent>
      </Card>

      {/* Student Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">นักศึกษา</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DetailRow label="รหัสนักศึกษา">
            <span className="font-mono">{vc.studentId}</span>
          </DetailRow>
        </CardContent>
      </Card>

      {/* Course Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">วิชา</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DetailRow label="รหัสวิชา">
            <span className="font-mono">{vc.courseId}</span>
          </DetailRow>
        </CardContent>
      </Card>

      {/* Date Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">วันที่</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DetailRow label="วันที่ออก">
            {formatThaiDate(vc.issuedAt)}
          </DetailRow>
          {vc.revokedAt && (
            <DetailRow label="วันที่ยกเลิก">
              <span className="text-red-600">
                {formatThaiDate(vc.revokedAt)}
              </span>
            </DetailRow>
          )}
        </CardContent>
      </Card>

      {/* Raw VC JSON */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">VC Document (JSON)</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRawVC((prev) => !prev)}
            >
              {showRawVC ? (
                <>
                  <ChevronUp className="mr-1 h-4 w-4" />
                  ซ่อน
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1 h-4 w-4" />
                  แสดง
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {showRawVC && (
          <CardContent>
            <Separator className="mb-4" />
            <div className="max-h-[500px] overflow-auto rounded-md bg-muted p-4">
              <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                <code>{JSON.stringify(vc.vc, null, 2)}</code>
              </pre>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
