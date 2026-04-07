export interface CreateUserInput {
  email: string;
  username: string;
  password: string;
  displayName?: string;
  bio?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: Date;
}

export interface ArtistResponse {
  id: string;
  name: string;
  type: 'INDIVIDUAL' | 'GROUP';
  disambiguation: string | null;
  bio: string | null;
  musicBrainzId: string | null;
  spotifyId?: string | null;
  spotifyUrl?: string | null;
  createdAt: Date;
}

export interface ReleaseResponse {
  id: string;
  title: string;
  type: 'ALBUM' | 'EP' | 'SINGLE' | 'MIXTAPE';
  releaseDate: Date | null;
  disambiguation: string | null;
  artworkUrl: string | null;
  musicBrainzId: string | null;
  spotifyId?: string | null;
  spotifyUrl?: string | null;
  artist: ArtistResponse;
  createdAt: Date;
  averageRating?: number;
  ratingCount?: number;
  isLiked?: boolean;
}

export interface TrackResponse {
  id: string;
  title: string;
  duration: number | null;
  trackNumber: number | null;
  disambiguation: string | null;
  musicBrainzId: string | null;
  spotifyId?: string | null;
  spotifyUrl?: string | null;
  release: ReleaseResponse | null;
  artistCredits: ArtistCreditResponse[];
  averageRating?: number;
  ratingCount?: number;
  counts?: {
    ratings: number;
  };
  ratingBreakdown?: {
    average: number;
    total: number;
    histogram: Array<{
      value: number;
      count: number;
    }>;
  };
  userRating?: {
    id: string;
    value: number;
  } | null;
}

export interface ArtistCreditResponse {
  id: string;
  artist: ArtistResponse;
  role: 'MAIN_ARTIST' | 'FEATURED_ARTIST' | 'PRODUCER' | 'COMPOSER' | 'SONGWRITER' | 'LYRICIST' | 'ENGINEER' | 'REMIXER';
  joinPhrase: string | null;
  position: number | null;
}

export interface CreateReviewInput {
  content: string;
  releaseId: string;
}

export interface UpdateReviewInput {
  content: string;
}

export interface ReviewResponse {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user: UserResponse;
  release: ReleaseResponse;
  likesCount: number;
  isLiked?: boolean;
}

export interface CreateRatingInput {
  value: number;
  releaseId: string;
}

export interface RatingResponse {
  id: string;
  value: number;
  createdAt: Date;
  user: UserResponse;
  release: ReleaseResponse;
}

export interface TrackRatingResponse {
  id: string;
  value: number;
  createdAt: Date;
  user: UserResponse;
  track: TrackResponse;
}

export interface CreateDiaryEntryInput {
  releaseId: string;
  listenedAt: Date;
  notes?: string;
  createReview?: boolean;
  reviewContent?: string;
}

export interface DiaryEntryResponse {
  id: string;
  listenedAt: Date;
  notes: string | null;
  createdAt: Date;
  user: UserResponse;
  release: ReleaseResponse;
  review?: ReviewResponse | null;
}

export interface UpdateFavoritesInput {
  favorites: Array<{
    releaseId: string;
    position: number;
  }>;
}

export interface FavoriteResponse {
  id: string;
  position: number;
  createdAt: Date;
  user: UserResponse;
  section: 'ALBUMS' | 'SONGS';
  release: ReleaseResponse;
}

export interface FavoriteArtistResponse {
  id: string;
  position: number;
  createdAt: Date;
  user: UserResponse;
  artist: ArtistResponse;
}

export interface CreateListInput {
  title: string;
  description?: string;
  category?: 'MIXED' | 'ALBUMS' | 'SINGLES' | 'EPS' | 'MIXTAPES';
  isPublic?: boolean;
}

export interface UpdateListInput {
  title?: string;
  description?: string;
  category?: 'MIXED' | 'ALBUMS' | 'SINGLES' | 'EPS' | 'MIXTAPES';
  isPublic?: boolean;
}

export interface AddListItemInput {
  releaseId: string;
  position?: number;
  notes?: string;
}

export interface ListResponse {
  id: string;
  title: string;
  description: string | null;
  category: 'MIXED' | 'ALBUMS' | 'SINGLES' | 'EPS' | 'MIXTAPES';
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: UserResponse;
  itemsCount: number;
  likesCount?: number;
  isLiked?: boolean;
  items?: ListItemResponse[];
}

export interface ListItemResponse {
  id: string;
  position: number;
  notes: string | null;
  createdAt: Date;
  release: ReleaseResponse;
}

export interface SearchQuery {
  q: string;
  type?: 'artist' | 'release' | 'track' | 'all';
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  artists: ArtistResponse[];
  releases: ReleaseResponse[];
  tracks: TrackResponse[];
  total: {
    artists: number;
    releases: number;
    tracks: number;
  };
}

export interface ChartQuery {
  type?: 'ALBUM' | 'EP' | 'SINGLE' | 'MIXTAPE';
  limit?: number;
  offset?: number;
}

export interface ChartResponse {
  items: Array<{
    release: ReleaseResponse;
    rank: number;
    averageRating: number;
    ratingCount: number;
  }>;
  total: number;
  type: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
