'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

const labelMap: Record<string, string> = {
  '': 'Dashboard',
  vcs: 'Verifiable Credentials',
  issue: 'ออก VC',
  transfers: 'Credit Transfer',
  courses: 'Course Catalog',
  new: 'เพิ่มวิชาใหม่',
  edit: 'แก้ไข',
  outcomes: 'Learning Outcomes',
  syllabus: 'Syllabus',
  students: 'Students',
  external: 'External Credentials',
  reports: 'Reports',
  settings: 'Settings',
  sis: 'SIS Integration',
  keys: 'Key Management',
}

export function Breadcrumb(): React.ReactElement {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) {
    return (
      <nav className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Dashboard</span>
      </nav>
    )
  }

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      <Link href="/" className="hover:text-foreground transition-colors">
        Dashboard
      </Link>
      {segments.map((segment, index) => {
        const href = '/' + segments.slice(0, index + 1).join('/')
        const isLast = index === segments.length - 1
        const label = labelMap[segment] ?? decodeURIComponent(segment)

        return (
          <span key={href} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5" />
            {isLast ? (
              <span className="font-medium text-foreground">{label}</span>
            ) : (
              <Link href={href} className="hover:text-foreground transition-colors">
                {label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
