'use client'

import {
  useDashboardStats,
  useVCByMonthChart,
  useGradeDistribution,
  useDeliveryModeBreakdown,
  useRecentActivity,
} from '@/hooks/use-dashboard'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { VCChart } from '@/components/dashboard/vc-chart'
import { GradeChart } from '@/components/dashboard/grade-chart'
import { DeliveryChart } from '@/components/dashboard/delivery-chart'
import { PendingActions } from '@/components/dashboard/pending-actions'
import { RecentActivity } from '@/components/dashboard/recent-activity'

export default function DashboardPage(): React.ReactElement {
  const stats = useDashboardStats()
  const vcByMonth = useVCByMonthChart()
  const gradeDistribution = useGradeDistribution()
  const deliveryMode = useDeliveryModeBreakdown()
  const recentActivity = useRecentActivity()

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          ภาพรวมระบบ Verifiable Credentials และ Credit Transfer
        </p>
      </div>

      {/* Row 1: Stats Cards (2x3 grid) */}
      <StatsCards stats={stats.data} isLoading={stats.isLoading} />

      {/* Row 2: VC by month line chart + Grade distribution pie chart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <VCChart data={vcByMonth.data} isLoading={vcByMonth.isLoading} />
        <GradeChart
          data={gradeDistribution.data}
          isLoading={gradeDistribution.isLoading}
        />
      </div>

      {/* Row 3: Delivery mode bar chart + Pending actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DeliveryChart
          data={deliveryMode.data}
          isLoading={deliveryMode.isLoading}
        />
        <PendingActions
          pendingTransfers={stats.data?.pendingTransfers ?? 0}
          pendingExternalReviews={stats.data?.pendingExternalReviews ?? 0}
        />
      </div>

      {/* Row 4: Recent activity table */}
      <RecentActivity
        data={recentActivity.data}
        isLoading={recentActivity.isLoading}
      />
    </div>
  )
}
