export * from '../../../shared/types'

export interface MobileApiEnvelope<T> {
  success: boolean
  data: T
  error?: string
  message?: string
}

export interface MobilePaginatedEnvelope<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export type CommentPermission = 'ANYONE' | 'FOLLOWING' | 'SELF'
export type ListCategory = 'MIXED' | 'ALBUMS' | 'SINGLES' | 'EPS' | 'MIXTAPES'

export interface MobileUser {
  id: string
  email?: string
  username: string
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
  emailVerifiedAt?: string | null
  createdAt?: string
  commentPermission?: CommentPermission
  counts?: {
    followers?: number
    following?: number
    reviews?: number
    likedReleases?: number
  }
  isFollowing?: boolean
  isFollowedBy?: boolean
  isFriend?: boolean
}

export type AuthUser = MobileUser

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
  disambiguation?: string | null
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
  isLiked?: boolean
  isWantToHear?: boolean
  isLogged?: boolean
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
}

export interface MobileFavoriteRelease {
  id: string
  position: number
  section: 'ALBUMS' | 'SONGS'
  createdAt: string
  user?: MobileUser
  release: MobileReleaseSummary
}

export interface MobileFavoriteArtist {
  id: string
  position: number
  createdAt: string
  user?: MobileUser
  artist: MobileArtistSummary
}

export interface MobileListSummary {
  id: string
  title: string
  description: string | null
  category: ListCategory
  isPublic: boolean
  createdAt: string
  updatedAt: string
  itemsCount: number
  likesCount?: number
  isLiked?: boolean
  user?: MobileUser
  previewReleases?: MobileReleaseSummary[]
}

export interface MobileDiaryEntry {
  id: string
  listenedAt: string
  notes: string | null
  createdAt?: string
  release: MobileReleaseSummary
  review?: MobileReview | null
}

export interface MobileReviewComment {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  user: MobileUser
}

export interface MobileReview {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  user: MobileUser
  release: MobileReleaseSummary | null
  likesCount: number
  isLiked?: boolean
  diaryEntryId?: string | null
  comments: MobileReviewComment[]
}

export interface MobileListItem {
  id: string
  position: number
  notes: string | null
  release: MobileReleaseSummary
}

export interface MobileListComment {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  user: MobileUser
}

export interface MobileListDetail extends MobileListSummary {
  items: MobileListItem[]
  comments: MobileListComment[]
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

export interface MobileWantToHearItem {
  id: string
  createdAt: string
  release: MobileReleaseSummary
}

export interface MobileLikedReleaseItem {
  id: string
  createdAt: string
  release: MobileReleaseSummary
}

export interface MobileNotificationItem {
  id: string
  type: 'follow' | 'review_like' | 'review_comment' | 'list_like'
  createdAt: string
  text: string
  user: MobileUser
  unread?: boolean
  targetUrl?: string
  release?: MobileReleaseSummary
  list?: {
    id: string
    title: string
  }
}

export interface MobileProfile extends MobileUser {
  _count: {
    reviews: number
    ratings: number
    diaryEntries: number
    lists: number
    wantToHear: number
    followers?: number
    following?: number
  }
  favoriteAlbums: MobileFavoriteRelease[]
  favoriteSongs: MobileFavoriteRelease[]
  favoriteArtists: MobileFavoriteArtist[]
  counts?: {
    followers: number
    following: number
    likedReleases?: number
  }
}

export interface MobileFollowState {
  isFollowing: boolean
  isFollowedBy: boolean
  isFriend: boolean
}

export interface MobileNavItem {
  label: string
  href: string
}
