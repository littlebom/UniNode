'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { nodeApi } from '@/lib/api'
import type { ApiResponse, PaginatedResponse } from '@unilink/dto'
import type { ExternalReviewFormValues } from '@/lib/schemas/external-schemas'

interface ExternalListParams {
  page?: number
  limit?: number
  status?: string
}

interface ExternalListItem {
  requestId: string
  studentId: string
  platform: string
  courseName: string
  institution: string
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: string
}

interface ExternalDetail {
  requestId: string
  studentId: string
  platform: string
  courseName: string
  institution: string
  completionDate: string
  score?: string | null
  hours?: number | null
  certificateUrl?: string | null
  certificatePdfUrl?: string | null
  verificationUrl?: string | null
  requestedCourseId?: string | null
  status: 'pending' | 'approved' | 'rejected'
  reviewNote?: string | null
  recognizedCourseId?: string | null
  recognizedCredits?: number | null
  requestedAt: string
  decidedAt?: string | null
}

export function useExternalList(params: ExternalListParams) {
  return useQuery<PaginatedResponse<ExternalListItem>>({
    queryKey: ['external', params],
    queryFn: async () => {
      const { data } = await nodeApi.get<ApiResponse<PaginatedResponse<ExternalListItem>>>('/external', { params })
      return data.data!
    },
  })
}

export function useExternalDetail(requestId: string) {
  return useQuery<ExternalDetail>({
    queryKey: ['external', requestId],
    queryFn: async () => {
      const { data } = await nodeApi.get<ApiResponse<ExternalDetail>>(`/external/${requestId}`)
      return data.data!
    },
    enabled: !!requestId,
  })
}

export function useApproveExternal() {
  const queryClient = useQueryClient()
  return useMutation<ExternalDetail, Error, { requestId: string } & ExternalReviewFormValues>({
    mutationFn: async ({ requestId, ...dto }) => {
      const { data } = await nodeApi.put<ApiResponse<ExternalDetail>>(`/external/${requestId}/approve`, dto)
      return data.data!
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['external'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useRejectExternal() {
  const queryClient = useQueryClient()
  return useMutation<ExternalDetail, Error, { requestId: string; note?: string }>({
    mutationFn: async ({ requestId, note }) => {
      const { data } = await nodeApi.put<ApiResponse<ExternalDetail>>(`/external/${requestId}/reject`, { note })
      return data.data!
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['external'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export type { ExternalListParams, ExternalListItem, ExternalDetail }
