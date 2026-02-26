'use client'

import Link from 'next/link'
import { ArrowLeftRight, Globe, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface PendingActionsProps {
  pendingTransfers: number
  pendingExternalReviews: number
}

interface PendingItemConfig {
  label: string
  count: number
  href: string
  icon: React.ReactElement
}

export function PendingActions({
  pendingTransfers,
  pendingExternalReviews,
}: PendingActionsProps): React.ReactElement {
  const items: PendingItemConfig[] = [
    {
      label: 'Credit Transfer รออนุมัติ',
      count: pendingTransfers,
      href: '/transfer?status=pending',
      icon: <ArrowLeftRight className="h-5 w-5" />,
    },
    {
      label: 'External VC รอตรวจสอบ',
      count: pendingExternalReviews,
      href: '/credits?tab=external&status=pending',
      icon: <Globe className="h-5 w-5" />,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          รอดำเนินการ
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50',
                item.count > 0 && 'border-amber-200 bg-amber-50/50',
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    item.count > 0
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p
                    className={cn(
                      'text-2xl font-bold',
                      item.count > 0 ? 'text-amber-600' : 'text-muted-foreground',
                    )}
                  >
                    {item.count.toLocaleString('th-TH')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <span>ดูทั้งหมด</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
