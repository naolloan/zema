import { Request, Response, NextFunction } from 'express';
import { ReleaseType } from '@prisma/client';
import { createError } from '../middleware/errorHandler';
import { prisma } from '../prisma';
import { releaseSummaryInclude, serializeReleaseSummary } from '../utils/serializers';

type OfficialListSource = 'chart' | 'recent_reviews' | 'recent_likes';

interface OfficialListDefinition {
  slug: string;
  releaseType: ReleaseType | 'ALL';
  source: OfficialListSource;
  status: 'live' | 'planned';
}

const OFFICIAL_LIST_DEFINITIONS: OfficialListDefinition[] = [
  { slug: 'top-250-community-canon', releaseType: 'ALL', source: 'chart', status: 'live' },
  { slug: 'popular-this-week', releaseType: 'ALL', source: 'recent_reviews', status: 'live' },
  { slug: 'recently-liked', releaseType: 'ALL', source: 'recent_likes', status: 'live' },
  { slug: 'top-250-albums', releaseType: ReleaseType.ALBUM, source: 'chart', status: 'live' },
  { slug: 'top-250-eps', releaseType: ReleaseType.EP, source: 'chart', status: 'live' },
  { slug: 'top-250-songs', releaseType: ReleaseType.SINGLE, source: 'chart', status: 'live' },
  { slug: 'top-250-mixtapes', releaseType: ReleaseType.MIXTAPE, source: 'chart', status: 'live' },
];

class ChartController {
  getTopReleases = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit = '50', offset = '0', type } = req.query;
      const parsedLimit = Math.min(parseInt(limit as string, 10), 250);
      const parsedOffset = parseInt(offset as string, 10);

      const whereClause: { type?: ReleaseType } = {};
      if (typeof type === 'string') {
        const normalizedType = type.toUpperCase() as ReleaseType;
        if ([ReleaseType.ALBUM, ReleaseType.EP, ReleaseType.SINGLE, ReleaseType.MIXTAPE].includes(normalizedType)) {
          whereClause.type = normalizedType;
        }
      }

      const { items, total } = await this.buildChart(whereClause, parsedLimit, parsedOffset);

      res.json({
        success: true,
        data: {
          items,
          total,
          type: typeof type === 'string' ? type.toUpperCase() : 'ALL',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getChartByType = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.params;
      const { limit = '50', offset = '0' } = req.query;
      const chartType = type?.toUpperCase() as ReleaseType;

      if (![ReleaseType.ALBUM, ReleaseType.EP, ReleaseType.SINGLE, ReleaseType.MIXTAPE].includes(chartType)) {
        return next(createError('Invalid chart type. Must be one of: ALBUM, EP, SINGLE, MIXTAPE', 400));
      }

      const parsedLimit = Math.min(parseInt(limit as string, 10), 250);
      const parsedOffset = parseInt(offset as string, 10);
      const { items, total } = await this.buildChart({ type: chartType }, parsedLimit, parsedOffset);

      res.json({
        success: true,
        data: {
          items,
          total,
          type: chartType,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getOfficialList = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const { limit = '50', offset = '0' } = req.query;
      const parsedLimit = Math.min(parseInt(limit as string, 10) || 50, 250);
      const parsedOffset = parseInt(offset as string, 10) || 0;

      const definition = OFFICIAL_LIST_DEFINITIONS.find((item) => item.slug === slug);
      if (!definition) {
        return next(createError('Official list not found', 404));
      }

      if (definition.status !== 'live') {
        return res.json({
          success: true,
          data: {
            items: [],
            total: 0,
            type: definition.slug.toUpperCase(),
          },
        });
      }

      const chart =
        definition.source === 'chart'
          ? await this.buildChart(definition.releaseType === 'ALL' ? {} : { type: definition.releaseType }, parsedLimit, parsedOffset)
          : await this.buildRecentActivityChart(definition, parsedLimit, parsedOffset);

      res.json({
        success: true,
        data: {
          ...chart,
          type: definition.slug.toUpperCase(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  private async buildChart(whereClause: { type?: ReleaseType }, limit: number, offset: number) {
    const ratedReleaseGroups = await prisma.rating.groupBy({
      by: ['releaseId'],
      where: whereClause.type ? { release: { type: whereClause.type } } : undefined,
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

    const pagedGroups = ratedReleaseGroups.slice(offset, offset + limit);
    const releases = await prisma.release.findMany({
      where: {
        id: { in: pagedGroups.map((group) => group.releaseId) },
      },
      include: releaseSummaryInclude,
    });

    const releaseMap = new Map(releases.map((release) => [release.id, release]));
    const items = pagedGroups
      .map((group, index) => {
        const release = releaseMap.get(group.releaseId);
        if (!release) {
          return null;
        }

        return {
          release: serializeReleaseSummary(release),
          rank: offset + index + 1,
          averageRating: group._avg.value || 0,
          ratingCount: group._count.value,
        };
      })
      .filter(Boolean);

    return {
      items,
      total: ratedReleaseGroups.length,
    };
  }

  private async buildRecentActivityChart(definition: OfficialListDefinition, limit: number, offset: number) {
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - 7);

    const releaseTypeFilter =
      definition.releaseType === 'ALL'
        ? {}
        : {
            release: {
              type: definition.releaseType,
            },
          };

    const grouped = new Map<string, { release: any; score: number; averageRating: number; ratingCount: number }>();

    if (definition.source === 'recent_reviews') {
      const reviews = await prisma.review.findMany({
        where: {
          createdAt: { gte: windowStart },
          ...releaseTypeFilter,
        },
        include: {
          release: {
            include: releaseSummaryInclude,
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 1000,
      });

      for (const review of reviews) {
        const current = grouped.get(review.releaseId);
        if (current) {
          current.score += 1;
        } else {
          grouped.set(review.releaseId, {
            release: review.release,
            score: 1,
            averageRating: 0,
            ratingCount: 0,
          });
        }
      }
    } else {
      const likes = await prisma.reviewLike.findMany({
        where: {
          createdAt: { gte: windowStart },
          review: releaseTypeFilter,
        },
        include: {
          review: {
            include: {
              release: {
                include: releaseSummaryInclude,
              },
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 2000,
      });

      for (const like of likes) {
        const release = like.review.release;
        const current = grouped.get(release.id);
        if (current) {
          current.score += 1;
        } else {
          grouped.set(release.id, {
            release,
            score: 1,
            averageRating: 0,
            ratingCount: 0,
          });
        }
      }
    }

    const rankedEntries = Array.from(grouped.values())
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.release.title.localeCompare(b.release.title));

    const pagedEntries = rankedEntries.slice(offset, offset + limit);
    const releaseIds = pagedEntries.map((entry) => entry.release.id);

    const ratingGroups = releaseIds.length
      ? await prisma.rating.groupBy({
          by: ['releaseId'],
          where: {
            releaseId: { in: releaseIds },
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

    return {
      items: pagedEntries.map((entry, index) => ({
        release: {
          ...serializeReleaseSummary(entry.release),
          averageRating: ratingMap.get(entry.release.id)?.averageRating || 0,
          ratingCount: ratingMap.get(entry.release.id)?.ratingCount || 0,
        },
        rank: offset + index + 1,
        averageRating: ratingMap.get(entry.release.id)?.averageRating || 0,
        ratingCount: entry.score,
      })),
      total: rankedEntries.length,
    };
  }
}

export const chartController = new ChartController();
