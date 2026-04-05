import { api } from './api'
import type { MobileApiEnvelope, PasswordResetRequestResult, RegistrationResult, Session } from '@/types'

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

export async function getMyProfile<T = Session['user']>(token?: string) {
  const response = await api.get<MobileApiEnvelope<T>>('/api/users/me', {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  return response.data.data
}
