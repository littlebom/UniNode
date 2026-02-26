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
import type { StudentListItem } from '@/hooks/use-students'

interface StudentTableProps {
  data: StudentListItem[]
  isLoading: boolean
}

function truncateDid(did: string | null | undefined, length: number = 20): string {
  if (!did) return '-'
  if (did.length <= length) return did
  return `${did.slice(0, length)}...`
}

function StudentTableSkeleton(): React.ReactElement {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>รหัสนักศึกษา</TableHead>
          <TableHead>DID</TableHead>
          <TableHead>สถานะ</TableHead>
          <TableHead>Wallet</TableHead>
          <TableHead>จำนวน VC</TableHead>
          <TableHead>วันที่สมัคร</TableHead>
          <TableHead className="w-[80px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-8" /></TableCell>
            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
            <TableCell><Skeleton className="h-8 w-8" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function StudentTable({ data, isLoading }: StudentTableProps): React.ReactElement {
  if (isLoading) {
    return <StudentTableSkeleton />
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">
          ไม่พบข้อมูลนักศึกษา
        </p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>รหัสนักศึกษา</TableHead>
          <TableHead>DID</TableHead>
          <TableHead>สถานะ</TableHead>
          <TableHead>Wallet</TableHead>
          <TableHead>จำนวน VC</TableHead>
          <TableHead>วันที่สมัคร</TableHead>
          <TableHead className="w-[80px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((student) => (
          <TableRow key={student.id}>
            <TableCell className="font-medium">{student.studentId}</TableCell>
            <TableCell>
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                {truncateDid(student.did)}
              </code>
            </TableCell>
            <TableCell>
              <Badge
                variant={student.status === 'active' ? 'default' : 'secondary'}
              >
                {student.status === 'active' ? 'Active' : 'Inactive'}
              </Badge>
            </TableCell>
            <TableCell>
              {student.walletEndpoint ? (
                <Badge variant="default" className="bg-emerald-100 text-emerald-700">
                  เชื่อมต่อแล้ว
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  ยังไม่เชื่อมต่อ
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-sm">
              {student.vcCount ?? 0}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatThaiDateFromISO(student.createdAt)}
            </TableCell>
            <TableCell>
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/students/${student.id}`}>
                  <Eye className="h-4 w-4" />
                  <span className="sr-only">ดูโปรไฟล์</span>
                </Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
