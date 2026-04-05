import { api } from './api'
import type { MobileApiEnvelope, MobileChartResponse, MobileRating, MobileReleaseDetail, MobileReleaseSummary, MobileReview } from '@/types'

export async function getTopReleases(type?: string, limit = 10) {
  const response = await api.get<MobileApiEnvelope<MobileChartResponse>>('/api/charts/top-releases', {
    params: {
      ...(type ? { type } : {}),
      limit,
    },
  })

  return response.data.data
}

export async function searchReleases(query: string, limit = 12) {
  const response = await api.get<MobileApiEnvelope<MobileReleaseSummary[]>>('/api/releases/search', {
    params: { q: query, limit },
  })

  return response.data.data
}

export async function getReleaseById(id: string) {
  const response = await api.get<MobileApiEnvelope<MobileReleaseDetail>>(`/api/releases/${id}`)
  return response.data.data
}

export async function rateRelease(releaseId: string, value: number) {
  const response = await api.post<MobileApiEnvelope<MobileRating>>(`/api/releases/${releaseId}/rate`, { value })
  return response.data.data
}

export async function clearReleaseRating(releaseId: string) {
  await api.delete(`/api/releases/${releaseId}/rate`)
}

export async function likeRelease(releaseId: string) {
  await api.post(`/api/releases/${releaseId}/like`)
}

export async function unlikeRelease(releaseId: string) {
  await api.delete(`/api/releases/${releaseId}/like`)
}

export async function addWantToHear(releaseId: string) {
  await api.post(`/api/releases/${releaseId}/want-to-hear`)
}

export async function removeWantToHear(releaseId: string) {
  await api.delete(`/api/releases/${releaseId}/want-to-hear`)
}

export async function getReleaseReviews(releaseId: string, limit = 10, offset = 0, sort: 'recent' | 'popular' | 'oldest' = 'recent') {
  const response = await api.get<{
    success: boolean
    data: MobileReview[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }>(`/api/releases/${releaseId}/reviews`, {
    params: { limit, offset, sort },
  })

  return response.data
}

export async function createReview(payload: { releaseId: string; content: string }) {
  const response = await api.post<MobileApiEnvelope<MobileReview>>('/api/reviews', payload)
  return response.data.data
}

export async function toggleReviewLike(reviewId: string) {
  const response = await api.post<MobileApiEnvelope<{ isLiked: boolean; message: string }>>(`/api/reviews/${reviewId}/like`)
  return response.data.data
}
