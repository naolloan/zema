export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: Date;
}

export interface Artist {
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

export interface Release {
  id: string;
  title: string;
  type: 'ALBUM' | 'EP' | 'SINGLE' | 'MIXTAPE';
  releaseDate: Date | null;
  disambiguation: string | null;
  artworkUrl: string | null;
  musicBrainzId: string | null;
  spotifyId?: string | null;
  spotifyUrl?: string | null;
  artist: Artist;
  createdAt: Date;
  averageRating?: number;
  ratingCount?: number;
}

export interface Track {
  id: string;
  title: string;
  duration: number | null;
  trackNumber: number | null;
  disambiguation: string | null;
  musicBrainzId: string | null;
  release: Release | null;
  artistCredits: ArtistCredit[];
}

export interface ArtistCredit {
  id: string;
  artist: Artist;
  role: 'MAIN_ARTIST' | 'FEATURED_ARTIST' | 'PRODUCER' | 'COMPOSER' | 'SONGWRITER' | 'LYRICIST' | 'ENGINEER' | 'REMIXER';
  joinPhrase: string | null;
  position: number | null;
}

export interface Review {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user: User;
  release: Release;
  likesCount: number;
  isLiked?: boolean;
}

export interface Rating {
  id: string;
  value: number;
  createdAt: Date;
  user: User;
  release: Release;
}

export interface DiaryEntry {
  id: string;
  listenedAt: Date;
  notes: string | null;
  createdAt: Date;
  user: User;
  release: Release;
  review?: Review | null;
}

export interface Favorite {
  id: string;
  position: number;
  createdAt: Date;
  user: User;
  release: Release;
}

export interface List {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: User;
  itemsCount: number;
  items?: ListItem[];
}

export interface ListItem {
  id: string;
  position: number;
  notes: string | null;
  createdAt: Date;
  release: Release;
}

export interface SearchResult {
  artists: Artist[];
  releases: Release[];
  tracks: Track[];
  total: {
    artists: number;
    releases: number;
    tracks: number;
  };
}

export interface ChartItem {
  release: Release;
  rank: number;
  averageRating: number;
  ratingCount: number;
}

export interface ChartResponse {
  items: ChartItem[];
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
