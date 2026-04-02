import { Request, Response, NextFunction } from 'express';
import { ReleaseType } from '@prisma/client';
import { createError } from '../middleware/errorHandler';
import { prisma } from '../prisma';
import { releaseSummaryInclude, serializeReleaseSummary } from '../utils/serializers';


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
}

export const chartController = new ChartController();
