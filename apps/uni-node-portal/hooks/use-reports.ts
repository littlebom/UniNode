'use client'

import { useQuery } from '@tanstack/react-query'
import { nodeApi } from '@/lib/api'
import type { ApiResponse } from '@unilink/dto'

interface VCSummary {
  byMonth: Array<{ month: string; count: number }>
  byType: Array<{ type: string; count: number }>
  byFaculty: Array<{ faculty: string; count: number }>
}

interface TransferSummary {
  byMonth: Array<{ month: string; approved: number; rejected: number }>
  successRate: number
  totalApproved: number
  totalRejected: number
  totalPending: number
}

interface CoursePopularity {
  topCourses: Array<{ courseId: string; courseName: string; vcCount: number; passRate: number }>
}

export function useVCSummary() {
  return useQuery<VCSummary>({
    queryKey: ['reports', 'vc-summary'],
    queryFn: async () => {
      const { data } = await nodeApi.get<ApiResponse<VCSummary>>('/reports/vc-summary')
      return data.data!
    },
  })
}

export function useTransferSummary() {
  return useQuery<TransferSummary>({
    queryKey: ['reports', 'transfer-summary'],
    queryFn: async () => {
      const { data } = await nodeApi.get<ApiResponse<TransferSummary>>('/reports/transfer-summary')
      return data.data!
    },
  })
}

export function useCoursePopularity() {
  return useQuery<CoursePopularity>({
    queryKey: ['reports', 'course-popularity'],
    queryFn: async () => {
      const { data } = await nodeApi.get<ApiResponse<CoursePopularity>>('/reports/course-popularity')
      return data.data!
    },
  })
}

export type { VCSummary, TransferSummary, CoursePopularity }
