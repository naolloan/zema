export * from '../../../shared/types'

export interface MobileApiEnvelope<T> {
  success: boolean
  data: T
  error?: string
  message?: string
}

export interface AuthUser {
  id: string
  email?: string
  username: string
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
  emailVerifiedAt?: string | null
}

export interface Session {
  token: string
  user: AuthUser
}

export interface RegistrationResult {
  requiresEmailVerification: true
  email: string
  previewUrl: string | null
  deliveryMode?: 'email' | 'preview'
  deliveryReason?: string | null
}

export interface PasswordResetRequestResult {
  previewUrl: string | null
  deliveryMode?: 'email' | 'preview'
  deliveryReason?: string | null
}

export interface MobileArtistSummary {
  id: string
  name: string
  type: 'INDIVIDUAL' | 'GROUP'
  spotifyId?: string | null
  spotifyUrl?: string | null
}

export interface MobileArtistCredit {
  id: string
  role: 'MAIN_ARTIST' | 'FEATURED_ARTIST' | 'PRODUCER' | 'COMPOSER' | 'SONGWRITER' | 'LYRICIST' | 'ENGINEER' | 'REMIXER'
  joinPhrase: string | null
  position: number | null
  artist: MobileArtistSummary
}

export interface MobileReleaseCounts {
  ratings: number
  reviews: number
  logs: number
  likes: number
  lists: number
}

export interface MobileReleaseRanking {
  rank: number
  type: 'ALBUM' | 'EP' | 'SINGLE' | 'MIXTAPE'
}

export interface MobileReleaseRatingBreakdown {
  average: number
  total: number
  histogram: Array<{
    value: number
    count: number
  }>
}

export interface MobileUserRatingSummary {
  id: string
  value: number
}

export interface MobileReleaseSummary {
  id: string
  title: string
  type: 'ALBUM' | 'EP' | 'SINGLE' | 'MIXTAPE'
  releaseDate: string | null
  disambiguation: string | null
  artworkUrl: string | null
  musicBrainzId: string | null
  spotifyId?: string | null
  spotifyUrl?: string | null
  createdAt: string
  updatedAt?: string
  artist: MobileArtistSummary
  artistCredits: MobileArtistCredit[]
  averageRating?: number
  ratingCount?: number
  counts?: MobileReleaseCounts
  ranking?: MobileReleaseRanking | null
}

export interface MobileTrack {
  id: string
  title: string
  duration: number | null
  trackNumber: number | null
  release: MobileReleaseSummary | null
  artistCredits: MobileArtistCredit[]
}

export interface MobileReleaseDetail extends MobileReleaseSummary {
  tracks?: MobileTrack[]
  ratingBreakdown?: MobileReleaseRatingBreakdown
  userRating?: MobileUserRatingSummary | null
  isLiked?: boolean
  isWantToHear?: boolean
}

export interface MobileListSummary {
  id: string
  title: string
  description: string | null
  category: 'MIXED' | 'ALBUMS' | 'SINGLES' | 'EPS' | 'MIXTAPES'
  isPublic: boolean
  createdAt: string
  updatedAt: string
  itemsCount: number
}

export interface MobileDiaryEntry {
  id: string
  listenedAt: string
  notes: string | null
  createdAt?: string
  release: MobileReleaseSummary
}

export interface MobileChartItem {
  release: MobileReleaseSummary
  rank: number
  averageRating: number
  ratingCount: number
}

export interface MobileChartResponse {
  items: MobileChartItem[]
  total: number
  type: string
}

export interface MobileRating {
  id: string
  value: number
  createdAt: string
  updatedAt?: string
}

export interface MobileNavItem {
  label: string
  href: string
}
