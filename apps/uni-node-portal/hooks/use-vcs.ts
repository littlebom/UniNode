'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { nodeApi } from '@/lib/api'
import type { ApiResponse, PaginatedResponse } from '@unilink/dto'
import type { IssueVCFormValues, RevokeVCFormValues } from '@/lib/schemas/vc-schemas'

interface VCListParams {
  page?: number
  limit?: number
  status?: string
  vcType?: string
  semester?: string
  academicYear?: string
  search?: string
}

interface VCListItem {
  vcId: string
  studentId: string
  courseId: string
  courseName?: string
  grade?: string
  vcType: string
  status: string
  issuedAt: string
  revokedAt?: string | null
}

interface VCDetail {
  vcId: string
  studentId: string
  vcType: string
  courseId: string
  status: string
  vc: Record<string, unknown>
  issuedAt: string | null
  revokedAt: string | null
}

interface IssueVCResult {
  vcId: string
  status: string
  vc: Record<string, unknown>
}

export function useVCList(params: VCListParams) {
  return useQuery<PaginatedResponse<VCListItem>>({
    queryKey: ['vcs', params],
    queryFn: async () => {
      const { data } = await nodeApi.get<ApiResponse<PaginatedResponse<VCListItem>>>('/vc', { params })
      return data.data!
    },
  })
}

export function useVCDetail(vcId: string) {
  return useQuery<VCDetail>({
    queryKey: ['vcs', vcId],
    queryFn: async () => {
      const { data } = await nodeApi.get<ApiResponse<VCDetail>>(`/vc/${vcId}`)
      return data.data!
    },
    enabled: !!vcId,
  })
}

export function useIssueVC() {
  const queryClient = useQueryClient()
  return useMutation<IssueVCResult, Error, IssueVCFormValues>({
    mutationFn: async (dto) => {
      const { data } = await nodeApi.post<ApiResponse<IssueVCResult>>('/vc/issue', dto)
      return data.data!
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vcs'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useRevokeVC() {
  const queryClient = useQueryClient()
  return useMutation<{ vcId: string; status: string }, Error, { vcId: string } & RevokeVCFormValues>({
    mutationFn: async ({ vcId, reason }) => {
      const { data } = await nodeApi.delete<ApiResponse<{ vcId: string; status: string }>>(`/vc/${vcId}/revoke`, {
        data: { reason },
      })
      return data.data!
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['vcs'] })
      void queryClient.invalidateQueries({ queryKey: ['vcs', variables.vcId] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export type { VCListParams, VCListItem, VCDetail, IssueVCResult }
