import type {
  ArtistDetail,
  ChartResponse,
  DiaryEntry,
  Rating,
  DynamicListDefinition,
  PaginatedEnvelope,
  ReleaseLikeEntry,
  ReleaseLogEntry,
  Release,
  Review,
  SearchResult,
  List,
} from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

function buildHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('token')
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }

  return headers
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    headers: buildHeaders(),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  const payload = await response.json()
  return payload.data as T
}

async function fetchEnvelope<T>(path: string): Promise<PaginatedEnvelope<T>> {
  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    headers: buildHeaders(),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return (await response.json()) as PaginatedEnvelope<T>
}

export function getApiAssetFallback(seed: string): string {
  const hues = ['from-[#ff7b54]', 'from-[#2a9d8f]', 'from-[#264653]', 'from-[#e76f51]']
  const secondary = ['to-[#f4d35e]', 'to-[#84a59d]', 'to-[#8ecae6]', 'to-[#f7b267]']
  const index = Math.abs(seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % hues.length
  return `${hues[index]} ${secondary[index]}`
}

export async function getTopReleases(type?: string, limit = 10): Promise<ChartResponse | null> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (type) params.set('type', type)

  try {
    return await fetchJson<ChartResponse>(`/charts/top-releases?${params.toString()}`)
  } catch {
    return null
  }
}

export function getDynamicListDefinitions(): DynamicListDefinition[] {
  return [
    {
      slug: 'top-250-community-canon',
      title: 'Top 250 Community Canon',
      description: 'The biggest cross-format consensus list on the platform, ranked continuously by community ratings.',
      releaseType: 'ALL',
      source: 'chart',
      accent: 'from-[#ff7b54] to-[#f4d35e]',
      limit: 250,
      section: 'core',
      status: 'live',
    },
    {
      slug: 'popular-this-week',
      title: 'Popular This Week',
      description: 'The records showing up most often in the current week of reviews and discussion.',
      releaseType: 'ALL',
      source: 'recent_reviews',
      accent: 'from-[#f4d35e] to-[#8ecae6]',
      limit: 250,
      section: 'core',
      status: 'live',
    },
    {
      slug: 'recently-liked',
      title: 'Recently Liked',
      description: 'Releases gathering the most review love in the latest stretch of activity.',
      releaseType: 'ALL',
      source: 'recent_likes',
      accent: 'from-[#8ecae6] to-[#2a9d8f]',
      limit: 250,
      section: 'core',
      status: 'live',
    },
    {
      slug: 'top-250-albums',
      title: 'Top 250 Albums',
      description: 'Full-length records with the strongest long-form consensus on the site.',
      releaseType: 'ALBUM',
      source: 'chart',
      accent: 'from-[#264653] to-[#f4d35e]',
      limit: 250,
      section: 'core',
      status: 'live',
    },
    {
      slug: 'top-250-eps',
      title: 'Top 250 EPs',
      description: 'Compact releases with outsized impact, ranked by community ratings.',
      releaseType: 'EP',
      source: 'chart',
      accent: 'from-[#2a9d8f] to-[#84a59d]',
      limit: 250,
      section: 'core',
      status: 'live',
    },
    {
      slug: 'top-250-songs',
      title: 'Top 250 Songs',
      description: 'Singles and one-off tracks with the strongest community rating consensus.',
      releaseType: 'SINGLE',
      source: 'chart',
      accent: 'from-[#5b8def] to-[#8ecae6]',
      limit: 250,
      section: 'core',
      status: 'live',
    },
    {
      slug: 'top-250-mixtapes',
      title: 'Top 250 Mixtapes',
      description: 'The site’s leading mixtapes, ranked live from listener ratings.',
      releaseType: 'MIXTAPE',
      source: 'chart',
      accent: 'from-[#e76f51] to-[#f7b267]',
      limit: 250,
      section: 'core',
      status: 'live',
    },
    {
      slug: 'top-250-rap-albums',
      title: 'Top 250 Rap Albums',
      description: 'A genre-focused official list for rap full-lengths once genre metadata lands across the catalog.',
      releaseType: 'ALBUM',
      source: 'chart',
      accent: 'from-[#3a0f0f] to-[#c65d3b]',
      limit: 250,
      section: 'genre',
      status: 'planned',
    },
    {
      slug: 'top-250-pop-albums',
      title: 'Top 250 Pop Albums',
      description: 'A pop-focused album chart planned for when the catalog has stable genre tagging.',
      releaseType: 'ALBUM',
      source: 'chart',
      accent: 'from-[#ff6fa3] to-[#ffd166]',
      limit: 250,
      section: 'genre',
      status: 'planned',
    },
    {
      slug: 'top-250-rnb-albums',
      title: 'Top 250 R&B Albums',
      description: 'A dedicated R&B albums chart that will go live once genre-level ranking becomes available.',
      releaseType: 'ALBUM',
      source: 'chart',
      accent: 'from-[#5b2a86] to-[#84dcc6]',
      limit: 250,
      section: 'genre',
      status: 'planned',
    },
    {
      slug: 'top-250-rap-eps',
      title: 'Top 250 Rap EPs',
      description: 'Short-form rap releases will get their own official list in the next metadata expansion.',
      releaseType: 'EP',
      source: 'chart',
      accent: 'from-[#7f5539] to-[#ddb892]',
      limit: 250,
      section: 'genre',
      status: 'planned',
    },
    {
      slug: 'top-250-pop-eps',
      title: 'Top 250 Pop EPs',
      description: 'Pop EPs are queued as a dedicated official list once genre filtering is live.',
      releaseType: 'EP',
      source: 'chart',
      accent: 'from-[#ff9f9f] to-[#f6bd60]',
      limit: 250,
      section: 'genre',
      status: 'planned',
    },
    {
      slug: 'top-250-rap-songs',
      title: 'Top 250 Rap Songs',
      description: 'A songs-focused rap chart is planned for when single-release genre ranking is supported.',
      releaseType: 'SINGLE',
      source: 'chart',
      accent: 'from-[#1d3557] to-[#e76f51]',
      limit: 250,
      section: 'genre',
      status: 'planned',
    },
    {
      slug: 'top-250-pop-songs',
      title: 'Top 250 Pop Songs',
      description: 'Pop singles and songs will get their own live official ranking once genre tags are in place.',
      releaseType: 'SINGLE',
      source: 'chart',
      accent: 'from-[#ff8fab] to-[#fb6f92]',
      limit: 250,
      section: 'genre',
      status: 'planned',
    },
    {
      slug: 'top-250-latin-albums',
      title: 'Top 250 Latin Albums',
      description: 'A region-focused albums chart for Latin releases is planned as the catalog gains territory metadata.',
      releaseType: 'ALBUM',
      source: 'chart',
      accent: 'from-[#e63946] to-[#ffb703]',
      limit: 250,
      section: 'region',
      status: 'planned',
    },
    {
      slug: 'top-250-ethiopian-albums',
      title: 'Top 250 Ethiopian Albums',
      description: 'An Ethiopian albums list is planned as soon as country-aware charting becomes available.',
      releaseType: 'ALBUM',
      source: 'chart',
      accent: 'from-[#2a9d8f] to-[#f4d35e]',
      limit: 250,
      section: 'region',
      status: 'planned',
    },
    {
      slug: 'top-250-latin-eps',
      title: 'Top 250 Latin EPs',
      description: 'Latin EPs will join the official lists once territory metadata is supported.',
      releaseType: 'EP',
      source: 'chart',
      accent: 'from-[#f28482] to-[#f6bd60]',
      limit: 250,
      section: 'region',
      status: 'planned',
    },
    {
      slug: 'top-250-latin-songs',
      title: 'Top 250 Latin Songs',
      description: 'A Latin songs chart is planned for the next wave of country and region support.',
      releaseType: 'SINGLE',
      source: 'chart',
      accent: 'from-[#4361ee] to-[#4cc9f0]',
      limit: 250,
      section: 'region',
      status: 'planned',
    },
  ]
}

export function getDynamicListDefinition(slug: string): DynamicListDefinition | null {
  return getDynamicListDefinitions().find((item) => item.slug === slug) || null
}

function buildRecentReviewDrivenChart(reviews: Review[], mode: 'recent_reviews' | 'recent_likes', limit: number): ChartResponse {
  const windowStart = new Date()
  windowStart.setDate(windowStart.getDate() - 7)
  const grouped = new Map<string, { release: Release; score: number }>()

  for (const review of reviews) {
    const reviewDate = new Date(review.createdAt)
    if (reviewDate < windowStart) {
      continue
    }

    const current = grouped.get(review.release.id)
    const delta = mode === 'recent_likes' ? review.likesCount : 1

    if (current) {
      current.score += delta
    } else {
      grouped.set(review.release.id, {
        release: review.release,
        score: delta,
      })
    }
  }

  const ranked = Array.from(grouped.values())
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.release.title.localeCompare(b.release.title))

  return {
    items: ranked.slice(0, limit).map((entry, index) => ({
      release: entry.release,
      rank: index + 1,
      averageRating: entry.release.averageRating || 0,
      ratingCount: entry.score,
    })),
    total: ranked.length,
    type: mode === 'recent_likes' ? 'RECENT_LIKES' : 'RECENT_REVIEWS',
  }
}

export async function getOfficialListData(definition: DynamicListDefinition, limit = 10): Promise<ChartResponse | null> {
  if (definition.status === 'planned') {
    return null
  }

  const resolvedLimit = Math.min(limit, definition.limit)

  if (definition.source === 'chart') {
    return getTopReleases(definition.releaseType === 'ALL' ? undefined : definition.releaseType, resolvedLimit)
  }

  const reviews: Review[] = []
  let offset = 0
  const pageSize = 50

  while (reviews.length < resolvedLimit * 6 && offset < 250) {
    const recentReviews = await getRecentReviews(pageSize, offset)
    if (!recentReviews?.data?.length) {
      break
    }

    reviews.push(...recentReviews.data)
    offset += recentReviews.data.length

    if (recentReviews.data.length < pageSize) {
      break
    }
  }

  if (reviews.length === 0) {
    return null
  }

  return buildRecentReviewDrivenChart(reviews, definition.source, resolvedLimit)
}

export async function searchMusic(query: string, type: 'all' | 'artist' | 'release' | 'track' | 'list' = 'all'): Promise<SearchResult | null> {
  if (!query.trim()) {
    return {
      artists: [],
      releases: [],
      tracks: [],
      lists: [],
      total: { artists: 0, releases: 0, tracks: 0, lists: 0 },
    }
  }

  try {
    return await fetchJson<SearchResult>(`/search?q=${encodeURIComponent(query)}&type=${type}`)
  } catch {
    return null
  }
}

export async function getArtist(id: string): Promise<ArtistDetail | null> {
  try {
    return await fetchJson<ArtistDetail>(`/artists/${id}`)
  } catch {
    return null
  }
}

export async function getRelease(id: string): Promise<Release | null> {
  try {
    return await fetchJson<Release>(`/releases/${id}`)
  } catch {
    return null
  }
}

export async function getReleaseReviews(
  id: string,
  limit = 8,
  offset = 0,
  options?: { sort?: 'recent' | 'oldest' | 'popular'; filter?: 'all' | 'diary' | 'standalone' },
): Promise<PaginatedEnvelope<Review> | null> {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    })

    if (options?.sort) {
      params.set('sort', options.sort)
    }

    if (options?.filter) {
      params.set('filter', options.filter)
    }

    return await fetchEnvelope<Review>(`/releases/${id}/reviews?${params.toString()}`)
  } catch {
    return null
  }
}

export async function getReleaseRatings(
  id: string,
  value: number,
  limit = 30,
  offset = 0,
): Promise<PaginatedEnvelope<Rating> | null> {
  try {
    return await fetchEnvelope<Rating>(`/releases/${id}/ratings?value=${value}&limit=${limit}&offset=${offset}`)
  } catch {
    return null
  }
}

export async function getReleaseLogs(id: string, limit = 30, offset = 0): Promise<PaginatedEnvelope<ReleaseLogEntry> | null> {
  try {
    return await fetchEnvelope<ReleaseLogEntry>(`/releases/${id}/logs?limit=${limit}&offset=${offset}`)
  } catch {
    return null
  }
}

export async function getReleaseLists(id: string, limit = 30, offset = 0): Promise<PaginatedEnvelope<List> | null> {
  try {
    return await fetchEnvelope<List>(`/releases/${id}/lists?limit=${limit}&offset=${offset}`)
  } catch {
    return null
  }
}

export async function getReleaseLikes(id: string, limit = 30, offset = 0): Promise<PaginatedEnvelope<ReleaseLikeEntry> | null> {
  try {
    return await fetchEnvelope<ReleaseLikeEntry>(`/releases/${id}/likes?limit=${limit}&offset=${offset}`)
  } catch {
    return null
  }
}

export async function getRecentReviews(limit = 12, offset = 0): Promise<PaginatedEnvelope<Review> | null> {
  try {
    return await fetchEnvelope<Review>(`/reviews/recent?limit=${limit}&offset=${offset}`)
  } catch {
    return null
  }
}

export async function getRecentDiaryEntries(limit = 12, offset = 0): Promise<PaginatedEnvelope<DiaryEntry> | null> {
  try {
    return await fetchEnvelope<DiaryEntry>(`/diary/recent?limit=${limit}&offset=${offset}`)
  } catch {
    return null
  }
}
