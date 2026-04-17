import axios from 'axios';
import https from 'https';

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyImage {
  url: string;
}

interface SpotifyFollowers {
  total?: number;
}

interface SpotifyArtistRef {
  id: string;
  name: string;
}

interface SpotifyExternalUrls {
  spotify?: string;
}

interface SpotifyTrackAlbumRef {
  id: string;
  name: string;
  album_type?: string;
  release_date?: string;
  images?: SpotifyImage[];
}

export interface SpotifyArtist {
  id: string;
  name: string;
  popularity?: number;
  genres?: string[];
  followers?: SpotifyFollowers;
  external_urls?: SpotifyExternalUrls;
}

interface SpotifyCopyright {
  text?: string;
  type?: string;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  album_type: 'album' | 'single' | 'compilation';
  release_date?: string;
  total_tracks?: number;
  label?: string;
  popularity?: number;
  copyrights?: SpotifyCopyright[];
  images?: SpotifyImage[];
  artists?: SpotifyArtistRef[];
  external_urls?: SpotifyExternalUrls;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms?: number;
  disc_number?: number;
  track_number?: number;
  artists?: SpotifyArtistRef[];
  album?: SpotifyTrackAlbumRef;
  external_urls?: SpotifyExternalUrls;
}

type CachedToken = {
  accessToken: string;
  expiresAt: number;
};

export class SpotifyService {
  private readonly baseUrl = process.env.SPOTIFY_API_BASE_URL || 'https://api.spotify.com/v1';
  private readonly authUrl = process.env.SPOTIFY_AUTH_URL || 'https://accounts.spotify.com/api/token';
  private readonly requestTimeoutMs = Number(process.env.SPOTIFY_REQUEST_TIMEOUT_MS || 20000);
  private readonly forceIpv4 = (process.env.SPOTIFY_FORCE_IPV4 || 'false').toLowerCase() === 'true';
  private readonly httpsAgent = this.forceIpv4 ? new https.Agent({ family: 4 }) : undefined;
  private tokenCache: CachedToken | null = null;

  private getClientCredentials() {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return null;
    }
    return { clientId, clientSecret };
  }

  isConfigured() {
    return Boolean(this.getClientCredentials());
  }

  artistUrl(id: string | null | undefined) {
    if (!id) return null;
    return `https://open.spotify.com/artist/${id}`;
  }

  albumUrl(id: string | null | undefined) {
    if (!id) return null;
    return `https://open.spotify.com/album/${id}`;
  }

  trackUrl(id: string | null | undefined) {
    if (!id) return null;
    return `https://open.spotify.com/track/${id}`;
  }

  private async sleep(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private shouldRetry(error: unknown) {
    if (!axios.isAxiosError(error)) {
      return false;
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.code === 'ENETUNREACH') {
      return true;
    }

    const status = error.response?.status;
    return status === 429 || (status !== undefined && status >= 500);
  }

  private normalizeError(error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 'unknown';
      const code = error.code ?? 'unknown';
      const responseData = error.response?.data;
      const remoteMessage =
        typeof responseData === 'string'
          ? responseData
          : (responseData as any)?.error_description || (responseData as any)?.error?.message || (responseData as any)?.message;

      const suffix = remoteMessage ? ` - ${remoteMessage}` : '';
      return `Spotify request failed (${status}/${code}): ${error.message}${suffix}`;
    }

    if (error && typeof error === "object" && (error as any).name === "AggregateError") {
      return "Spotify request failed (aggregate): " + (((error as any).message as string) || "multiple network errors");
    }

    if (error instanceof Error) {
      return `Spotify request failed (${error.name}): ${error.message}`;
    }

    return `Spotify request failed: ${String(error)}`;
  }

  private async getAccessToken() {
    const credentials = this.getClientCredentials();
    if (!credentials) {
      throw new Error('Spotify credentials are missing');
    }

    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now + 15000) {
      return this.tokenCache.accessToken;
    }

    const body = new URLSearchParams({ grant_type: 'client_credentials' });
    const basic = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');

    let response;
    try {
      response = await axios.post<SpotifyTokenResponse>(this.authUrl, body, {
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: this.requestTimeoutMs,
        httpsAgent: this.httpsAgent,
      });
    } catch (error) {
      if (this.shouldRetry(error)) {
        await this.sleep(300);
        response = await axios.post<SpotifyTokenResponse>(this.authUrl, body, {
          headers: {
            Authorization: `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: this.requestTimeoutMs,
          httpsAgent: this.httpsAgent,
        });
      } else {
        throw error;
      }
    }

    this.tokenCache = {
      accessToken: response.data.access_token,
      expiresAt: now + (response.data.expires_in || 3600) * 1000,
    };

    return this.tokenCache.accessToken;
  }

  private async request<T>(path: string, params?: Record<string, string | number>) {
    const accessToken = await this.getAccessToken();

    try {
      const response = await axios.get<T>(`${this.baseUrl}${path}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params,
        timeout: this.requestTimeoutMs,
        httpsAgent: this.httpsAgent,
      });
      return response.data;
    } catch (error) {
      if (this.shouldRetry(error)) {
        await this.sleep(300);
        const response = await axios.get<T>(`${this.baseUrl}${path}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params,
          timeout: this.requestTimeoutMs,
          httpsAgent: this.httpsAgent,
        });
        return response.data;
      }

      throw error;
    }
  }

  private async safeRequest<T>(operation: string, fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(this.normalizeError(error), { operation, forceIpv4: this.forceIpv4 });
      }
      return fallback;
    }
  }

  async searchArtists(query: string, limit = 10): Promise<SpotifyArtist[]> {
    if (!this.isConfigured()) return [];

    return this.safeRequest('searchArtists', async () => {
      const payload = await this.request<{ artists: { items: SpotifyArtist[] } }>('/search', {
        q: query,
        type: 'artist',
        limit,
      });
      return payload.artists.items || [];
    }, []);
  }

  async searchAlbums(query: string, limit = 10): Promise<SpotifyAlbum[]> {
    if (!this.isConfigured()) return [];

    return this.safeRequest('searchAlbums', async () => {
      const payload = await this.request<{ albums: { items: SpotifyAlbum[] } }>('/search', {
        q: query,
        type: 'album',
        market: 'US',
        limit,
      });
      return payload.albums.items || [];
    }, []);
  }

  async searchTracks(query: string, limit = 10): Promise<SpotifyTrack[]> {
    if (!this.isConfigured()) return [];

    return this.safeRequest('searchTracks', async () => {
      const payload = await this.request<{ tracks: { items: SpotifyTrack[] } }>('/search', {
        q: query,
        type: 'track',
        market: 'US',
        limit,
      });
      return payload.tracks.items || [];
    }, []);
  }

  async getArtistById(id: string): Promise<SpotifyArtist | null> {
    if (!this.isConfigured()) return null;

    return this.safeRequest('getArtistById', async () => {
      return await this.request<SpotifyArtist>(`/artists/${id}`);
    }, null);
  }

  async getAlbumById(id: string): Promise<SpotifyAlbum | null> {
    if (!this.isConfigured()) return null;

    return this.safeRequest('getAlbumById', async () => {
      return await this.request<SpotifyAlbum>(`/albums/${id}`, { market: 'US' });
    }, null);
  }

  async getTrackById(id: string): Promise<SpotifyTrack | null> {
    if (!this.isConfigured()) return null;

    return this.safeRequest('getTrackById', async () => {
      return await this.request<SpotifyTrack>(`/tracks/${id}`, { market: 'US' });
    }, null);
  }

  async getArtistAlbums(artistId: string, limit = 50): Promise<SpotifyAlbum[]> {
    if (!this.isConfigured()) return [];

    return this.safeRequest('getArtistAlbums', async () => {
      const seen = new Set<string>();
      const collected: SpotifyAlbum[] = [];
      const target = Math.max(1, Math.min(limit, 50));
      const pageSize = Math.min(target, 10);
      let offset = 0;

      while (collected.length < target) {
        const payload = await this.request<{ items: SpotifyAlbum[] }>(`/artists/${artistId}/albums`, {
          include_groups: 'album,single',
          market: 'US',
          limit: pageSize,
          offset,
        });

        const items = payload.items || [];
        if (!items.length) {
          break;
        }

        for (const album of items) {
          if (!album?.id || seen.has(album.id)) {
            continue;
          }
          seen.add(album.id);
          collected.push(album);
          if (collected.length >= target) {
            break;
          }
        }

        if (items.length < pageSize) {
          break;
        }

        offset += pageSize;
      }

      return collected;
    }, []);
  }

  async getAlbumTracks(id: string, limit = 50): Promise<SpotifyTrack[]> {
    if (!this.isConfigured()) return [];

    return this.safeRequest('getAlbumTracks', async () => {
      const payload = await this.request<{ items: SpotifyTrack[] }>(`/albums/${id}/tracks`, {
        market: 'US',
        limit,
      });
      return payload.items || [];
    }, []);
  }
}

export const spotifyService = new SpotifyService();
