import { Request, Response, NextFunction } from 'express';
import { createError } from '../middleware/errorHandler';
import { prisma } from '../prisma';
import { releaseSummaryInclude, serializeReleaseSummary } from '../utils/serializers';
import { AuthRequest } from '../middleware/auth';


class RatingController {
  async getUserRatings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthRequest).user!.id;
      const { limit = '20', offset = '0' } = req.query;

      const ratings = await prisma.rating.findMany({
        where: { userId },
        include: {
          release: {
            include: releaseSummaryInclude,
          },
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: Math.min(parseInt(limit as string), 50),
        skip: parseInt(offset as string)
      });

      const total = await prisma.rating.count({
        where: { userId }
      });

      res.json({
        success: true,
        data: ratings.map((rating) => ({
          ...rating,
          release: serializeReleaseSummary(rating.release),
        })),
        pagination: {
          page: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string))
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export const ratingController = new RatingController();
