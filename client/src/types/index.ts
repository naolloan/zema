export interface User {
  id: string
  email?: string
  emailVerifiedAt?: string | null
  username: string
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
  createdAt: string
  commentPermission?: 'ANYONE' | 'FOLLOWING' | 'SELF'
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

export interface ReviewComment {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  user: User
}

export interface ListComment {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  user: User
}

export interface Artist {
  id: string
  name: string
  type: 'INDIVIDUAL' | 'GROUP'
  disambiguation: string | null
  bio: string | null
  musicBrainzId: string | null
  spotifyId?: string | null
  spotifyUrl?: string | null
  createdAt: string
  updatedAt?: string
}

export interface ArtistCredit {
  id: string
  artist: Artist
  role: 'MAIN_ARTIST' | 'FEATURED_ARTIST' | 'PRODUCER' | 'COMPOSER' | 'SONGWRITER' | 'LYRICIST' | 'ENGINEER' | 'REMIXER'
  joinPhrase: string | null
  position: number | null
}

export interface ReleaseCounts {
  ratings: number
  reviews: number
  logs: number
  likes: number
  lists: number
}

export interface ReleaseRanking {
  rank: number
  type: 'ALBUM' | 'EP' | 'SINGLE' | 'MIXTAPE'
}

export interface ReleaseRatingBreakdown {
  average: number
  total: number
  histogram: Array<{
    value: number
    count: number
  }>
}

export interface UserRatingSummary {
  id: string
  value: number
}

export interface Release {
  id: string
  title: string
  type: 'ALBUM' | 'EP' | 'SINGLE' | 'MIXTAPE'
  releaseDate: string | null
  disambiguation: string | null
  artworkUrl: string | null
  musicBrainzId: string | null
  spotifyId?: string | null
  spotifyUrl?: string | null
  artist: Artist
  artistCredits: ArtistCredit[]
  createdAt: string
  updatedAt?: string
  averageRating?: number
  ratingCount?: number
  counts?: ReleaseCounts
  ranking?: ReleaseRanking | null
  ratingBreakdown?: ReleaseRatingBreakdown
  tracks?: Track[]
  userRating?: UserRatingSummary | null
  isLiked?: boolean
  isWantToHear?: boolean
  isLogged?: boolean
}

export interface Track {
  id: string
  title: string
  duration: number | null
  trackNumber: number | null
  disambiguation: string | null
  musicBrainzId: string | null
  createdAt?: string
  updatedAt?: string
  release: Release | null
  artistCredits: ArtistCredit[]
}

export interface Review {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  user: User
  release: Release
  likesCount: number
  isLiked?: boolean
  diaryEntryId?: string | null
  comments: ReviewComment[]
}

export interface Rating {
  id: string
  value: number
  createdAt: string
  updatedAt?: string
  userId?: string
  releaseId?: string
  user?: User
  release: Release
}

export interface DiaryEntry {
  id: string
  listenedAt: string
  notes: string | null
  createdAt?: string
  user?: User
  release: Release
  review?: Review | null
}

export interface ReleaseLogEntry {
  id: string
  listenedAt: string
  notes: string | null
  createdAt: string
  user: User
  review?: Review | null
}

export interface ReleaseLikeEntry {
  id: string
  createdAt: string
  user: User
}

export interface Favorite {
  id: string
  position: number
  section: 'ALBUMS' | 'SONGS'
  createdAt: string
  user?: User
  release: Release
}

export interface FavoriteArtist {
  id: string
  position: number
  createdAt: string
  user?: User
  artist: Artist
}

export interface WantToHearItem {
  id: string
  createdAt: string
  release: Release
}

export interface LikedReleaseItem {
  id: string
  createdAt: string
  release: Release
}

export interface NotificationItem {
  id: string
  type: 'follow' | 'review_like' | 'review_comment' | 'list_like'
  createdAt: string
  text: string
  user: User
  unread?: boolean
  targetUrl?: string
  release?: Release
  list?: {
    id: string
    title: string
  }
}

export interface ListItem {
  id: string
  position: number
  notes: string | null
  createdAt?: string
  release: Release
}

export interface List {
  id: string
  title: string
  description: string | null
  category: 'MIXED' | 'ALBUMS' | 'SINGLES' | 'EPS' | 'MIXTAPES'
  isPublic: boolean
  createdAt: string
  updatedAt: string
  user: User
  itemsCount: number
  likesCount?: number
  isLiked?: boolean
  items?: ListItem[]
  comments?: ListComment[]
  previewReleases?: Release[]
}

export interface SearchResult {
  artists: Artist[]
  releases: Release[]
  tracks: Track[]
  lists: List[]
  total: {
    artists: number
    releases: number
    tracks: number
    lists: number
  }
}

export interface ChartItem {
  release: Release
  rank: number
  averageRating: number
  ratingCount: number
}

export interface ChartResponse {
  items: ChartItem[]
  total: number
  type: string
}

export interface DynamicListDefinition {
  slug: string
  title: string
  description: string
  releaseType: 'ALBUM' | 'EP' | 'SINGLE' | 'MIXTAPE' | 'ALL'
  source: 'chart' | 'recent_reviews' | 'recent_likes'
  accent: string
  limit: number
  section: 'core' | 'genre' | 'region'
  status: 'live' | 'planned'
}

export interface ArtistDetail extends Artist {
  releases: Release[]
  releaseCount: number
}

export interface Profile extends User {
  _count: {
    reviews: number
    ratings: number
    diaryEntries: number
    lists: number
    wantToHear: number
    followers?: number
    following?: number
  }
  favoriteAlbums: Favorite[]
  favoriteSongs: Favorite[]
  favoriteArtists: FavoriteArtist[]
  counts?: {
    followers: number
    following: number
    likedReleases?: number
  }
}

export interface UserSearchResult {
  success: boolean
  data: User[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface AuthSession {
  user: User
  token: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedEnvelope<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
