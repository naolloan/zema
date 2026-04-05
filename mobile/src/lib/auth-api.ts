import { api } from './api'
import type {
  CommentPermission,
  MobileApiEnvelope,
  MobileDiaryEntry,
  MobileFollowState,
  MobileListComment,
  MobileListDetail,
  MobileListItem,
  MobileListSummary,
  MobileLikedReleaseItem,
  MobileNotificationItem,
  MobilePaginatedEnvelope,
  MobileProfile,
  MobileReviewComment,
  MobileWantToHearItem,
  PasswordResetRequestResult,
  RegistrationResult,
  Session,
} from '@/types'

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

export async function getMyProfile() {
  const response = await api.get<MobileApiEnvelope<MobileProfile>>('/api/users/me')
  return response.data.data
}

export async function getUserProfile(userId: string) {
  const response = await api.get<MobileApiEnvelope<MobileProfile>>(`/api/users/${userId}`)
  return response.data.data
}

export async function updateMyProfile(payload: {
  username?: string
  displayName?: string
  bio?: string
  avatarUrl?: string
  commentPermission?: CommentPermission
}) {
  const response = await api.put<MobileApiEnvelope<MobileProfile>>('/api/users/me', payload)
  return response.data.data
}

export async function changePassword(payload: {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}) {
  await api.post('/api/auth/change-password', payload)
}

export async function deleteMyAccount(payload: {
  confirmation: string
  currentPassword?: string
}) {
  await api.delete('/api/auth/delete-account', {
    data: payload,
  })
}

export async function getMyNotificationsPage(limit = 20, offset = 0, filter: 'all' | 'unread' = 'all') {
  const response = await api.get<MobilePaginatedEnvelope<MobileNotificationItem>>('/api/users/me/notifications', {
    params: { limit, offset, filter },
  })
  return response.data
}

export async function markMyNotificationsRead() {
  await api.post('/api/users/me/notifications/read', { state: 'read' })
}

export async function markMyNotificationsUnread() {
  await api.post('/api/users/me/notifications/read', { state: 'unread' })
}

export async function markNotificationReadState(notificationId: string, state: 'read' | 'unread') {
  await api.post(`/api/users/me/notifications/${notificationId}/read`, { state })
}

export async function followUser(userId: string) {
  const response = await api.post<MobileApiEnvelope<MobileFollowState>>(`/api/users/${userId}/follow`)
  return response.data.data
}

export async function unfollowUser(userId: string) {
  const response = await api.delete<MobileApiEnvelope<MobileFollowState>>(`/api/users/${userId}/follow`)
  return response.data.data
}

export async function getMyLists(userId: string) {
  const response = await api.get<MobileApiEnvelope<MobileListSummary[]>>(`/api/lists/user/${userId}`)
  return response.data.data
}

export async function getUserLists(userId: string, limit = 24, offset = 0) {
  const response = await api.get<MobilePaginatedEnvelope<MobileListSummary>>(`/api/users/${userId}/lists`, {
    params: { limit, offset },
  })
  return response.data
}

export async function getDiscoverLists(sort: 'weekly' | 'recent' | 'liked' = 'weekly', limit = 12, offset = 0) {
  const response = await api.get<MobilePaginatedEnvelope<MobileListSummary>>('/api/lists/discover', {
    params: { sort, limit, offset },
  })

  return response.data
}

export async function getListById(listId: string) {
  const response = await api.get<MobileApiEnvelope<MobileListDetail>>(`/api/lists/${listId}`)
  return response.data.data
}

export async function createList(payload: {
  title: string
  description?: string
  category?: 'MIXED' | 'ALBUMS' | 'SINGLES' | 'EPS' | 'MIXTAPES'
  isPublic?: boolean
}) {
  const response = await api.post<MobileApiEnvelope<MobileListSummary>>('/api/lists', payload)
  return response.data.data
}

export async function updateList(
  listId: string,
  payload: {
    title?: string
    description?: string
    category?: 'MIXED' | 'ALBUMS' | 'SINGLES' | 'EPS' | 'MIXTAPES'
    isPublic?: boolean
  },
) {
  const response = await api.put<MobileApiEnvelope<MobileListSummary>>(`/api/lists/${listId}`, payload)
  return response.data.data
}

export async function deleteList(listId: string) {
  await api.delete(`/api/lists/${listId}`)
}

export async function likeList(listId: string) {
  const response = await api.post<MobileApiEnvelope<{ isLiked: boolean; likesCount: number }>>(`/api/lists/${listId}/like`)
  return response.data.data
}

export async function unlikeList(listId: string) {
  const response = await api.delete<MobileApiEnvelope<{ isLiked: boolean; likesCount: number }>>(`/api/lists/${listId}/like`)
  return response.data.data
}

export async function addListComment(listId: string, payload: { content: string }) {
  const response = await api.post<MobileApiEnvelope<MobileListComment>>(`/api/lists/${listId}/comments`, payload)
  return response.data.data
}

export async function addListItem(listId: string, payload: { releaseId: string; notes?: string; position?: number }) {
  const response = await api.post<MobileApiEnvelope<MobileListItem>>(`/api/lists/${listId}/items`, payload)
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
  const response = await api.get<MobilePaginatedEnvelope<MobileDiaryEntry>>('/api/diary/my-entries', {
    params: {
      limit,
      offset,
      ...(releaseId ? { releaseId } : {}),
    },
  })

  return response.data
}

export async function getUserWantToHear(userId: string, limit = 12, offset = 0) {
  const response = await api.get<MobilePaginatedEnvelope<MobileWantToHearItem>>(`/api/users/${userId}/want-to-hear`, {
    params: { limit, offset },
  })
  return response.data
}

export async function getUserReleaseLikes(userId: string, limit = 12, offset = 0) {
  const response = await api.get<MobilePaginatedEnvelope<MobileLikedReleaseItem>>(`/api/users/${userId}/release-likes`, {
    params: { limit, offset },
  })
  return response.data
}

export async function addReviewComment(reviewId: string, payload: { content: string }) {
  const response = await api.post<MobileApiEnvelope<MobileReviewComment>>(`/api/reviews/${reviewId}/comments`, payload)
  return response.data.data
}
