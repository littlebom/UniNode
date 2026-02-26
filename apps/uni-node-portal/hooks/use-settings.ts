'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { nodeApi } from '@/lib/api'
import type { ApiResponse } from '@unilink/dto'
import type { SISConfigFormValues } from '@/lib/schemas/settings-schemas'

interface SISConfig {
  sisApiUrl: string
  webhookEndpoint: string
  webhookSecret: string
  lastWebhookReceived: string | null
  syncStatus: 'connected' | 'error' | 'never_connected'
}

interface KeyInfo {
  did: string
  publicKeyMultibase: string
  keyType: string
  signingKeyPath: string
  didDocumentUrl: string
}

interface TestConnectionResult {
  success: boolean
  message: string
  latencyMs?: number
}

export function useSISConfig() {
  return useQuery<SISConfig>({
    queryKey: ['settings', 'sis'],
    queryFn: async () => {
      const { data } = await nodeApi.get<ApiResponse<SISConfig>>('/settings/sis')
      return data.data!
    },
  })
}

export function useUpdateSISConfig() {
  const queryClient = useQueryClient()
  return useMutation<SISConfig, Error, SISConfigFormValues>({
    mutationFn: async (dto) => {
      const { data } = await nodeApi.put<ApiResponse<SISConfig>>('/settings/sis', dto)
      return data.data!
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings', 'sis'] })
    },
  })
}

export function useTestSISConnection() {
  return useMutation<TestConnectionResult, Error>({
    mutationFn: async () => {
      const { data } = await nodeApi.post<ApiResponse<TestConnectionResult>>('/settings/sis/test')
      return data.data!
    },
  })
}

export function useKeyInfo() {
  return useQuery<KeyInfo>({
    queryKey: ['settings', 'keys'],
    queryFn: async () => {
      const { data } = await nodeApi.get<ApiResponse<KeyInfo>>('/settings/keys')
      return data.data!
    },
  })
}

export type { SISConfig, KeyInfo, TestConnectionResult }
