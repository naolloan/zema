import { Request, Response, NextFunction } from 'express';
import { spotifyService } from '../services/spotifyService';
import { musicBrainzService } from '../services/musicBrainzService';
import { createError } from '../middleware/errorHandler';
import { prisma } from '../prisma';
import { listPreviewInclude, releaseSummaryInclude, trackInclude, serializeListSummary, serializeReleaseSummary, serializeTrack } from '../utils/serializers';

function normalizeSearchText(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

function scoreQueryMatch(query: string, candidate: string | null | undefined) {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedCandidate = normalizeSearchText(candidate);

  if (!normalizedQuery || !normalizedCandidate) {
    return 0;
  }

  if (normalizedCandidate === normalizedQuery) {
    return 400;
  }

  if (normalizedCandidate.startsWith(`${normalizedQuery} `)) {
    return 320;
  }

  if (normalizedCandidate.startsWith(normalizedQuery)) {
    return 280;
  }

  if (normalizedCandidate.includes(` ${normalizedQuery} `)) {
    return 220;
  }

  if (normalizedCandidate.includes(` ${normalizedQuery}`) || normalizedCandidate.includes(`${normalizedQuery} `)) {
    return 180;
  }

  if (normalizedCandidate.includes(normalizedQuery)) {
    return 120;
  }

  return 0;
}

function sortByQueryRelevance<T>(items: T[], query: string, extractors: Array<(item: T) => string | null | undefined>) {
  return [...items].sort((left, right) => {
    const leftScore = Math.max(...extractors.map((extract) => scoreQueryMatch(query, extract(left))), 0);
    const rightScore = Math.max(...extractors.map((extract) => scoreQueryMatch(query, extract(right))), 0);

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    const leftPrimary = normalizeSearchText(extractors[0]?.(left));
    const rightPrimary = normalizeSearchText(extractors[0]?.(right));
    return leftPrimary.localeCompare(rightPrimary);
  });
}

class SearchController {
  globalSearch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q: query, type = 'all', limit = '10', offset = '0' } = req.query;
      const currentUserId = (req as any).user?.id as string | undefined;
      if (!query || typeof query !== 'string') {
        return next(createError('Search query is required', 400));
      }

      const searchLimit = Math.min(parseInt(limit as string, 10), 25);
      const searchOffset = parseInt(offset as string, 10);
      const searchType = type.toString().toLowerCase();
      const validTypes = ['all', 'artist', 'release', 'track', 'list'];

      if (!validTypes.includes(searchType)) {
        return next(createError('Invalid search type. Must be one of: all, artist, release, track, list', 400));
      }

      const includeArtists = searchType === 'all' || searchType === 'artist';
      const includeReleases = searchType === 'all' || searchType === 'release';
      const includeTracks = searchType === 'all' || searchType === 'track';
      const includeLists = searchType === 'all' || searchType === 'list';

      const [artistPayload, releasePayload, trackPayload, listPayload] = await Promise.all([
        includeArtists ? this.searchArtists(query, searchLimit, searchOffset) : Promise.resolve({ data: [], total: 0 }),
        includeReleases ? this.searchReleases(query, searchLimit, searchOffset, currentUserId) : Promise.resolve({ data: [], total: 0 }),
        includeTracks ? this.searchTracks(query, searchLimit, searchOffset) : Promise.resolve({ data: [], total: 0 }),
        includeLists ? this.searchLists(query, searchLimit, searchOffset, currentUserId) : Promise.resolve({ data: [], total: 0 }),
      ]);

      res.json({
        success: true,
        data: {
          artists: artistPayload.data,
          releases: releasePayload.data.map((release: any) => ({
            ...serializeReleaseSummary(release),
            isLiked: Boolean(release.isLiked),
          })),
          tracks: trackPayload.data.map((track: any) => serializeTrack(track)),
          lists: listPayload.data.map((list: any) => serializeListSummary(list, Boolean(list.isLiked))),
          total: {
            artists: artistPayload.total,
            releases: releasePayload.total,
            tracks: trackPayload.total,
            lists: listPayload.total,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };
  private async searchArtists(query: string, limit: number, offset: number) {
    const fetchLimit = Math.min(Math.max(limit * 3, limit), 50);
    const localArtists = await prisma.artist.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive',
        },
        OR: [{ spotifyId: { not: null } }, { musicBrainzId: { not: null } }],
      },
      take: fetchLimit,
      skip: offset,
      orderBy: { name: 'asc' },
    });

    const total = await prisma.artist.count({
      where: {
        name: {
          contains: query,
          mode: 'insensitive',
        },
      },
    });

    const localArtistResults = sortByQueryRelevance(
      localArtists.map((artist) => ({
        ...artist,
        spotifyUrl: spotifyService.artistUrl(artist.spotifyId),
      })),
      query,
      [(artist: any) => artist.name, (artist: any) => artist.disambiguation],
    );

    if (localArtists.length >= limit || offset > 0) {
      return {
        data: localArtistResults.slice(0, limit),
        total,
      };
    }

    const remoteArtists: any[] = [];
    if (spotifyService.isConfigured()) {
      const spotifyArtists = await spotifyService.searchArtists(query, limit - localArtists.length);
      remoteArtists.push(
        ...spotifyArtists.map((spotifyArtist) => ({
          id: spotifyArtist.id,
          spotifyId: spotifyArtist.id,
          musicBrainzId: null,
          spotifyUrl: spotifyService.artistUrl(spotifyArtist.id),
          name: spotifyArtist.name,
          type: 'INDIVIDUAL',
          disambiguation: null,
          bio: null,
          createdAt: null,
          updatedAt: null,
        }))
      );
    }

    if (remoteArtists.length < limit - localArtists.length) {
      const mbArtists = await musicBrainzService.searchArtists(query, limit - localArtists.length - remoteArtists.length);
      remoteArtists.push(
        ...mbArtists.map((mbArtist) => ({
          id: mbArtist.id,
          spotifyId: null,
          musicBrainzId: mbArtist.id,
          spotifyUrl: null,
          name: mbArtist.name,
          type: musicBrainzService.mapArtistType(mbArtist.type),
          disambiguation: mbArtist.disambiguation || null,
          bio: null,
          createdAt: null,
          updatedAt: null,
        }))
      );
    }

    return {
      data: sortByQueryRelevance([
        ...localArtistResults,
        ...remoteArtists.filter(
          (artist) =>
            !localArtists.some(
              (localArtist) =>
                localArtist.id === artist.id ||
                (artist.spotifyId && localArtist.spotifyId === artist.spotifyId) ||
                (artist.musicBrainzId && localArtist.musicBrainzId === artist.musicBrainzId)
            )
        ),
      ], query, [(artist: any) => artist.name, (artist: any) => artist.disambiguation]).slice(0, limit),
      total,
    };
  }

  private async searchReleases(query: string, limit: number, offset: number, currentUserId?: string) {
    const fetchLimit = Math.min(Math.max(limit * 3, limit), 50);
    const localReleases = await prisma.release.findMany({
      where: {
        title: {
          contains: query,
          mode: 'insensitive',
        },
      },
      include: releaseSummaryInclude,
      take: fetchLimit,
      skip: offset,
      orderBy: { title: 'asc' },
    });

    const total = await prisma.release.count({
      where: {
        title: {
          contains: query,
          mode: 'insensitive',
        },
      },
    });

    const sortedLocalReleases = sortByQueryRelevance(localReleases, query, [
      (release: any) => release.title,
      (release: any) => release.artist?.name,
    ]);

    if (localReleases.length >= limit || offset > 0 || !spotifyService.isConfigured()) {
      return { data: await this.attachReleaseLikeState(sortedLocalReleases.slice(0, limit), currentUserId), total };
    }

    const spotifyAlbums = await spotifyService.searchAlbums(query, limit - localReleases.length);
    const hydratedReleases: any[] = [];

    for (const spotifyAlbum of spotifyAlbums) {
      const release = await this.findOrCreateReleaseFromSpotify(spotifyAlbum);
      if (release) {
        hydratedReleases.push(release);
      }
    }

    return {
      data: await this.attachReleaseLikeState(
        sortByQueryRelevance(
          [...sortedLocalReleases, ...hydratedReleases.filter((release) => release && !localReleases.some((localRelease) => localRelease.id === release.id))],
          query,
          [(release: any) => release.title, (release: any) => release.artist?.name],
        ).slice(0, limit),
        currentUserId,
      ),
      total,
    };
  }

  private async attachReleaseLikeState(releases: any[], currentUserId?: string) {
    if (!currentUserId || !releases.length) {
      return releases.map((release) => ({ ...release, isLiked: false }));
    }

    const likes = await prisma.releaseLike.findMany({
      where: {
        userId: currentUserId,
        releaseId: { in: releases.map((release) => release.id) },
      },
      select: { releaseId: true },
    });

    const likedReleaseIds = new Set(likes.map((like) => like.releaseId));
    return releases.map((release) => ({
      ...release,
      isLiked: likedReleaseIds.has(release.id),
    }));
  }

  private async searchLists(query: string, limit: number, offset: number, currentUserId?: string) {
    const fetchLimit = Math.min(Math.max(limit * 3, limit), 50);
    const whereClause: any = {
      AND: [
        currentUserId
          ? {
              OR: [
                { isPublic: true },
                { userId: currentUserId },
              ],
            }
          : { isPublic: true },
        {
          OR: [
            {
              title: {
                contains: query,
                mode: 'insensitive',
              },
            },
            {
              description: {
                contains: query,
                mode: 'insensitive',
              },
            },
            {
              user: {
                username: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
            },
            {
              user: {
                displayName: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
            },
          ],
        },
      ],
    };

    const lists = await prisma.list.findMany({
      where: whereClause,
      include: listPreviewInclude,
      take: fetchLimit,
      skip: offset,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });

    const total = await prisma.list.count({ where: whereClause });

    const sortListsByRelevance = (records: typeof lists) =>
      sortByQueryRelevance(records, query, [
        (list: any) => list.title,
        (list: any) => list.description,
        (list: any) => list.user?.displayName,
        (list: any) => list.user?.username,
      ]).slice(0, limit);

    if (!currentUserId || !lists.length) {
      return {
        data: sortListsByRelevance(lists).map((list) => ({ ...list, isLiked: false })),
        total,
      };
    }

    const likes = await prisma.listLike.findMany({
      where: {
        userId: currentUserId,
        listId: { in: lists.map((list) => list.id) },
      },
      select: { listId: true },
    });

    const likedListIds = new Set(likes.map((like) => like.listId));
    return {
      data: sortListsByRelevance(lists).map((list) => ({
        ...list,
        isLiked: likedListIds.has(list.id),
      })),
      total,
    };
  }

  private async searchTracks(query: string, limit: number, offset: number) {
    const fetchLimit = Math.min(Math.max(limit * 3, limit), 50);
    const localTracks = await prisma.track.findMany({
      where: {
        title: {
          contains: query,
          mode: 'insensitive',
        },
      },
      include: trackInclude,
      take: fetchLimit,
      skip: offset,
      orderBy: { title: 'asc' },
    });

    const total = await prisma.track.count({
      where: {
        title: {
          contains: query,
          mode: 'insensitive',
        },
      },
    });

    const sortedLocalTracks = sortByQueryRelevance(localTracks, query, [
      (track: any) => track.title,
      (track: any) => track.release?.title,
    ]);

    if (localTracks.length >= limit || offset > 0 || !spotifyService.isConfigured()) {
      return { data: sortedLocalTracks.slice(0, limit), total };
    }

    const spotifyTracks = await spotifyService.searchTracks(query, limit - localTracks.length);
    const hydratedTracks: any[] = [];

    for (const spotifyTrack of spotifyTracks) {
      const track = await this.findOrCreateTrackFromSpotify(spotifyTrack);
      if (track) {
        hydratedTracks.push(track);
      }
    }

    return {
      data: sortByQueryRelevance(
        [...sortedLocalTracks, ...hydratedTracks.filter((track) => track && !localTracks.some((localTrack) => localTrack.id === track.id))],
        query,
        [(track: any) => track.title, (track: any) => track.release?.title],
      ).slice(0, limit),
      total,
    };
  }

  private async findOrCreateSpotifyArtist(spotifyArtist: { id: string; name: string }) {
    let artist = await prisma.artist.findFirst({ where: { spotifyId: spotifyArtist.id } });
    if (!artist) {
      artist = await prisma.artist.create({
        data: {
          spotifyId: spotifyArtist.id,
          name: spotifyArtist.name,
          type: 'INDIVIDUAL',
        },
      });
    }
    return artist;
  }

  private mapSpotifyReleaseType(albumType: string | null | undefined, title: string) {
    const normalizedTitle = (title || '').toLowerCase();
    if (normalizedTitle.includes('mixtape')) {
      return 'MIXTAPE' as const;
    }

    if ((albumType || '').toLowerCase() === 'single') {
      return 'SINGLE' as const;
    }

    return 'ALBUM' as const;
  }

  private parseDate(value: string | null | undefined) {
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

  private async findOrCreateReleaseFromSpotify(album: any) {
    const existingRelease = await prisma.release.findFirst({
      where: { spotifyId: album.id },
      include: releaseSummaryInclude,
    });
    if (existingRelease) {
      return existingRelease;
    }

    const credits = album.artists || [];
    if (credits.length === 0) {
      return null;
    }

    const artists = await Promise.all(credits.map((credit: any) => this.findOrCreateSpotifyArtist(credit)));

    return prisma.release.create({
      data: {
        spotifyId: album.id,
        title: album.name,
        type: this.mapSpotifyReleaseType(album.album_type, album.name),
        releaseDate: this.parseDate(album.release_date),
        artworkUrl: album.images?.[0]?.url || null,
        artistId: artists[0].id,
        artistCredits: {
          create: artists.map((artist: any, index: number) => ({
            artistId: artist.id,
            role: index === 0 ? 'MAIN_ARTIST' : 'FEATURED_ARTIST',
            joinPhrase: null,
            position: index + 1,
          })),
        },
      },
      include: releaseSummaryInclude,
    });
  }

  private async findOrCreateTrackFromSpotify(spotifyTrack: any) {
    const existingTrack = await prisma.track.findFirst({
      where: { spotifyId: spotifyTrack.id },
      include: trackInclude,
    });
    if (existingTrack) {
      return existingTrack;
    }

    const credits = spotifyTrack.artists || [];
    const createdArtists = await Promise.all(credits.map((credit: any) => this.findOrCreateSpotifyArtist(credit)));

    let releaseId: string | null = null;
    if (spotifyTrack.album?.id) {
      const albumRelease = await this.findOrCreateReleaseFromSpotify({
        id: spotifyTrack.album.id,
        name: spotifyTrack.album.name,
        album_type: spotifyTrack.album.album_type || 'album',
        release_date: spotifyTrack.album.release_date,
        images: spotifyTrack.album.images || [],
        artists: credits,
      });
      releaseId = albumRelease?.id || null;
    }

    return prisma.track.create({
      data: {
        spotifyId: spotifyTrack.id,
        title: spotifyTrack.name,
        duration: spotifyTrack.duration_ms ? Math.round(spotifyTrack.duration_ms / 1000) : null,
        trackNumber: spotifyTrack.track_number ? parseInt(String(spotifyTrack.track_number), 10) || null : null,
        releaseId,
        artistCredits: {
          create: createdArtists.map((artist: any, index: number) => ({
            artistId: artist.id,
            role: index === 0 ? 'MAIN_ARTIST' : 'FEATURED_ARTIST',
            joinPhrase: null,
            position: index + 1,
          })),
        },
      },
      include: trackInclude,
    });
  }
}

export const searchController = new SearchController();
