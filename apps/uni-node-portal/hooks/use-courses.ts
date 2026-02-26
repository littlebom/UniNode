'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { nodeApi } from '@/lib/api'
import type { ApiResponse, PaginatedResponse, LISCourseTemplate, CASEDocument, CourseSyllabus } from '@unilink/dto'
import type { CourseFormValues } from '@/lib/schemas/course-schemas'

interface CourseListParams {
  page?: number
  limit?: number
  faculty?: string
  deliveryMode?: string
  credits?: number
  search?: string
}

export function useCourseList(params: CourseListParams) {
  return useQuery<PaginatedResponse<LISCourseTemplate>>({
    queryKey: ['courses', params],
    queryFn: async () => {
      const { data } = await nodeApi.get<ApiResponse<PaginatedResponse<LISCourseTemplate>>>('/courses', { params })
      return data.data!
    },
  })
}

export function useCourseSearch(q: string, params?: Omit<CourseListParams, 'search'>) {
  return useQuery<PaginatedResponse<LISCourseTemplate>>({
    queryKey: ['courses', 'search', q, params],
    queryFn: async () => {
      const { data } = await nodeApi.get<ApiResponse<PaginatedResponse<LISCourseTemplate>>>('/courses/search', {
        params: { q, ...params },
      })
      return data.data!
    },
    enabled: q.length > 0,
  })
}

export function useCourseDetail(courseId: string) {
  return useQuery<LISCourseTemplate>({
    queryKey: ['courses', courseId],
    queryFn: async () => {
      const { data } = await nodeApi.get<ApiResponse<LISCourseTemplate>>(`/courses/${courseId}`)
      return data.data!
    },
    enabled: !!courseId,
  })
}

export function useCourseOutcomes(courseId: string) {
  return useQuery<CASEDocument>({
    queryKey: ['courses', courseId, 'outcomes'],
    queryFn: async () => {
      const { data } = await nodeApi.get<ApiResponse<CASEDocument>>(`/courses/${courseId}/outcomes`)
      return data.data!
    },
    enabled: !!courseId,
  })
}

export function useCourseSyllabus(courseId: string) {
  return useQuery<CourseSyllabus[]>({
    queryKey: ['courses', courseId, 'syllabus'],
    queryFn: async () => {
      const { data } = await nodeApi.get<ApiResponse<CourseSyllabus[]>>(`/courses/${courseId}/syllabus`)
      return data.data!
    },
    enabled: !!courseId,
  })
}

export function useCreateCourse() {
  const queryClient = useQueryClient()
  return useMutation<LISCourseTemplate, Error, CourseFormValues>({
    mutationFn: async (dto) => {
      const { data } = await nodeApi.post<ApiResponse<LISCourseTemplate>>('/courses', dto)
      return data.data!
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['courses'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateCourse(courseId: string) {
  const queryClient = useQueryClient()
  return useMutation<LISCourseTemplate, Error, Partial<CourseFormValues>>({
    mutationFn: async (dto) => {
      const { data } = await nodeApi.put<ApiResponse<LISCourseTemplate>>(`/courses/${courseId}`, dto)
      return data.data!
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['courses'] })
      void queryClient.invalidateQueries({ queryKey: ['courses', courseId] })
    },
  })
}

export type { CourseListParams }
