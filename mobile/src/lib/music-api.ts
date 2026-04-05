import { api } from './api'
import type { MobileApiEnvelope, MobileChartResponse, MobileRating, MobileReleaseDetail, MobileReleaseSummary } from '@/types'

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
