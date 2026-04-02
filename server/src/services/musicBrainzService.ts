import axios from 'axios';

interface MusicBrainzArtist {
  id: string;
  name: string;
  type?: string;
  disambiguation?: string;
}

interface MusicBrainzRelease {
  id: string;
  title: string;
  date?: string;
  disambiguation?: string;
  'artist-credit'?: Array<{
    name?: string;
    joinphrase?: string;
    artist?: MusicBrainzArtist;
  }>;
  'release-group'?: {
    id?: string;
    'primary-type'?: string;
    'secondary-types'?: string[];
  };
}

interface MusicBrainzTrack {
  id: string;
  title: string;
  length?: number;
  number?: string;
  'artist-credit'?: Array<{
    joinphrase?: string;
    artist?: MusicBrainzArtist;
  }>;
}

export class MusicBrainzService {
  private readonly baseUrl = process.env.MUSICBRAINZ_API_BASE_URL || 'https://musicbrainz.org/ws/2';
  private readonly userAgent = process.env.MUSICBRAINZ_USER_AGENT || 'ZemaMusicPlatform/1.0 (dev@zema.local)';
  private readonly timeoutMs = Number(process.env.MUSICBRAINZ_TIMEOUT_MS || 15000);

  private async request<T>(path: string, params: Record<string, string | number> = {}) {
    const response = await axios.get<T>(`${this.baseUrl}${path}`, {
      params: {
        ...params,
        fmt: 'json',
      },
      headers: {
        'User-Agent': this.userAgent,
      },
      timeout: this.timeoutMs,
    });

    return response.data;
  }

  private safeDate(value?: string | null) {
    if (!value) return null;
    if (/^\d{4}$/.test(value)) {
      return new Date(`${value}-01-01T00:00:00.000Z`);
    }
    if (/^\d{4}-\d{2}$/.test(value)) {
      return new Date(`${value}-01T00:00:00.000Z`);
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  async searchArtists(query: string, limit = 10): Promise<MusicBrainzArtist[]> {
    try {
      const payload = await this.request<{ artists?: MusicBrainzArtist[] }>('/artist', {
        query,
        limit,
      });
      return payload.artists || [];
    } catch {
      return [];
    }
  }

  async searchReleases(query: string, limit = 10): Promise<MusicBrainzRelease[]> {
    try {
      const payload = await this.request<{ releases?: MusicBrainzRelease[] }>('/release', {
        query,
        limit,
      });
      return payload.releases || [];
    } catch {
      return [];
    }
  }

  async searchTracks(query: string, limit = 10): Promise<MusicBrainzTrack[]> {
    try {
      const payload = await this.request<{ recordings?: MusicBrainzTrack[] }>('/recording', {
        query,
        limit,
      });
      return payload.recordings || [];
    } catch {
      return [];
    }
  }

  async getArtistById(id: string): Promise<MusicBrainzArtist | null> {
    try {
      return await this.request<MusicBrainzArtist>(`/artist/${id}`);
    } catch {
      return null;
    }
  }

  async getArtistReleases(artistId: string, limit = 100): Promise<MusicBrainzRelease[]> {
    try {
      const payload = await this.request<{ releases?: MusicBrainzRelease[] }>(`/release`, {
        artist: artistId,
        inc: 'release-groups+artist-credits+artists',
        limit,
      });
      return payload.releases || [];
    } catch {
      return [];
    }
  }

  async getReleaseById(id: string): Promise<MusicBrainzRelease | null> {
    try {
      return await this.request<MusicBrainzRelease>(`/release/${id}`, {
        inc: 'release-groups+artist-credits+artists+recordings',
      });
    } catch {
      return null;
    }
  }

  async getReleaseTracks(id: string): Promise<MusicBrainzTrack[]> {
    try {
      const payload = await this.request<any>(`/release/${id}`, {
        inc: 'recordings+artist-credits+artists',
      });

      const media = Array.isArray(payload?.media) ? payload.media : [];
      const tracks: MusicBrainzTrack[] = [];
      for (const disc of media) {
        if (!Array.isArray(disc?.tracks)) continue;
        for (const track of disc.tracks) {
          tracks.push(track);
        }
      }

      return tracks;
    } catch {
      return [];
    }
  }

  getCoverArtUrl(releaseId?: string | null) {
    if (!releaseId) return null;
    return `https://coverartarchive.org/release/${releaseId}/front`;
  }

  parseReleaseDate(value?: string | null) {
    return this.safeDate(value);
  }

  mapArtistType(musicBrainzType?: string): 'INDIVIDUAL' | 'GROUP' {
    const normalized = (musicBrainzType || '').toLowerCase();
    if (normalized === 'group' || normalized === 'orchestra' || normalized === 'choir') {
      return 'GROUP';
    }
    return 'INDIVIDUAL';
  }

  mapReleaseType(primaryType?: string, secondaryTypes?: string[] | null): 'ALBUM' | 'EP' | 'SINGLE' | 'MIXTAPE' {
    const primary = (primaryType || '').toLowerCase();
    const secondary = (secondaryTypes || []).map((item) => item.toLowerCase());

    if (secondary.includes('mixtape')) return 'MIXTAPE';
    if (primary === 'single') return 'SINGLE';
    if (primary === 'ep') return 'EP';
    return 'ALBUM';
  }
}

export const musicBrainzService = new MusicBrainzService();
