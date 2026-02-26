'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { Eye, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VCListItem } from '@/hooks/use-vcs'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface VCTableProps {
  data: VCListItem[]
  isLoading: boolean
}

const gradeColorMap: Record<string, string> = {
  A: 'bg-green-100 text-green-800 border-green-200',
  'B+': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  B: 'bg-blue-100 text-blue-800 border-blue-200',
  'C+': 'bg-sky-100 text-sky-800 border-sky-200',
  C: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'D+': 'bg-orange-100 text-orange-800 border-orange-200',
  D: 'bg-red-100 text-red-800 border-red-200',
  F: 'bg-red-200 text-red-900 border-red-300',
  S: 'bg-green-100 text-green-800 border-green-200',
  U: 'bg-gray-100 text-gray-800 border-gray-200',
}

const vcTypeMap: Record<string, { label: string; className: string }> = {
  CourseCreditCredential: {
    label: 'Course Credit',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  DegreeCredential: {
    label: 'Degree',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  AchievementCredential: {
    label: 'Achievement',
    className: 'bg-amber-100 text-amber-800 border-amber-200',
  },
}

const statusMap: Record<string, { label: string; className: string }> = {
  issued: {
    label: 'ออกแล้ว',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  revoked: {
    label: 'ยกเลิกแล้ว',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
}

function CopyButton({ text }: { text: string }): React.ReactElement {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async (): Promise<void> => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3 text-muted-foreground" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{copied ? 'คัดลอกแล้ว' : 'คัดลอก VC ID'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function VCTable({ data, isLoading }: VCTableProps): React.ReactElement {
  const columns = useMemo<ColumnDef<VCListItem>[]>(
    () => [
      {
        accessorKey: 'vcId',
        header: 'VC ID',
        cell: ({ row }) => {
          const vcId = row.getValue<string>('vcId')
          return (
            <div className="flex items-center gap-1">
              <code className="text-xs font-mono">
                {vcId.slice(0, 12)}...
              </code>
              <CopyButton text={vcId} />
            </div>
          )
        },
      },
      {
        accessorKey: 'studentId',
        header: 'นักศึกษา',
        cell: ({ row }) => (
          <span className="font-mono text-sm">
            {row.getValue<string>('studentId')}
          </span>
        ),
      },
      {
        id: 'course',
        header: 'วิชา',
        cell: ({ row }) => {
          const courseId = row.original.courseId
          const courseName = row.original.courseName
          return (
            <div className="flex flex-col">
              <span className="font-mono text-sm">{courseId}</span>
              {courseName && (
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {courseName}
                </span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'grade',
        header: 'เกรด',
        cell: ({ row }) => {
          const grade = row.getValue<string | undefined>('grade')
          if (!grade) return <span className="text-muted-foreground">-</span>
          const colorClass = gradeColorMap[grade] ?? 'bg-gray-100 text-gray-800 border-gray-200'
          return (
            <Badge variant="outline" className={cn('font-semibold', colorClass)}>
              {grade}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'vcType',
        header: 'ประเภท',
        cell: ({ row }) => {
          const vcType = row.getValue<string>('vcType')
          const typeInfo = vcTypeMap[vcType] ?? {
            label: vcType,
            className: 'bg-gray-100 text-gray-800 border-gray-200',
          }
          return (
            <Badge variant="outline" className={typeInfo.className}>
              {typeInfo.label}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'status',
        header: 'สถานะ',
        cell: ({ row }) => {
          const status = row.getValue<string>('status')
          const statusInfo = statusMap[status] ?? {
            label: status,
            className: 'bg-gray-100 text-gray-800 border-gray-200',
          }
          return (
            <Badge variant="outline" className={statusInfo.className}>
              {statusInfo.label}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'issuedAt',
        header: 'วันที่',
        cell: ({ row }) => {
          const issuedAt = row.getValue<string>('issuedAt')
          if (!issuedAt) return <span className="text-muted-foreground">-</span>
          return (
            <span className="text-sm">
              {new Date(issuedAt).toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/vcs/${row.original.vcId}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>VC ID</TableHead>
              <TableHead>นักศึกษา</TableHead>
              <TableHead>วิชา</TableHead>
              <TableHead>เกรด</TableHead>
              <TableHead>ประเภท</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead>วันที่</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>VC ID</TableHead>
              <TableHead>นักศึกษา</TableHead>
              <TableHead>วิชา</TableHead>
              <TableHead>เกรด</TableHead>
              <TableHead>ประเภท</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead>วันที่</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                <p className="text-muted-foreground">
                  ไม่พบ Verifiable Credentials
                </p>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
