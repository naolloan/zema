import { Request, Response, NextFunction } from 'express';
import { spotifyService } from '../services/spotifyService';
import { musicBrainzService } from '../services/musicBrainzService';
import { catalogDescriptionService } from '../services/catalogDescriptionService';
import { createError } from '../middleware/errorHandler';
import { prisma } from '../prisma';
import { releaseDetailInclude, serializeReleaseDetail } from '../utils/serializers';

class ArtistController {
  searchArtists = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q: query, limit = '10' } = req.query;

      if (!query || typeof query !== 'string') {
        return next(createError('Search query is required', 400));
      }

      const searchLimit = Math.min(parseInt(limit as string, 10), 50);
      const localArtists = await prisma.artist.findMany({
        where: {
          name: {
            contains: query,
            mode: 'insensitive',
          },
          OR: [{ spotifyId: { not: null } }, { musicBrainzId: { not: null } }],
        },
        take: searchLimit,
        orderBy: {
          name: 'asc',
        },
      });

      if (localArtists.length >= searchLimit) {
        return res.json({
          success: true,
          data: localArtists.map((artist) => ({
            ...artist,
            spotifyUrl: spotifyService.artistUrl(artist.spotifyId),
          })),
        });
      }

      const remaining = searchLimit - localArtists.length;
      const remoteArtists: any[] = [];

      if (spotifyService.isConfigured()) {
        const spotifyResults = await spotifyService.searchArtists(query, remaining);
        remoteArtists.push(
          ...spotifyResults
            .map((artist) => this.serializeRemoteSpotifyArtist(artist))
            .filter(
              (artist) =>
                !localArtists.some(
                  (localArtist) =>
                    localArtist.id === artist.id ||
                    localArtist.spotifyId === artist.spotifyId
                )
            )
        );
      }

      if (remoteArtists.length < remaining) {
        const mbResults = await musicBrainzService.searchArtists(query, remaining - remoteArtists.length);
        remoteArtists.push(
          ...mbResults
            .map((artist) => this.serializeRemoteMusicBrainzArtist(artist))
            .filter(
              (artist) =>
                !localArtists.some(
                  (localArtist) =>
                    localArtist.id === artist.id ||
                    localArtist.musicBrainzId === artist.musicBrainzId
                ) &&
                !remoteArtists.some(
                  (remoteArtist) =>
                    remoteArtist.id === artist.id ||
                    (remoteArtist.musicBrainzId && remoteArtist.musicBrainzId === artist.musicBrainzId)
                )
            )
        );
      }

      res.json({
        success: true,
        data: [
          ...localArtists.map((artist) => ({
            ...artist,
            spotifyUrl: spotifyService.artistUrl(artist.spotifyId),
          })),
          ...remoteArtists,
        ].slice(0, searchLimit),
      });
    } catch (error) {
      next(error);
    }
  };

  getArtistById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      let artist = await prisma.artist.findUnique({ where: { id } });
      if (!artist) {
        artist = await prisma.artist.findFirst({ where: { spotifyId: id } });
      }
      if (!artist) {
        artist = await prisma.artist.findFirst({ where: { musicBrainzId: id } });
      }

      if (!artist) {
        const spotifyArtist = spotifyService.isConfigured() ? await spotifyService.getArtistById(id) : null;
        if (spotifyArtist) {
          artist = await prisma.artist.create({
            data: {
              spotifyId: spotifyArtist.id,
              name: spotifyArtist.name,
              type: 'INDIVIDUAL',
              spotifyPopularity: spotifyArtist.popularity ?? null,
              spotifyFollowers: spotifyArtist.followers?.total ?? null,
              spotifyGenres: spotifyArtist.genres ?? [],
            },
          });
        }
      }

      if (!artist) {
        const mbArtist = await musicBrainzService.getArtistById(id);
        if (mbArtist) {
          artist = await prisma.artist.create({
            data: {
              musicBrainzId: mbArtist.id,
              name: mbArtist.name,
              type: musicBrainzService.mapArtistType(mbArtist.type),
              disambiguation: mbArtist.disambiguation || null,
            },
          });
        }
      }

      if (!artist) {
        return next(createError('Artist not found', 404));
      }

      artist = await this.ensureMusicBrainzIdentity(artist);
      artist = await this.ensureSpotifyIdentity(artist);

      if (artist.musicBrainzId) {
        await this.syncMusicBrainzArtistCatalog(artist.id, artist.musicBrainzId);
      }

      if (artist.spotifyId) {
        await this.syncSpotifyArtistCatalog(artist.id, artist.spotifyId);
      }

      artist = await this.hydrateSpotifyArtistMetadata(artist);
      artist = await this.hydrateArtistDescription(artist);

      const whereClause = this.artistReleaseWhere(artist.id, true);
      const releases = await prisma.release.findMany({
        where: whereClause,
        include: releaseDetailInclude,
        orderBy: [{ releaseDate: 'desc' }, { createdAt: 'desc' }],
        take: 120,
      });

      const releasesWithRatings = await this.attachReleaseRatings(releases);

      res.json({
        success: true,
        data: {
          ...artist,
          spotifyUrl: spotifyService.artistUrl(artist.spotifyId),
          releases: releasesWithRatings.map(serializeReleaseDetail),
          releaseCount: await prisma.release.count({ where: whereClause }),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getArtistReleases = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { limit = '20', offset = '0' } = req.query;
      const parsedLimit = Math.min(parseInt(limit as string, 10), 50);
      const parsedOffset = parseInt(offset as string, 10);

      let artist = await prisma.artist.findUnique({ where: { id } });
      if (!artist) {
        artist = await prisma.artist.findFirst({ where: { spotifyId: id } });
      }
      if (!artist) {
        artist = await prisma.artist.findFirst({ where: { musicBrainzId: id } });
      }
      if (!artist) {
        return next(createError('Artist not found', 404));
      }

      artist = await this.ensureMusicBrainzIdentity(artist);
      artist = await this.ensureSpotifyIdentity(artist);

      if (artist.musicBrainzId) {
        await this.syncMusicBrainzArtistCatalog(artist.id, artist.musicBrainzId);
      }

      if (artist.spotifyId) {
        await this.syncSpotifyArtistCatalog(artist.id, artist.spotifyId);
      }

      const whereClause = this.artistReleaseWhere(artist.id, true);
      const releases = await prisma.release.findMany({
        where: whereClause,
        include: releaseDetailInclude,
        orderBy: [{ releaseDate: 'desc' }, { createdAt: 'desc' }],
        take: parsedLimit,
        skip: parsedOffset,
      });

      const total = await prisma.release.count({ where: whereClause });
      const releasesWithRatings = await this.attachReleaseRatings(releases);

      res.json({
        success: true,
        data: releasesWithRatings.map(serializeReleaseDetail),
        pagination: {
          page: Math.floor(parsedOffset / parsedLimit) + 1,
          limit: parsedLimit,
          total,
          totalPages: Math.ceil(total / parsedLimit),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  private async ensureSpotifyIdentity(artist: any) {
    if (artist.spotifyId || !spotifyService.isConfigured()) {
      return artist;
    }

    const spotifyMatches = await spotifyService.searchArtists(artist.name, 5);
    if (spotifyMatches.length === 0) {
      return artist;
    }

    const exact = spotifyMatches.find(
      (candidate) => candidate.name.toLowerCase() === String(artist.name).toLowerCase()
    );
    const best = exact || spotifyMatches[0];

    return prisma.artist.update({
      where: { id: artist.id },
      data: { spotifyId: best.id },
    });
  }

  private async ensureMusicBrainzIdentity(artist: any) {
    if (artist.musicBrainzId) {
      return artist;
    }

    const matches = await musicBrainzService.searchArtists(artist.name, 5);
    if (matches.length === 0) {
      return artist;
    }

    const exact = matches.find(
      (candidate) => candidate.name.toLowerCase() === String(artist.name).toLowerCase()
    );
    const best = exact || matches[0];

    return prisma.artist.update({
      where: { id: artist.id },
      data: { musicBrainzId: best.id },
    });
  }

  private artistReleaseWhere(artistId: string, requireExternalId = false) {
    const relationFilter: any = {
      OR: [
        { artistId },
        {
          artistCredits: {
            some: {
              artistId,
            },
          },
        },
      ],
    };

    if (!requireExternalId) {
      return relationFilter;
    }

    return {
      ...relationFilter,
      AND: [
        {
          OR: [{ spotifyId: { not: null } }, { musicBrainzId: { not: null } }],
        },
      ],
    };
  }

  private async findOrCreateMusicBrainzArtist(mbArtist: any) {
    if (!mbArtist?.id) {
      return null;
    }

    let artist = await prisma.artist.findFirst({ where: { musicBrainzId: mbArtist.id } });
    if (!artist) {
      artist = await prisma.artist.create({
        data: {
          musicBrainzId: mbArtist.id,
          name: mbArtist.name || 'Unknown Artist',
          type: musicBrainzService.mapArtistType(mbArtist.type),
          disambiguation: mbArtist.disambiguation || null,
        },
      });
    }

    return artist;
  }

  private async syncMusicBrainzArtistCatalog(localArtistId: string, musicBrainzArtistId: string) {
    const releases = await musicBrainzService.getArtistReleases(musicBrainzArtistId, 100);

    for (const mbRelease of releases) {
      if (!mbRelease?.id) continue;

      const credits = mbRelease['artist-credit'] || [];
      const creditedArtists: Array<{ id: string }> = [];

      for (const credit of credits) {
        const linked = await this.findOrCreateMusicBrainzArtist(credit.artist);
        if (linked) {
          creditedArtists.push({ id: linked.id });
        }
      }

      const primaryArtistId = creditedArtists[0]?.id || localArtistId;
      const release = await prisma.release.upsert({
        where: { musicBrainzId: mbRelease.id },
        update: {
          title: mbRelease.title,
          type: musicBrainzService.mapReleaseType(
            mbRelease['release-group']?.['primary-type'],
            mbRelease['release-group']?.['secondary-types'] || []
          ),
          releaseDate: musicBrainzService.parseReleaseDate(mbRelease.date),
          disambiguation: mbRelease.disambiguation || null,
          artworkUrl: musicBrainzService.getCoverArtUrl(mbRelease.id),
          artistId: primaryArtistId,
        },
        create: {
          musicBrainzId: mbRelease.id,
          title: mbRelease.title,
          type: musicBrainzService.mapReleaseType(
            mbRelease['release-group']?.['primary-type'],
            mbRelease['release-group']?.['secondary-types'] || []
          ),
          releaseDate: musicBrainzService.parseReleaseDate(mbRelease.date),
          disambiguation: mbRelease.disambiguation || null,
          artworkUrl: musicBrainzService.getCoverArtUrl(mbRelease.id),
          artistId: primaryArtistId,
        },
      });

      if (creditedArtists.length > 0) {
        await prisma.artistCredit.deleteMany({ where: { releaseId: release.id } });
        await prisma.artistCredit.createMany({
          data: creditedArtists.map((artist, index) => ({
            artistId: artist.id,
            releaseId: release.id,
            role: index === 0 ? 'MAIN_ARTIST' : 'FEATURED_ARTIST',
            joinPhrase: null,
            position: index + 1,
          })),
        });
      }
    }
  }

  private async syncSpotifyArtistCatalog(localArtistId: string, spotifyArtistId: string) {
    const albums = await spotifyService.getArtistAlbums(spotifyArtistId, 50);

    for (const album of albums) {
      const credits = album.artists || [];
      const creditedArtists = [] as Array<{ id: string }>;

      for (const credit of credits) {
        const existing = await prisma.artist.findFirst({ where: { spotifyId: credit.id } });
        if (existing) {
          creditedArtists.push({ id: existing.id });
          continue;
        }

        const created = await prisma.artist.create({
          data: {
            spotifyId: credit.id,
            name: credit.name,
            type: 'INDIVIDUAL',
          },
        });
        creditedArtists.push({ id: created.id });
      }

      const primaryArtistId = creditedArtists[0]?.id || localArtistId;
      const release = await prisma.release.upsert({
        where: { spotifyId: album.id },
        update: {
          title: album.name,
          type: this.mapSpotifyReleaseType(album.album_type, album.name),
          releaseDate: this.parseSpotifyDate(album.release_date),
          artworkUrl: album.images?.[0]?.url || null,
          artistId: primaryArtistId,
        },
        create: {
          spotifyId: album.id,
          title: album.name,
          type: this.mapSpotifyReleaseType(album.album_type, album.name),
          releaseDate: this.parseSpotifyDate(album.release_date),
          artworkUrl: album.images?.[0]?.url || null,
          artistId: primaryArtistId,
        },
      });

      if (creditedArtists.length > 0) {
        await prisma.artistCredit.deleteMany({ where: { releaseId: release.id } });
        await prisma.artistCredit.createMany({
          data: creditedArtists.map((artist, index) => ({
            artistId: artist.id,
            releaseId: release.id,
            role: index === 0 ? 'MAIN_ARTIST' : 'FEATURED_ARTIST',
            joinPhrase: null,
            position: index + 1,
          })),
        });
      }
    }
  }

  private async hydrateSpotifyArtistMetadata(artist: any) {
    if (!artist.spotifyId || !spotifyService.isConfigured()) {
      return artist;
    }

    const spotifyArtist = await spotifyService.getArtistById(artist.spotifyId);
    if (!spotifyArtist) {
      return artist;
    }

    return prisma.artist.update({
      where: { id: artist.id },
      data: {
        spotifyPopularity: spotifyArtist.popularity ?? null,
        spotifyFollowers: spotifyArtist.followers?.total ?? null,
        spotifyGenres: spotifyArtist.genres ?? [],
      },
    });
  }

  private async hydrateArtistDescription(artist: any) {
    if (!artist.musicBrainzId) {
      return artist;
    }

    const description = await catalogDescriptionService.resolveArtistDescription(artist.musicBrainzId);
    if (!description) {
      return artist;
    }

    const nextData: any = {};
    if (!artist.bio && description.description) {
      nextData.bio = description.description;
    }
    if (!artist.disambiguation && description.disambiguation) {
      nextData.disambiguation = description.disambiguation;
    }
    if (!artist.wikidataId && description.wikidataId) {
      nextData.wikidataId = description.wikidataId;
    }
    if (!artist.wikipediaUrl && description.wikipediaUrl) {
      nextData.wikipediaUrl = description.wikipediaUrl;
    }

    if (Object.keys(nextData).length === 0) {
      return artist;
    }

    return prisma.artist.update({
      where: { id: artist.id },
      data: nextData,
    });
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

  private parseSpotifyDate(value: string | null | undefined) {
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

  private async attachReleaseRatings(releases: any[]) {
    if (releases.length === 0) {
      return releases;
    }

    const groupedRatings = await prisma.rating.groupBy({
      by: ['releaseId'],
      where: {
        releaseId: {
          in: releases.map((release) => release.id),
        },
      },
      _avg: {
        value: true,
      },
      _count: {
        value: true,
      },
    });

    const ratingMap = new Map(
      groupedRatings.map((group) => [
        group.releaseId,
        {
          averageRating: group._avg.value || 0,
          ratingCount: group._count.value || 0,
        },
      ])
    );

    return releases.map((release) => ({
      ...release,
      averageRating: ratingMap.get(release.id)?.averageRating || 0,
      ratingCount: ratingMap.get(release.id)?.ratingCount || 0,
    }));
  }

  private serializeRemoteSpotifyArtist(artist: { id: string; name: string }) {
    return {
      id: artist.id,
      spotifyId: artist.id,
      spotifyUrl: spotifyService.artistUrl(artist.id),
      musicBrainzId: null,
      name: artist.name,
      type: 'INDIVIDUAL',
      disambiguation: null,
      bio: null,
      spotifyPopularity: null,
      spotifyFollowers: null,
      spotifyGenres: [],
      wikidataId: null,
      wikipediaUrl: null,
      createdAt: null,
      updatedAt: null,
    };
  }

  private serializeRemoteMusicBrainzArtist(artist: { id: string; name: string; type?: string; disambiguation?: string }) {
    return {
      id: artist.id,
      spotifyId: null,
      spotifyUrl: null,
      musicBrainzId: artist.id,
      name: artist.name,
      type: musicBrainzService.mapArtistType(artist.type),
      disambiguation: artist.disambiguation || null,
      bio: null,
      spotifyPopularity: null,
      spotifyFollowers: null,
      spotifyGenres: [],
      wikidataId: null,
      wikipediaUrl: null,
      createdAt: null,
      updatedAt: null,
    };
  }
}

export const artistController = new ArtistController();
