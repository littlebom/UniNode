'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { nodeApi } from '@/lib/api'
import type { ApiResponse, PaginatedResponse } from '@unilink/dto'

interface TransferListParams {
  page?: number
  limit?: number
  status?: string
  search?: string
}

interface TransferListItem {
  transferId: string
  studentId: string
  sourceCourseId: string
  sourceCourseName?: string
  targetNodeId: string
  targetCourseId: string
  targetCourseName?: string
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: string
  decidedAt?: string | null
}

interface TransferDetail {
  transferId: string
  studentId: string
  sourceCourseId: string
  sourceCourseName?: string
  sourceGrade?: string
  sourceVcId?: string
  targetNodeId: string
  targetCourseId: string
  targetCourseName?: string
  status: 'pending' | 'approved' | 'rejected'
  reviewNote?: string
  loMatchPercentage?: number
  requestedAt: string
  decidedAt?: string | null
  decidedBy?: string | null
}

export function useTransferList(params: TransferListParams) {
  return useQuery<PaginatedResponse<TransferListItem>>({
    queryKey: ['transfers', params],
    queryFn: async () => {
      const { data } = await nodeApi.get<ApiResponse<PaginatedResponse<TransferListItem>>>('/transfer', { params })
      return data.data!
    },
  })
}

export function useTransferDetail(transferId: string) {
  return useQuery<TransferDetail>({
    queryKey: ['transfers', transferId],
    queryFn: async () => {
      const { data } = await nodeApi.get<ApiResponse<TransferDetail>>(`/transfer/${transferId}`)
      return data.data!
    },
    enabled: !!transferId,
  })
}

export function useApproveTransfer() {
  const queryClient = useQueryClient()
  return useMutation<TransferDetail, Error, { transferId: string; reviewNote: string }>({
    mutationFn: async ({ transferId, reviewNote }) => {
      const { data } = await nodeApi.put<ApiResponse<TransferDetail>>(`/transfer/${transferId}/approve`, {
        reviewNote,
      })
      return data.data!
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['transfers'] })
      void queryClient.invalidateQueries({ queryKey: ['transfers', variables.transferId] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useRejectTransfer() {
  const queryClient = useQueryClient()
  return useMutation<TransferDetail, Error, { transferId: string; reviewNote: string }>({
    mutationFn: async ({ transferId, reviewNote }) => {
      const { data } = await nodeApi.put<ApiResponse<TransferDetail>>(`/transfer/${transferId}/reject`, {
        reviewNote,
      })
      return data.data!
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['transfers'] })
      void queryClient.invalidateQueries({ queryKey: ['transfers', variables.transferId] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export type { TransferListParams, TransferListItem, TransferDetail }
