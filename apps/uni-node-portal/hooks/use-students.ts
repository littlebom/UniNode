'use client'

import { useQuery } from '@tanstack/react-query'
import { nodeApi } from '@/lib/api'
import type { ApiResponse, PaginatedResponse } from '@unilink/dto'

interface StudentListParams {
  page?: number
  limit?: number
  search?: string
  status?: string
}

interface StudentListItem {
  id: string
  studentId: string
  did?: string | null
  status: string
  walletEndpoint?: string | null
  vcCount?: number
  createdAt: string
}

interface StudentProfile {
  id: string
  studentId: string
  did?: string | null
  status: string
  walletEndpoint?: string | null
  fcmToken?: string | null
  enrolledAt?: string | null
  createdAt: string
  updatedAt: string
  vcHistory: Array<{
    vcId: string
    courseId: string
    courseName?: string
    grade?: string
    vcType: string
    status: string
    issuedAt: string
  }>
}

export function useStudentList(params: StudentListParams) {
  return useQuery<PaginatedResponse<StudentListItem>>({
    queryKey: ['students', params],
    queryFn: async () => {
      const { data } = await nodeApi.get<ApiResponse<PaginatedResponse<StudentListItem>>>('/students', { params })
      return data.data!
    },
  })
}

export function useStudentProfile(studentId: string) {
  return useQuery<StudentProfile>({
    queryKey: ['students', studentId],
    queryFn: async () => {
      const { data } = await nodeApi.get<ApiResponse<StudentProfile>>(`/students/${studentId}`)
      return data.data!
    },
    enabled: !!studentId,
  })
}

export type { StudentListParams, StudentListItem, StudentProfile }
