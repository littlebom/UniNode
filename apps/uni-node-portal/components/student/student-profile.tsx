'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import type { StudentProfile as StudentProfileType } from '@/hooks/use-students'

interface StudentProfileProps {
  profile: StudentProfileType
  isLoading: boolean
}

function truncateId(id: string, length: number = 12): string {
  if (id.length <= length) return id
  return `${id.slice(0, length)}...`
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

function getVCTypeBadgeVariant(
  vcType: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (vcType) {
    case 'course_completion':
      return 'default'
    case 'degree':
      return 'secondary'
    case 'external':
      return 'outline'
    default:
      return 'outline'
  }
}

function getVCStatusBadgeVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default'
    case 'revoked':
      return 'destructive'
    case 'expired':
      return 'secondary'
    default:
      return 'outline'
  }
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

function CopyDid({ did }: { did: string }): React.ReactElement {
  const [copied, setCopied] = useState(false)

  async function handleCopy(): Promise<void> {
    await navigator.clipboard.writeText(did)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2">
      <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs break-all">
        {did}
      </code>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
        {copied ? (
          <Check className="h-3 w-3 text-emerald-600" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
        <span className="sr-only">คัดลอก DID</span>
      </Button>
    </div>
  )
}

function ProfileSkeleton(): React.ReactElement {
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
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function StudentProfileView({
  profile,
  isLoading,
}: StudentProfileProps): React.ReactElement {
  if (isLoading) {
    return <ProfileSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            ข้อมูลนักศึกษา
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <DetailRow label="รหัสนักศึกษา">{profile.studentId}</DetailRow>
          <DetailRow label="DID">
            {profile.did ? (
              <CopyDid did={profile.did} />
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </DetailRow>
          <DetailRow label="สถานะ">
            <Badge
              variant={profile.status === 'active' ? 'default' : 'secondary'}
            >
              {profile.status === 'active' ? 'Active' : 'Inactive'}
            </Badge>
          </DetailRow>
          <DetailRow label="Wallet Endpoint">
            {profile.walletEndpoint ? (
              <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
                {profile.walletEndpoint}
              </code>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </DetailRow>
          {profile.enrolledAt && (
            <DetailRow label="วันที่ลงทะเบียน">
              {formatThaiDateFromISO(profile.enrolledAt)}
            </DetailRow>
          )}
          <DetailRow label="วันที่สร้าง">
            {formatThaiDateFromISO(profile.createdAt)}
          </DetailRow>
        </CardContent>
      </Card>

      {/* VC History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            ประวัติ VC
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profile.vcHistory.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              ยังไม่มีประวัติ VC
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>VC ID</TableHead>
                  <TableHead>รหัสวิชา</TableHead>
                  <TableHead>ชื่อวิชา</TableHead>
                  <TableHead>เกรด</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>วันที่ออก</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profile.vcHistory.map((vc) => (
                  <TableRow key={vc.vcId}>
                    <TableCell className="font-mono text-xs">
                      {truncateId(vc.vcId)}
                    </TableCell>
                    <TableCell className="text-sm">{vc.courseId}</TableCell>
                    <TableCell className="text-sm">
                      {vc.courseName ?? '-'}
                    </TableCell>
                    <TableCell>
                      {vc.grade ? (
                        <Badge variant={getGradeBadgeVariant(vc.grade)}>
                          {vc.grade}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getVCTypeBadgeVariant(vc.vcType)}>
                        {vc.vcType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getVCStatusBadgeVariant(vc.status)}>
                        {vc.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatThaiDateFromISO(vc.issuedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
