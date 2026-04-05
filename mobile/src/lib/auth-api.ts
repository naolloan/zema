import { api } from './api'
import type { Session } from '@/types'

export async function loginUser(payload: { email: string; password: string }) {
  const response = await api.post<Session>('/api/auth/login', payload)
  return response.data
}

export async function getMyProfile(token?: string) {
  const response = await api.get('/api/users/me', {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  return response.data
}
