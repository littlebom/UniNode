'use client'

import { useQuery } from '@tanstack/react-query'
import { nodeApi } from '@/lib/api'
import type { ApiResponse } from '@unilink/dto'

interface DashboardStats {
  totalVCsIssued: number
  vcsIssuedThisMonth: number
  pendingTransfers: number
  pendingExternalReviews: number
  activeStudents: number
  totalCourses: number
}

interface ChartDataPoint {
  month: string
  count: number
}

interface GradeDistribution {
  grade: string
  count: number
}

interface DeliveryModeBreakdown {
  mode: string
  count: number
}

interface RecentActivity {
  id: string
  type: 'vc_issued' | 'vc_revoked' | 'transfer_requested' | 'transfer_approved' | 'transfer_rejected'
  description: string
  timestamp: string
}

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const { data } = await nodeApi.get<ApiResponse<DashboardStats>>('/dashboard/stats')
      return data.data!
    },
  })
}

export function useVCByMonthChart() {
  return useQuery<ChartDataPoint[]>({
    queryKey: ['dashboard', 'vc-by-month'],
    queryFn: async () => {
      const { data } = await nodeApi.get<ApiResponse<ChartDataPoint[]>>('/dashboard/charts/vc-by-month')
      return data.data!
    },
  })
}

export function useGradeDistribution() {
  return useQuery<GradeDistribution[]>({
    queryKey: ['dashboard', 'grade-distribution'],
    queryFn: async () => {
      const { data } = await nodeApi.get<ApiResponse<GradeDistribution[]>>('/dashboard/charts/grade-distribution')
      return data.data!
    },
  })
}

export function useDeliveryModeBreakdown() {
  return useQuery<DeliveryModeBreakdown[]>({
    queryKey: ['dashboard', 'delivery-mode'],
    queryFn: async () => {
      const { data } = await nodeApi.get<ApiResponse<DeliveryModeBreakdown[]>>('/dashboard/charts/delivery-mode')
      return data.data!
    },
  })
}

export function useRecentActivity() {
  return useQuery<RecentActivity[]>({
    queryKey: ['dashboard', 'recent-activity'],
    queryFn: async () => {
      const { data } = await nodeApi.get<ApiResponse<RecentActivity[]>>('/dashboard/recent-activity')
      return data.data!
    },
  })
}

export type {
  DashboardStats,
  ChartDataPoint,
  GradeDistribution,
  DeliveryModeBreakdown,
  RecentActivity,
}
