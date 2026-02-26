'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import type { RecentActivity as RecentActivityType } from '@/hooks/use-dashboard'

interface RecentActivityProps {
  data: RecentActivityType[] | undefined
  isLoading: boolean
}

type ActivityType = RecentActivityType['type']

interface ActivityBadgeConfig {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
}

const ACTIVITY_BADGE_MAP: Record<ActivityType, ActivityBadgeConfig> = {
  vc_issued: { label: 'ออก VC', variant: 'default' },
  vc_revoked: { label: 'เพิกถอน VC', variant: 'destructive' },
  transfer_requested: { label: 'ขอโอน', variant: 'secondary' },
  transfer_approved: { label: 'อนุมัติโอน', variant: 'default' },
  transfer_rejected: { label: 'ปฏิเสธโอน', variant: 'destructive' },
}

function getActivityBadge(type: ActivityType): ActivityBadgeConfig {
  return ACTIVITY_BADGE_MAP[type] ?? { label: type, variant: 'outline' as const }
}

function RecentActivitySkeleton(): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-full max-w-sm" />
              <Skeleton className="ml-auto h-4 w-28" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function RecentActivity({ data, isLoading }: RecentActivityProps): React.ReactElement {
  if (isLoading) {
    return <RecentActivitySkeleton />
  }

  const activities = (data ?? []).slice(0, 10)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          กิจกรรมล่าสุด
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            ไม่มีกิจกรรมล่าสุด
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">ประเภท</TableHead>
                <TableHead>รายละเอียด</TableHead>
                <TableHead className="w-[160px] text-right">เวลา</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((activity) => {
                const badge = getActivityBadge(activity.type)
                return (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {activity.description}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatThaiDateFromISO(activity.timestamp)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
