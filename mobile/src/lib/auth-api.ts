import { api } from './api'
import type { MobileApiEnvelope, MobileDiaryEntry, MobileListSummary, PasswordResetRequestResult, RegistrationResult, Session } from '@/types'

export async function loginUser(payload: { email: string; password: string }) {
  const response = await api.post<MobileApiEnvelope<Session>>('/api/auth/login', payload)
  return response.data.data
}

export async function registerUser(payload: {
  email: string
  username: string
  password: string
  displayName?: string
  bio?: string
}) {
  const response = await api.post<MobileApiEnvelope<RegistrationResult>>('/api/auth/register', payload)
  return response.data.data
}

export async function requestPasswordReset(email: string) {
  const response = await api.post<MobileApiEnvelope<PasswordResetRequestResult>>('/api/auth/forgot-password', { email })
  return response.data.data
}

export async function logoutUser() {
  await api.post('/api/auth/logout')
}

export async function getMyLists(userId: string) {
  const response = await api.get<MobileApiEnvelope<MobileListSummary[]>>(`/api/lists/user/${userId}`)
  return response.data.data
}

export async function addListItem(listId: string, payload: { releaseId: string; notes?: string; position?: number }) {
  const response = await api.post<MobileApiEnvelope<{ id: string }>>(`/api/lists/${listId}/items`, payload)
  return response.data.data
}

export async function createDiaryEntry(payload: {
  releaseId: string
  listenedAt: string
  notes?: string
  createReview?: boolean
  reviewContent?: string
}) {
  const response = await api.post<MobileApiEnvelope<MobileDiaryEntry>>('/api/diary', payload)
  return response.data.data
}

export async function getMyDiary(limit = 20, offset = 0, releaseId?: string) {
  const response = await api.get<{
    success: boolean
    data: MobileDiaryEntry[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }>('/api/diary/my-entries', {
    params: {
      limit,
      offset,
      ...(releaseId ? { releaseId } : {}),
    },
  })

  return response.data
}

export async function getMyProfile<T = Session['user']>(token?: string) {
  const response = await api.get<MobileApiEnvelope<T>>('/api/users/me', {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  return response.data.data
}
