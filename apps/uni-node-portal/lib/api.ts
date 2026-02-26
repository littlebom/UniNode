import axios from 'axios'
import { getSession } from 'next-auth/react'

export const nodeApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_NODE_API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

export const registryApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_REGISTRY_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// Auth interceptor — attach JWT token from NextAuth session
nodeApi.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    const session = await getSession()
    if (session?.accessToken) {
      config.headers.Authorization = `Bearer ${session.accessToken}`
    }
  }
  return config
})

registryApi.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    const session = await getSession()
    if (session?.accessToken) {
      config.headers.Authorization = `Bearer ${session.accessToken}`
    }
  }
  return config
})
