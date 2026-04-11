import axios from 'axios';

interface MusicBrainzRelation {
  type?: string;
  url?: {
    resource?: string;
  };
}

interface MusicBrainzArtistResponse {
  disambiguation?: string;
  relations?: MusicBrainzRelation[];
}

interface MusicBrainzReleaseResponse {
  disambiguation?: string;
  relations?: MusicBrainzRelation[];
  'release-group'?: {
    id?: string;
  };
}

interface MusicBrainzReleaseGroupResponse {
  disambiguation?: string;
  relations?: MusicBrainzRelation[];
}

export interface DescriptionResolution {
  description: string | null;
  wikidataId: string | null;
  wikipediaUrl: string | null;
  disambiguation?: string | null;
}

class CatalogDescriptionService {
  private readonly musicBrainzBaseUrl = process.env.MUSICBRAINZ_API_BASE_URL || 'https://musicbrainz.org/ws/2';
  private readonly musicBrainzUserAgent = process.env.MUSICBRAINZ_USER_AGENT || 'ZemaMusicPlatform/1.0 (dev@zema.local)';
  private readonly timeoutMs = Number(process.env.CATALOG_DESCRIPTION_TIMEOUT_MS || 12000);

  private async requestMusicBrainz<T>(path: string, params: Record<string, string | number> = {}) {
    const response = await axios.get<T>(`${this.musicBrainzBaseUrl}${path}`, {
      params: {
        ...params,
        fmt: 'json',
      },
      headers: {
        'User-Agent': this.musicBrainzUserAgent,
      },
      timeout: this.timeoutMs,
    });

    return response.data;
  }

  private extractReferenceTargets(relations: MusicBrainzRelation[] | undefined) {
    let wikipediaUrl: string | null = null;
    let wikidataId: string | null = null;

    for (const relation of relations || []) {
      const resource = relation.url?.resource;
      if (!resource) continue;

      try {
        const parsed = new URL(resource);
        if (!wikipediaUrl && parsed.hostname.endsWith('wikipedia.org') && parsed.pathname.startsWith('/wiki/')) {
          wikipediaUrl = resource;
        }

        if (!wikidataId && parsed.hostname === 'www.wikidata.org') {
          const match = parsed.pathname.match(/\/wiki\/(Q\d+)/i);
          if (match) {
            wikidataId = match[1];
          }
        }
      } catch {
        continue;
      }
    }

    return { wikipediaUrl, wikidataId };
  }

  private async fetchWikipediaSummary(wikipediaUrl: string) {
    try {
      const parsed = new URL(wikipediaUrl);
      const title = decodeURIComponent(parsed.pathname.replace(/^\/wiki\//, '')).replace(/ /g, '_');
      if (!title) {
        return null;
      }

      const summaryUrl = new URL(`/api/rest_v1/page/summary/${encodeURIComponent(title)}`, `${parsed.protocol}//${parsed.host}`);
      const response = await axios.get(summaryUrl.toString(), {
        headers: {
          Accept: 'application/json',
          'User-Agent': this.musicBrainzUserAgent,
        },
        timeout: this.timeoutMs,
      });

      const extract = typeof response.data?.extract === 'string' ? response.data.extract.trim() : '';
      if (!extract) {
        return null;
      }

      return {
        description: extract,
        wikipediaUrl,
      };
    } catch {
      return null;
    }
  }

  private async fetchWikidataDescription(wikidataId: string) {
    try {
      const response = await axios.get('https://www.wikidata.org/w/api.php', {
        params: {
          action: 'wbgetentities',
          ids: wikidataId,
          format: 'json',
          props: 'descriptions|sitelinks',
          origin: '*',
        },
        headers: {
          'User-Agent': this.musicBrainzUserAgent,
        },
        timeout: this.timeoutMs,
      });

      const entity = response.data?.entities?.[wikidataId];
      if (!entity) {
        return null;
      }

      const description = typeof entity?.descriptions?.en?.value === 'string' ? entity.descriptions.en.value.trim() : '';
      const enwikiTitle = typeof entity?.sitelinks?.enwiki?.title === 'string' ? entity.sitelinks.enwiki.title : null;
      const wikipediaUrl = enwikiTitle ? `https://en.wikipedia.org/wiki/${encodeURIComponent(enwikiTitle.replace(/ /g, '_'))}` : null;

      if (wikipediaUrl) {
        const summary = await this.fetchWikipediaSummary(wikipediaUrl);
        if (summary?.description) {
          return {
            description: summary.description,
            wikipediaUrl,
          };
        }
      }

      if (!description) {
        return null;
      }

      return {
        description,
        wikipediaUrl,
      };
    } catch {
      return null;
    }
  }

  async resolveArtistDescription(musicBrainzId: string): Promise<DescriptionResolution | null> {
    try {
      const payload = await this.requestMusicBrainz<MusicBrainzArtistResponse>(`/artist/${musicBrainzId}`, {
        inc: 'url-rels',
      });

      const references = this.extractReferenceTargets(payload.relations);
      if (references.wikipediaUrl) {
        const summary = await this.fetchWikipediaSummary(references.wikipediaUrl);
        if (summary?.description) {
          return {
            description: summary.description,
            wikipediaUrl: references.wikipediaUrl,
            wikidataId: references.wikidataId,
            disambiguation: payload.disambiguation || null,
          };
        }
      }

      if (references.wikidataId) {
        const wikidata = await this.fetchWikidataDescription(references.wikidataId);
        if (wikidata?.description) {
          return {
            description: wikidata.description,
            wikipediaUrl: wikidata.wikipediaUrl || references.wikipediaUrl,
            wikidataId: references.wikidataId,
            disambiguation: payload.disambiguation || null,
          };
        }
      }

      return {
        description: null,
        wikipediaUrl: references.wikipediaUrl,
        wikidataId: references.wikidataId,
        disambiguation: payload.disambiguation || null,
      };
    } catch {
      return null;
    }
  }

  async resolveReleaseDescription(musicBrainzId: string): Promise<DescriptionResolution | null> {
    try {
      const payload = await this.requestMusicBrainz<MusicBrainzReleaseResponse>(`/release/${musicBrainzId}`, {
        inc: 'url-rels+release-groups',
      });

      let references = this.extractReferenceTargets(payload.relations);
      let disambiguation = payload.disambiguation || null;

      if (!references.wikipediaUrl && !references.wikidataId && payload['release-group']?.id) {
        try {
          const groupPayload = await this.requestMusicBrainz<MusicBrainzReleaseGroupResponse>(`/release-group/${payload['release-group'].id}`, {
            inc: 'url-rels',
          });
          references = this.extractReferenceTargets(groupPayload.relations);
          disambiguation = disambiguation || groupPayload.disambiguation || null;
        } catch {
          // Ignore release-group lookup failures and return whatever we already have.
        }
      }

      if (references.wikipediaUrl) {
        const summary = await this.fetchWikipediaSummary(references.wikipediaUrl);
        if (summary?.description) {
          return {
            description: summary.description,
            wikipediaUrl: references.wikipediaUrl,
            wikidataId: references.wikidataId,
            disambiguation,
          };
        }
      }

      if (references.wikidataId) {
        const wikidata = await this.fetchWikidataDescription(references.wikidataId);
        if (wikidata?.description) {
          return {
            description: wikidata.description,
            wikipediaUrl: wikidata.wikipediaUrl || references.wikipediaUrl,
            wikidataId: references.wikidataId,
            disambiguation,
          };
        }
      }

      return {
        description: null,
        wikipediaUrl: references.wikipediaUrl,
        wikidataId: references.wikidataId,
        disambiguation,
      };
    } catch {
      return null;
    }
  }
}

export const catalogDescriptionService = new CatalogDescriptionService();
