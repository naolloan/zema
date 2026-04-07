import api from '@/lib/api'
import type {
  AuthSession,
  DiaryEntry,
  Favorite,
  FavoriteArtist,
  LikedReleaseItem,
  List,
  ListComment,
  ListItem,
  PaginatedEnvelope,
  NotificationItem,
  Profile,
  Rating,
  Review,
  ReviewComment,
  User,
  UserSearchResult,
  WantToHearItem,
} from '@/types'

type ListCategory = 'MIXED' | 'ALBUMS' | 'SINGLES' | 'EPS' | 'MIXTAPES'
const API_ORIGIN = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

export interface RegistrationResult {
  requiresEmailVerification: true
  email: string
  previewUrl: string | null
  deliveryMode?: 'email' | 'preview'
  deliveryReason?: string | null
}

export interface UsernameAvailabilityResult {
  available: boolean
  valid: boolean
  normalized: string
  reason: string | null
}

export async function registerUser(payload: {
  email: string
  username: string
  password: string
  displayName?: string
  bio?: string
}): Promise<RegistrationResult> {
  const response = await api.post('/auth/register', payload)
  return response.data.data as RegistrationResult
}

export async function loginUser(payload: {
  email: string
  password: string
}): Promise<AuthSession> {
  const response = await api.post('/auth/login', payload)
  return response.data.data as AuthSession
}

export async function checkUsernameAvailability(username: string): Promise<UsernameAvailabilityResult> {
  const response = await api.get('/users/check-username', {
    params: { username },
  })
  return response.data.data as UsernameAvailabilityResult
}

export async function resendVerificationEmail(email: string): Promise<{ previewUrl: string | null; deliveryMode?: 'email' | 'preview'; deliveryReason?: string | null }> {
  const response = await api.post('/auth/verify-email/resend', { email })
  return response.data.data as { previewUrl: string | null; deliveryMode?: 'email' | 'preview'; deliveryReason?: string | null }
}

export async function verifyEmailToken(token: string): Promise<AuthSession> {
  const response = await api.get('/auth/verify-email', {
    params: { token },
  })
  return response.data.data.session as AuthSession
}

export async function requestPasswordReset(email: string): Promise<{ previewUrl: string | null; deliveryMode?: 'email' | 'preview'; deliveryReason?: string | null }> {
  const response = await api.post('/auth/forgot-password', { email })
  return response.data.data as { previewUrl: string | null; deliveryMode?: 'email' | 'preview'; deliveryReason?: string | null }
}

export async function resetPassword(token: string, password: string): Promise<AuthSession> {
  const response = await api.post('/auth/reset-password', { token, password })
  return response.data.data.session as AuthSession
}

export async function changePassword(payload: {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}): Promise<void> {
  await api.post('/auth/change-password', payload)
}

export async function deleteMyAccount(payload: {
  confirmation: string
  currentPassword?: string
}): Promise<void> {
  await api.delete('/auth/delete-account', {
    data: payload,
  })
}

export function getGoogleAuthUrl() {
  return `${API_ORIGIN}/api/auth/google/start`
}

export function getSpotifyAuthUrl() {
  return `${API_ORIGIN}/api/auth/spotify/start`
}

export async function logoutUser(): Promise<void> {
  await api.post('/auth/logout')
}

export async function getMyProfile(): Promise<Profile> {
  const response = await api.get('/users/me')
  return response.data.data as Profile
}

export async function getMyNotifications(limit = 20): Promise<NotificationItem[]> {
  const response = await api.get('/users/me/notifications', {
    params: { limit },
  })
  return response.data.data as NotificationItem[]
}

export async function getMyNotificationsPage(limit = 20, offset = 0, filter: 'all' | 'unread' = 'all'): Promise<PaginatedEnvelope<NotificationItem>> {
  const response = await api.get('/users/me/notifications', {
    params: { limit, offset, filter },
  })
  return response.data as PaginatedEnvelope<NotificationItem>
}

export async function markMyNotificationsRead(): Promise<void> {
  await api.post('/users/me/notifications/read', { state: 'read' })
}

export async function markMyNotificationsUnread(): Promise<void> {
  await api.post('/users/me/notifications/read', { state: 'unread' })
}

export async function markNotificationReadState(notificationId: string, state: 'read' | 'unread'): Promise<void> {
  await api.post(`/users/me/notifications/${notificationId}/read`, { state })
}

export async function getUserProfile(userId: string): Promise<Profile> {
  const response = await api.get(`/users/${userId}`)
  return response.data.data as Profile
}

export async function searchUsers(query: string, limit = 12, offset = 0): Promise<UserSearchResult> {
  const response = await api.get('/users/search', {
    params: { q: query, limit, offset },
  })
  return response.data as UserSearchResult
}

export async function followUser(userId: string): Promise<{ isFollowing: boolean; isFollowedBy: boolean; isFriend: boolean }> {
  const response = await api.post(`/users/${userId}/follow`)
  return response.data.data as { isFollowing: boolean; isFollowedBy: boolean; isFriend: boolean }
}

export async function unfollowUser(userId: string): Promise<{ isFollowing: boolean; isFollowedBy: boolean; isFriend: boolean }> {
  const response = await api.delete(`/users/${userId}/follow`)
  return response.data.data as { isFollowing: boolean; isFollowedBy: boolean; isFriend: boolean }
}

export async function getFollowers(userId: string, limit = 20, offset = 0): Promise<PaginatedEnvelope<User>> {
  const response = await api.get(`/users/${userId}/followers`, {
    params: { limit, offset },
  })
  return response.data as PaginatedEnvelope<User>
}

export async function getFollowing(userId: string, limit = 20, offset = 0): Promise<PaginatedEnvelope<User>> {
  const response = await api.get(`/users/${userId}/following`, {
    params: { limit, offset },
  })
  return response.data as PaginatedEnvelope<User>
}

export async function updateMyProfile(payload: {
  username?: string
  displayName?: string
  bio?: string
  avatarUrl?: string
  commentPermission?: 'ANYONE' | 'FOLLOWING' | 'SELF'
}): Promise<User> {
  const response = await api.put('/users/me', payload)
  return response.data.data as User
}

export async function uploadMyAvatar(imageDataUrl: string): Promise<{ avatarUrl: string }> {
  const response = await api.post('/users/me/avatar', { imageDataUrl })
  return response.data.data as { avatarUrl: string }
}

export async function getMyDiary(limit = 20, offset = 0, releaseId?: string): Promise<PaginatedEnvelope<DiaryEntry>> {
  const response = await api.get('/diary/my-entries', {
    params: { limit, offset, releaseId },
  })
  return response.data as PaginatedEnvelope<DiaryEntry>
}

export async function getUserDiary(userId: string, limit = 12, offset = 0): Promise<PaginatedEnvelope<DiaryEntry>> {
  const response = await api.get(`/users/${userId}/diary`, {
    params: { limit, offset },
  })
  return response.data as PaginatedEnvelope<DiaryEntry>
}

export async function getUserReviews(userId: string, limit = 12, offset = 0): Promise<PaginatedEnvelope<Review>> {
  const response = await api.get(`/users/${userId}/reviews`, {
    params: { limit, offset },
  })
  return response.data as PaginatedEnvelope<Review>
}

export async function getUserLists(userId: string, limit = 24, offset = 0): Promise<PaginatedEnvelope<List>> {
  const response = await api.get(`/users/${userId}/lists`, {
    params: { limit, offset },
  })
  return response.data as PaginatedEnvelope<List>
}

export async function getUserWantToHear(userId: string, limit = 12, offset = 0): Promise<PaginatedEnvelope<WantToHearItem>> {
  const response = await api.get(`/users/${userId}/want-to-hear`, {
    params: { limit, offset },
  })
  return response.data as PaginatedEnvelope<WantToHearItem>
}

export async function getUserReleaseLikes(userId: string, limit = 12, offset = 0): Promise<PaginatedEnvelope<LikedReleaseItem>> {
  const response = await api.get(`/users/${userId}/release-likes`, {
    params: { limit, offset },
  })
  return response.data as PaginatedEnvelope<LikedReleaseItem>
}

export async function rateRelease(releaseId: string, value: number): Promise<Rating> {
  const response = await api.post(`/releases/${releaseId}/rate`, { value })
  return response.data.data as Rating
}

export async function removeReleaseRating(releaseId: string): Promise<void> {
  await api.delete(`/releases/${releaseId}/rate`)
}

export async function rateTrack(trackId: string, value: number): Promise<{ id: string; value: number }> {
  const response = await api.post(`/tracks/${trackId}/rate`, { value })
  return response.data.data as { id: string; value: number }
}

export async function removeTrackRating(trackId: string): Promise<void> {
  await api.delete(`/tracks/${trackId}/rate`)
}

export async function addReleaseLike(releaseId: string): Promise<void> {
  await api.post(`/releases/${releaseId}/like`)
}

export async function removeReleaseLike(releaseId: string): Promise<void> {
  await api.delete(`/releases/${releaseId}/like`)
}

export async function addFavoriteRelease(releaseId: string, section: 'ALBUMS' | 'SONGS'): Promise<Favorite> {
  const response = await api.post('/users/me/favorites/releases', { releaseId, section })
  return response.data.data as Favorite
}

export async function removeFavoriteRelease(releaseId: string): Promise<void> {
  await api.delete(`/users/me/favorites/releases/${releaseId}`)
}

export async function addFavoriteArtist(artistId: string): Promise<FavoriteArtist> {
  const response = await api.post('/users/me/favorites/artists', { artistId })
  return response.data.data as FavoriteArtist
}

export async function removeFavoriteArtist(artistId: string): Promise<void> {
  await api.delete(`/users/me/favorites/artists/${artistId}`)
}

export async function addWantToHear(releaseId: string): Promise<WantToHearItem> {
  const response = await api.post(`/releases/${releaseId}/want-to-hear`)
  return response.data.data as WantToHearItem
}

export async function removeWantToHear(releaseId: string): Promise<void> {
  await api.delete(`/releases/${releaseId}/want-to-hear`)
}

export async function createDiaryEntry(payload: {
  releaseId: string
  listenedAt: string
  notes?: string
  createReview?: boolean
  reviewContent?: string
}): Promise<DiaryEntry> {
  const response = await api.post('/diary', payload)
  return response.data.data as DiaryEntry
}

export async function createReview(payload: { releaseId: string; content: string }): Promise<Review> {
  const response = await api.post('/reviews', payload)
  return response.data.data as Review
}

export async function updateReview(reviewId: string, payload: { content: string }): Promise<Review> {
  const response = await api.put(`/reviews/${reviewId}`, payload)
  return response.data.data as Review
}

export async function toggleReviewLike(reviewId: string): Promise<{ isLiked: boolean; message: string }> {
  const response = await api.post(`/reviews/${reviewId}/like`)
  return response.data.data as { isLiked: boolean; message: string }
}

export async function addReviewComment(reviewId: string, payload: { content: string }): Promise<ReviewComment> {
  const response = await api.post(`/reviews/${reviewId}/comments`, payload)
  return response.data.data as ReviewComment
}

export async function deleteReviewComment(reviewId: string, commentId: string): Promise<void> {
  await api.delete(`/reviews/${reviewId}/comments/${commentId}`)
}

export async function addListComment(listId: string, payload: { content: string }): Promise<ListComment> {
  const response = await api.post(`/lists/${listId}/comments`, payload)
  return response.data.data as ListComment
}

export async function deleteListComment(listId: string, commentId: string): Promise<void> {
  await api.delete(`/lists/${listId}/comments/${commentId}`)
}

export async function getMyLists(userId: string): Promise<List[]> {
  const response = await api.get(`/lists/user/${userId}`)
  return response.data.data as List[]
}

export async function getDiscoverLists(sort: 'weekly' | 'recent' | 'liked' = 'weekly', limit = 12, offset = 0): Promise<PaginatedEnvelope<List>> {
  const response = await api.get('/lists/discover', {
    params: { sort, limit, offset },
  })
  return response.data as PaginatedEnvelope<List>
}

export async function likeList(listId: string): Promise<{ isLiked: boolean; likesCount: number }> {
  const response = await api.post(`/lists/${listId}/like`)
  return response.data.data as { isLiked: boolean; likesCount: number }
}

export async function unlikeList(listId: string): Promise<{ isLiked: boolean; likesCount: number }> {
  const response = await api.delete(`/lists/${listId}/like`)
  return response.data.data as { isLiked: boolean; likesCount: number }
}

export async function getListById(listId: string): Promise<List> {
  const response = await api.get(`/lists/${listId}`)
  return response.data.data as List
}

export async function createList(payload: { title: string; description?: string; category?: ListCategory; isPublic?: boolean }): Promise<List> {
  const response = await api.post('/lists', payload)
  return response.data.data as List
}

export async function updateList(listId: string, payload: { title?: string; description?: string; category?: ListCategory; isPublic?: boolean }): Promise<List> {
  const response = await api.put(`/lists/${listId}`, payload)
  return response.data.data as List
}

export async function deleteList(listId: string): Promise<void> {
  await api.delete(`/lists/${listId}`)
}

export async function addListItem(listId: string, payload: { releaseId: string; notes?: string; position?: number }): Promise<ListItem> {
  const response = await api.post(`/lists/${listId}/items`, payload)
  return response.data.data as ListItem
}

export async function updateListItem(listId: string, itemId: string, payload: { notes?: string }): Promise<ListItem> {
  const response = await api.put(`/lists/${listId}/items/${itemId}`, payload)
  return response.data.data as ListItem
}

export async function removeListItem(listId: string, itemId: string): Promise<void> {
  await api.delete(`/lists/${listId}/items/${itemId}`)
}
