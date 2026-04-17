import { Request, Response, NextFunction } from 'express';
import { ReleaseType } from '@prisma/client';
import { spotifyService } from '../services/spotifyService';
import { musicBrainzService } from '../services/musicBrainzService';
import { catalogDescriptionService } from '../services/catalogDescriptionService';
import { createError } from '../middleware/errorHandler';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';
import {
  releaseSummaryInclude,
  releaseDetailInclude,
  trackInclude,
  reviewInclude,
  serializeReleaseSummary,
  serializeReleaseDetail,
  serializeTrack,
  serializeReview,
  serializeUserSummary,
} from '../utils/serializers';

const ALLOWED_RATING_VALUES = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

function parseRatingValue(value: unknown) {
  const parsedValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseFloat(value)
        : Number.NaN;

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  const normalizedValue = Math.round(parsedValue * 2) / 2;
  if (!ALLOWED_RATING_VALUES.includes(normalizedValue)) {
    return null;
  }

  return normalizedValue;
}

class ReleaseController {
  constructor() {
    this.getReleaseById = this.getReleaseById.bind(this);
    this.getReleaseTracks = this.getReleaseTracks.bind(this);
    this.getReleaseRatings = this.getReleaseRatings.bind(this);
    this.getReleaseLogs = this.getReleaseLogs.bind(this);
    this.getReleaseLists = this.getReleaseLists.bind(this);
    this.getReleaseLikes = this.getReleaseLikes.bind(this);
    this.getReleaseReviews = this.getReleaseReviews.bind(this);
    this.rateRelease = this.rateRelease.bind(this);
    this.updateRating = this.updateRating.bind(this);
    this.deleteRating = this.deleteRating.bind(this);
    this.addToFavorites = this.addToFavorites.bind(this);
    this.removeFromFavorites = this.removeFromFavorites.bind(this);
    this.addToWantToHear = this.addToWantToHear.bind(this);
    this.removeFromWantToHear = this.removeFromWantToHear.bind(this);
  }

  searchReleases = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q: query, limit = '10' } = req.query;
      if (!query || typeof query !== 'string') {
        return next(createError('Search query is required', 400));
      }

      const searchLimit = Math.min(parseInt(limit as string, 10), 50);
      const localReleases = await prisma.release.findMany({
        where: {
          title: {
            contains: query,
            mode: 'insensitive',
          },
        },
        include: releaseSummaryInclude,
        take: searchLimit,
        orderBy: { title: 'asc' },
      });

      if (localReleases.length >= searchLimit || !spotifyService.isConfigured()) {
        return res.json({ success: true, data: localReleases.map(serializeReleaseSummary) });
      }

      const remaining = searchLimit - localReleases.length;
      const spotifyResults = await spotifyService.searchAlbums(query, remaining);
      const newReleases = [];

      for (const spotifyAlbum of spotifyResults) {
        const release = await this.findOrCreateReleaseFromSpotify(spotifyAlbum);
        if (release && !localReleases.some((localRelease) => localRelease.id === release.id)) {
          newReleases.push(release);
        }
      }

      const combinedReleases = [...localReleases, ...newReleases].slice(0, searchLimit);
      const ratingGroups = combinedReleases.length
        ? await prisma.rating.groupBy({
            by: ['releaseId'],
            where: {
              releaseId: { in: combinedReleases.map((release) => release.id) },
            },
            _avg: { value: true },
            _count: { value: true },
          })
        : [];
      const ratingMap = new Map(
        ratingGroups.map((group) => [
          group.releaseId,
          {
            averageRating: group._avg.value || 0,
            ratingCount: group._count.value || 0,
          },
        ]),
      );

      const userId = (req as AuthRequest).user?.id;
      const likedReleaseIds = userId && combinedReleases.length
        ? new Set(
            (
              await prisma.releaseLike.findMany({
                where: {
                  userId,
                  releaseId: { in: combinedReleases.map((release) => release.id) },
                },
                select: { releaseId: true },
              })
            ).map((entry) => entry.releaseId),
          )
        : null;

      res.json({
        success: true,
        data: combinedReleases.map((release) => ({
          ...serializeReleaseSummary(release),
          averageRating: ratingMap.get(release.id)?.averageRating || 0,
          ratingCount: ratingMap.get(release.id)?.ratingCount || 0,
          isLiked: likedReleaseIds ? likedReleaseIds.has(release.id) : false,
        })),
      });
    } catch (error) {
      next(error);
    }
  };

  async getReleaseById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as AuthRequest).user?.id;

      let release = await prisma.release.findUnique({
        where: { id },
        include: releaseDetailInclude,
      });

      if (!release) {
        release = await prisma.release.findFirst({
          where: { spotifyId: id },
          include: releaseDetailInclude,
        });
      }

      if (!release) {
        const spotifyAlbum = spotifyService.isConfigured() ? await spotifyService.getAlbumById(id) : null;
        if (spotifyAlbum) {
          release = await this.findOrCreateReleaseFromSpotify(spotifyAlbum);
        }
      }

      if (!release) {
        return next(createError('Release not found', 404));
      }

      release = await this.ensureMusicBrainzIdentity(release);
      release = await this.hydrateSpotifyReleaseMetadata(release);
      release = await this.hydrateReleaseDescription(release);

      if (this.shouldSyncSpotifyTracks(release)) {
        await this.syncSpotifyReleaseTracks(release.id, release.spotifyId);
        release = await prisma.release.findUnique({ where: { id: release.id }, include: releaseDetailInclude });
      }

      const avgRating = await prisma.rating.aggregate({
        where: { releaseId: release.id },
        _avg: { value: true },
        _count: { value: true },
      });
      const [ratingBreakdownGroups, ranking] = await Promise.all([
        prisma.rating.groupBy({
          by: ['value'],
          where: { releaseId: release.id },
          _count: { value: true },
          orderBy: { value: 'asc' },
        }),
        this.getReleaseRanking(release.id, release.type),
      ]);

      let userRating = null;
      let isLiked = false;
      let isWantToHear = false;
      if (userId) {
        userRating = await prisma.rating.findUnique({
          where: {
            userId_releaseId: {
              userId,
              releaseId: release.id,
            },
          },
          select: {
            id: true,
            value: true,
          },
        });

        const releaseLike = await prisma.releaseLike.findUnique({
          where: {
            userId_releaseId: {
              userId,
              releaseId: release.id,
            },
          },
        });
        isLiked = Boolean(releaseLike);

        const wantToHear = await prisma.wantToHear.findUnique({
          where: {
            userId_releaseId: {
              userId,
              releaseId: release.id,
            },
          },
        });
        isWantToHear = Boolean(wantToHear);
      }

      const serialized = serializeReleaseDetail({
        ...release,
        ranking,
        ratingBreakdown: {
          average: avgRating._avg.value || 0,
          total: avgRating._count.value || 0,
          histogram: ALLOWED_RATING_VALUES.map((value) => ({
            value,
            count: ratingBreakdownGroups.find((group) => group.value === value)?._count.value || 0,
          })),
        },
        averageRating: avgRating._avg.value || 0,
        ratingCount: avgRating._count.value || 0,
      });

      res.json({
        success: true,
        data: {
          ...serialized,
          userRating,
          isLiked,
          isWantToHear,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  private async getReleaseRanking(releaseId: string, type: ReleaseType) {
    const ratedReleaseGroups = await prisma.rating.groupBy({
      by: ['releaseId'],
      where: {
        release: { type },
      },
      _avg: { value: true },
      _count: { value: true },
      having: {
        value: {
          _count: {
            gte: 3,
          },
        },
      },
    });

    ratedReleaseGroups.sort((a, b) => {
      const avgDiff = (b._avg.value || 0) - (a._avg.value || 0);
      if (avgDiff !== 0) {
        return avgDiff;
      }

      const countDiff = b._count.value - a._count.value;
      if (countDiff !== 0) {
        return countDiff;
      }

      return a.releaseId.localeCompare(b.releaseId);
    });

    const rankIndex = ratedReleaseGroups.findIndex((group) => group.releaseId === releaseId);
    if (rankIndex === -1 || rankIndex >= 250) {
      return null;
    }

    return {
      rank: rankIndex + 1,
      type,
    };
  }

  async getReleaseTracks(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      let release = await prisma.release.findUnique({
        where: { id },
        include: {
          tracks: {
            include: trackInclude,
            orderBy: [{ discNumber: 'asc' }, { trackNumber: 'asc' }, { title: 'asc' }],
          },
        },
      });

      if (!release) {
        release = await prisma.release.findFirst({
          where: { spotifyId: id },
          include: {
            tracks: {
              include: trackInclude,
              orderBy: [{ discNumber: 'asc' }, { trackNumber: 'asc' }, { title: 'asc' }],
            },
          },
        });
      }

      if (!release) {
        return next(createError('Release not found', 404));
      }

      if (this.shouldSyncSpotifyTracks(release)) {
        await this.syncSpotifyReleaseTracks(release.id, release.spotifyId);
        const hydrated = await prisma.release.findUnique({
          where: { id: release.id },
          include: {
            tracks: {
              include: trackInclude,
              orderBy: [{ discNumber: 'asc' }, { trackNumber: 'asc' }, { title: 'asc' }],
            },
          },
        });
        if (hydrated) {
          release = hydrated;
        }
      }

      res.json({ success: true, data: release.tracks.map(serializeTrack) });
    } catch (error) {
      next(error);
    }
  }

  private shouldSyncSpotifyTracks(release: { spotifyId?: string | null; tracks?: Array<{ discNumber: number | null; trackNumber: number | null }> | null }) {
    if (!release.spotifyId) {
      return false;
    }

    const tracks = release.tracks || [];
    if (tracks.length === 0) {
      return true;
    }

    const hasDiscData = tracks.some((track) => track.discNumber !== null && track.discNumber !== undefined);
    if (hasDiscData) {
      return false;
    }

    const seenTrackNumbers = new Set<number>();
    for (const track of tracks) {
      if (track.trackNumber === null || track.trackNumber === undefined) {
        continue;
      }

      if (seenTrackNumbers.has(track.trackNumber)) {
        return true;
      }

      seenTrackNumbers.add(track.trackNumber);
    }

    return false;
  }

  async getReleaseRatings(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { value, limit = '30', offset = '0' } = req.query;

      let release = await prisma.release.findUnique({ where: { id }, include: releaseSummaryInclude });
      if (!release) {
        release = await prisma.release.findFirst({ where: { spotifyId: id }, include: releaseSummaryInclude });
      }

      if (!release) {
        return next(createError('Release not found', 404));
      }

      const parsedValue = parseRatingValue(value);
      if (parsedValue === null) {
        return next(createError('Rating value must be between 0.5 and 5 in 0.5 increments', 400));
      }

      const parsedLimit = Math.min(parseInt(limit as string, 10), 100);
      const parsedOffset = parseInt(offset as string, 10);

      const [ratings, total] = await Promise.all([
        prisma.rating.findMany({
          where: {
            releaseId: release.id,
            value: parsedValue,
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                createdAt: true,
              },
            },
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: parsedLimit,
          skip: parsedOffset,
        }),
        prisma.rating.count({
          where: {
            releaseId: release.id,
            value: parsedValue,
          },
        }),
      ]);

      res.json({
        success: true,
        data: ratings.map((rating) => ({
          id: rating.id,
          value: rating.value,
          createdAt: rating.createdAt,
          updatedAt: rating.updatedAt,
          user: rating.user,
          release: serializeReleaseSummary(release),
        })),
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
  }

  async getReleaseLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { limit = '30', offset = '0' } = req.query;

      let release = await prisma.release.findUnique({ where: { id } });
      if (!release) {
        release = await prisma.release.findFirst({ where: { spotifyId: id } });
      }

      if (!release) {
        return next(createError('Release not found', 404));
      }

      const parsedLimit = Math.min(parseInt(limit as string, 10), 100);
      const parsedOffset = parseInt(offset as string, 10);

      const [entries, total] = await Promise.all([
        prisma.diaryEntry.findMany({
          where: { releaseId: release.id },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                createdAt: true,
              },
            },
            review: {
              include: reviewInclude,
            },
          },
          orderBy: [{ listenedAt: 'desc' }, { id: 'desc' }],
          take: parsedLimit,
          skip: parsedOffset,
        }),
        prisma.diaryEntry.count({ where: { releaseId: release.id } }),
      ]);

      res.json({
        success: true,
        data: entries.map((entry) => ({
          id: entry.id,
          listenedAt: entry.listenedAt,
          notes: entry.notes,
          createdAt: entry.createdAt,
          user: serializeUserSummary(entry.user),
          review: entry.review ? serializeReview(entry.review, false) : null,
        })),
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
  }

  async getReleaseLists(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const currentUserId = (req as AuthRequest).user?.id;
      const { limit = '30', offset = '0' } = req.query;

      let release = await prisma.release.findUnique({ where: { id } });
      if (!release) {
        release = await prisma.release.findFirst({ where: { spotifyId: id } });
      }

      if (!release) {
        return next(createError('Release not found', 404));
      }

      const parsedLimit = Math.min(parseInt(limit as string, 10), 100);
      const parsedOffset = parseInt(offset as string, 10);

      const whereClause = {
        items: {
          some: {
            releaseId: release.id,
          },
        },
        isPublic: true,
      };

      const [lists, total] = await Promise.all([
        prisma.list.findMany({
          where: whereClause,
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                createdAt: true,
              },
            },
            _count: {
              select: {
                items: true,
                likes: true,
              },
            },
          },
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
          take: parsedLimit,
          skip: parsedOffset,
        }),
        prisma.list.count({ where: whereClause }),
      ]);

      const likedListIds = currentUserId
        ? new Set(
            (
              await prisma.listLike.findMany({
                where: {
                  userId: currentUserId,
                  listId: { in: lists.map((list) => list.id) },
                },
                select: { listId: true },
              })
            ).map((like) => like.listId),
          )
        : new Set<string>();

      res.json({
        success: true,
        data: lists.map((list) => ({
          ...list,
          itemsCount: list._count.items,
          likesCount: list._count.likes,
          isLiked: likedListIds.has(list.id),
        })),
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
  }

  async getReleaseLikes(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { limit = '30', offset = '0' } = req.query;

      let release = await prisma.release.findUnique({ where: { id } });
      if (!release) {
        release = await prisma.release.findFirst({ where: { spotifyId: id } });
      }

      if (!release) {
        return next(createError('Release not found', 404));
      }

      const parsedLimit = Math.min(parseInt(limit as string, 10), 100);
      const parsedOffset = parseInt(offset as string, 10);

      const [likes, total] = await Promise.all([
        prisma.releaseLike.findMany({
          where: { releaseId: release.id },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                createdAt: true,
              },
            },
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: parsedLimit,
          skip: parsedOffset,
        }),
        prisma.releaseLike.count({ where: { releaseId: release.id } }),
      ]);

      res.json({
        success: true,
        data: likes.map((like) => ({
          id: like.id,
          createdAt: like.createdAt,
          user: serializeUserSummary(like.user),
        })),
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
  }

  async getReleaseReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { limit = '10', offset = '0', sort = 'recent', filter = 'all' } = req.query;
      const userId = (req as AuthRequest).user?.id;

      let release = await prisma.release.findUnique({ where: { id } });
      if (!release) {
        release = await prisma.release.findFirst({ where: { spotifyId: id } });
      }

      if (!release) {
        return next(createError('Release not found', 404));
      }

      const parsedLimit = Math.min(parseInt(limit as string, 10), 50);
      const parsedOffset = parseInt(offset as string, 10);
      const parsedSort = typeof sort === 'string' ? sort : 'recent';
      const parsedFilter = typeof filter === 'string' ? filter : 'all';
      const whereClause: any = { releaseId: release.id };

      if (parsedFilter === 'diary') {
        whereClause.diaryEntryId = { not: null };
      }

      if (parsedFilter === 'standalone') {
        whereClause.diaryEntryId = null;
      }

      const orderBy =
        parsedSort === 'oldest'
          ? { createdAt: 'asc' as const }
          : parsedSort === 'popular'
            ? [{ likes: { _count: 'desc' as const } }, { createdAt: 'desc' as const }]
            : { createdAt: 'desc' as const };

      const reviews = await prisma.review.findMany({
        where: whereClause,
        include: reviewInclude,
        orderBy,
        take: parsedLimit,
        skip: parsedOffset,
      });

      const likedReviewIds = new Set<string>();
      if (userId && reviews.length > 0) {
        const likes = await prisma.reviewLike.findMany({
          where: {
            userId,
            reviewId: { in: reviews.map((review) => review.id) },
          },
          select: { reviewId: true },
        });

        for (const like of likes) {
          likedReviewIds.add(like.reviewId);
        }
      }

      const total = await prisma.review.count({ where: whereClause });
      res.json({
        success: true,
        data: reviews.map((review) => serializeReview(review, likedReviewIds.has(review.id))),
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
  }

  async rateRelease(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { value } = req.body;
      const userId = (req as AuthRequest).user!.id;

      const parsedValue = parseRatingValue(value);
      if (parsedValue === null) {
        return next(createError('Rating value must be between 0.5 and 5 in 0.5 increments', 400));
      }

      let release = await prisma.release.findUnique({ where: { id } });
      if (!release) {
        release = await prisma.release.findFirst({ where: { spotifyId: id } });
      }
      if (!release) {
        return next(createError('Release not found', 404));
      }

      const rating = await prisma.rating.upsert({
        where: {
          userId_releaseId: {
            userId,
            releaseId: release.id,
          },
        },
        update: { value: parsedValue },
        create: {
          userId,
          releaseId: release.id,
          value: parsedValue,
        },
      });

      res.json({ success: true, data: rating });
    } catch (error) {
      next(error);
    }
  }

  async updateRating(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { value } = req.body;
      const userId = (req as AuthRequest).user!.id;

      const parsedValue = parseRatingValue(value);
      if (parsedValue === null) {
        return next(createError('Rating value must be between 0.5 and 5 in 0.5 increments', 400));
      }

      let release = await prisma.release.findUnique({ where: { id } });
      if (!release) {
        release = await prisma.release.findFirst({ where: { spotifyId: id } });
      }
      if (!release) {
        return next(createError('Release not found', 404));
      }

      const rating = await prisma.rating.findUnique({
        where: {
          userId_releaseId: {
            userId,
            releaseId: release.id,
          },
        },
      });

      if (!rating) {
        return next(createError('Rating not found', 404));
      }

      const updatedRating = await prisma.rating.update({
        where: { id: rating.id },
        data: { value: parsedValue },
      });

      res.json({ success: true, data: updatedRating });
    } catch (error) {
      next(error);
    }
  }

  async deleteRating(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as AuthRequest).user!.id;

      let release = await prisma.release.findUnique({ where: { id } });
      if (!release) {
        release = await prisma.release.findFirst({ where: { spotifyId: id } });
      }
      if (!release) {
        return next(createError('Release not found', 404));
      }

      const rating = await prisma.rating.findUnique({
        where: {
          userId_releaseId: {
            userId,
            releaseId: release.id,
          },
        },
      });

      if (!rating) {
        return next(createError('Rating not found', 404));
      }

      await prisma.rating.delete({
        where: { id: rating.id },
      });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async addToFavorites(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as AuthRequest).user!.id;

      let release = await prisma.release.findUnique({ where: { id } });
      if (!release) {
        release = await prisma.release.findFirst({ where: { spotifyId: id } });
      }
      if (!release) {
        return next(createError('Release not found', 404));
      }

      const existingLike = await prisma.releaseLike.findUnique({
        where: {
          userId_releaseId: {
            userId,
            releaseId: release.id,
          },
        },
      });

      if (existingLike) {
        return next(createError('Release already liked', 409));
      }

      const releaseLike = await prisma.releaseLike.create({
        data: {
          userId,
          releaseId: release.id,
        },
      });

      res.json({ success: true, data: releaseLike });
    } catch (error) {
      next(error);
    }
  }

  async removeFromFavorites(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as AuthRequest).user!.id;

      let release = await prisma.release.findUnique({ where: { id } });
      if (!release) {
        release = await prisma.release.findFirst({ where: { spotifyId: id } });
      }
      if (!release) {
        return next(createError('Release not found', 404));
      }

      const releaseLike = await prisma.releaseLike.findUnique({
        where: {
          userId_releaseId: {
            userId,
            releaseId: release.id,
          },
        },
      });

      if (!releaseLike) {
        return next(createError('Like not found', 404));
      }

      await prisma.releaseLike.delete({ where: { id: releaseLike.id } });

      res.json({ success: true, message: 'Release unliked' });
    } catch (error) {
      next(error);
    }
  }

  async addToWantToHear(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as AuthRequest).user!.id;

      let release = await prisma.release.findUnique({ where: { id } });
      if (!release) {
        release = await prisma.release.findFirst({ where: { spotifyId: id } });
      }
      if (!release) {
        return next(createError('Release not found', 404));
      }

      const existingDiaryEntry = await prisma.diaryEntry.findFirst({
        where: {
          userId,
          releaseId: release.id,
        },
        select: { id: true },
      });

      if (existingDiaryEntry) {
        return next(createError('You already logged this release, so it cannot stay in want to hear.', 409));
      }

      const item = await prisma.wantToHear.upsert({
        where: {
          userId_releaseId: {
            userId,
            releaseId: release.id,
          },
        },
        update: {},
        create: {
          userId,
          releaseId: release.id,
        },
      });

      res.json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  }

  async removeFromWantToHear(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as AuthRequest).user!.id;

      let release = await prisma.release.findUnique({ where: { id } });
      if (!release) {
        release = await prisma.release.findFirst({ where: { spotifyId: id } });
      }
      if (!release) {
        return next(createError('Release not found', 404));
      }

      const existing = await prisma.wantToHear.findUnique({
        where: {
          userId_releaseId: {
            userId,
            releaseId: release.id,
          },
        },
      });

      if (existing) {
        await prisma.wantToHear.delete({ where: { id: existing.id } });
      }

      res.json({ success: true, data: { releaseId: release.id } });
    } catch (error) {
      next(error);
    }
  }

  private async findOrCreateReleaseFromSpotify(album: any) {
    const existing = await prisma.release.findFirst({
      where: { spotifyId: album.id },
      include: releaseSummaryInclude,
    });

    if (existing) {
      return existing;
    }

    const credits = album.artists || [];
    if (credits.length === 0) {
      return null;
    }

    const artists = [];
    for (const credit of credits) {
      artists.push(await this.findOrCreateSpotifyArtist(credit));
    }

    const release = await prisma.release.create({
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

    await this.syncSpotifyReleaseTracks(release.id, album.id);

    return release;
  }

  private async ensureMusicBrainzIdentity(release: any) {
    if (release.musicBrainzId) {
      return release;
    }

    const artistName = release.artist?.name || '';
    const matches = await musicBrainzService.searchReleases(`${release.title} ${artistName}`.trim(), 5);
    if (matches.length === 0) {
      return release;
    }

    const exact = matches.find((candidate) => {
      const titleMatches = candidate.title?.toLowerCase() === String(release.title).toLowerCase();
      const creditMatches = (candidate['artist-credit'] || []).some(
        (credit: any) => credit?.artist?.name?.toLowerCase() === artistName.toLowerCase(),
      );
      return titleMatches && (artistName ? creditMatches : true);
    });
    const best = exact || matches[0];

    return prisma.release.update({
      where: { id: release.id },
      data: {
        musicBrainzId: best.id,
        disambiguation: release.disambiguation || best.disambiguation || null,
        releaseDate: release.releaseDate || musicBrainzService.parseReleaseDate(best.date),
      },
      include: releaseDetailInclude,
    });
  }

  private async hydrateSpotifyReleaseMetadata(release: any) {
    if (!release.spotifyId || !spotifyService.isConfigured()) {
      return release;
    }

    const album = await spotifyService.getAlbumById(release.spotifyId);
    if (!album) {
      return release;
    }

    const nextData: any = {
      label: album.label || release.label || null,
      spotifyPopularity: album.popularity ?? release.spotifyPopularity ?? null,
      copyrights: Array.isArray(album.copyrights)
        ? album.copyrights.map((entry) => entry?.text).filter(Boolean)
        : release.copyrights || [],
    };

    if (!release.releaseDate && album.release_date) {
      nextData.releaseDate = this.parseDate(album.release_date);
    }
    if (!release.artworkUrl && album.images?.[0]?.url) {
      nextData.artworkUrl = album.images[0].url;
    }

    const hasChanges =
      nextData.label !== (release.label || null) ||
      nextData.spotifyPopularity !== (release.spotifyPopularity ?? null) ||
      JSON.stringify(nextData.copyrights || []) !== JSON.stringify(release.copyrights || []) ||
      Boolean(nextData.releaseDate) ||
      Boolean(nextData.artworkUrl);

    if (!hasChanges) {
      return release;
    }

    return prisma.release.update({
      where: { id: release.id },
      data: nextData,
      include: releaseDetailInclude,
    });
  }

  private async hydrateReleaseDescription(release: any) {
    if (!release.musicBrainzId) {
      return release;
    }

    const description = await catalogDescriptionService.resolveReleaseDescription(release.musicBrainzId);
    if (!description) {
      return release;
    }

    const nextData: any = {};
    if (!release.description && description.description) {
      nextData.description = description.description;
    }
    if (!release.disambiguation && description.disambiguation) {
      nextData.disambiguation = description.disambiguation;
    }
    if (!release.wikidataId && description.wikidataId) {
      nextData.wikidataId = description.wikidataId;
    }
    if (!release.wikipediaUrl && description.wikipediaUrl) {
      nextData.wikipediaUrl = description.wikipediaUrl;
    }

    if (Object.keys(nextData).length === 0) {
      return release;
    }

    return prisma.release.update({
      where: { id: release.id },
      data: nextData,
      include: releaseDetailInclude,
    });
  }

  private async syncSpotifyReleaseTracks(localReleaseId: string, spotifyAlbumId: string) {
    const tracks = await spotifyService.getAlbumTracks(spotifyAlbumId, 50);

    for (const track of tracks) {
      const existing = await prisma.track.findFirst({ where: { spotifyId: track.id } });
      const credits = track.artists || [];
      const artists = [];

      for (const credit of credits) {
        artists.push(await this.findOrCreateSpotifyArtist(credit));
      }

      const upserted = existing
        ? await prisma.track.update({
            where: { id: existing.id },
            data: {
              spotifyId: track.id,
              title: track.name,
              duration: track.duration_ms ? Math.round(track.duration_ms / 1000) : null,
              discNumber: track.disc_number || null,
              trackNumber: track.track_number || null,
              releaseId: localReleaseId,
            },
          })
        : await prisma.track.create({
            data: {
              spotifyId: track.id,
              title: track.name,
              duration: track.duration_ms ? Math.round(track.duration_ms / 1000) : null,
              discNumber: track.disc_number || null,
              trackNumber: track.track_number || null,
              releaseId: localReleaseId,
            },
          });

      if (artists.length > 0) {
        await prisma.artistCredit.deleteMany({ where: { trackId: upserted.id } });
        await prisma.artistCredit.createMany({
          data: artists.map((artist, index) => ({
            artistId: artist.id,
            trackId: upserted.id,
            role: index === 0 ? 'MAIN_ARTIST' : 'FEATURED_ARTIST',
            joinPhrase: null,
            position: index + 1,
          })),
        });
      }
    }
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
}

export const releaseController = new ReleaseController();
