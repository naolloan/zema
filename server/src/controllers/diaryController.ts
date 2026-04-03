import { Request, Response, NextFunction } from 'express';
import { createError } from '../middleware/errorHandler';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { releaseSummaryInclude, reviewInclude, serializeReleaseSummary, serializeReview } from '../utils/serializers';


const diaryEntryInclude: any = {
  release: {
    include: releaseSummaryInclude,
  },
  review: {
    include: reviewInclude,
  },
};

class DiaryController {
  createDiaryEntry = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { releaseId, listenedAt, notes, createReview, reviewContent } = req.body;
      const userId = (req as AuthRequest).user!.id;
      const normalizedReviewContent = typeof reviewContent === 'string' ? reviewContent.trim() : '';

      if (!releaseId || !listenedAt) {
        return next(createError('ReleaseId and listenedAt are required', 400));
      }

      const createdEntry = await prisma.$transaction(async (tx) => {
        const release = await tx.release.findUnique({ where: { id: releaseId } });
        if (!release) {
          throw createError('Release not found', 404);
        }

        if (createReview && normalizedReviewContent) {
          const existingReview = await tx.review.findUnique({
            where: {
              userId_releaseId: {
                userId,
                releaseId,
              },
            },
          });

          if (existingReview) {
            throw createError('You have already reviewed this release', 409);
          }
        }

        const diaryEntry = await tx.diaryEntry.create({
          data: {
            userId,
            releaseId,
            listenedAt: new Date(listenedAt),
            notes: notes || null,
          },
        });

        await tx.wantToHear.deleteMany({
          where: {
            userId,
            releaseId,
          },
        });

        if (createReview && normalizedReviewContent) {
          await tx.review.create({
            data: {
              content: normalizedReviewContent,
              userId,
              releaseId,
              diaryEntryId: diaryEntry.id,
            },
          });
        }

        return tx.diaryEntry.findUnique({
          where: { id: diaryEntry.id },
          include: diaryEntryInclude,
        });
      });

      res.status(201).json({
        success: true,
        data: this.serializeDiaryEntry(createdEntry),
      });
    } catch (error) {
      next(error);
    }
  }


  getRecentDiaryEntries = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit = '20', offset = '0' } = req.query;
      const parsedLimit = Math.min(parseInt(limit as string, 10), 50);
      const parsedOffset = parseInt(offset as string, 10);

      const diaryEntries = await prisma.diaryEntry.findMany({
        include: diaryEntryInclude,
        orderBy: { listenedAt: 'desc' },
        take: parsedLimit,
        skip: parsedOffset,
      });

      const total = await prisma.diaryEntry.count();
      res.json({
        success: true,
        data: diaryEntries.map((entry) => this.serializeDiaryEntry(entry)),
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

  getMyDiaryEntries = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const { limit = '20', offset = '0', releaseId } = req.query;

      const whereClause: { userId: string; releaseId?: string } = { userId };
      if (typeof releaseId === 'string') {
        whereClause.releaseId = releaseId;
      }

      const diaryEntries = await prisma.diaryEntry.findMany({
        where: whereClause,
        include: diaryEntryInclude,
        orderBy: { listenedAt: 'desc' },
        take: Math.min(parseInt(limit as string, 10), 50),
        skip: parseInt(offset as string, 10),
      });

      const total = await prisma.diaryEntry.count({ where: whereClause });
      const parsedLimit = parseInt(limit as string, 10);
      const parsedOffset = parseInt(offset as string, 10);

      res.json({
        success: true,
        data: diaryEntries.map((entry) => this.serializeDiaryEntry(entry)),
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

  getUserDiaryEntries = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const { limit = '20', offset = '0', releaseId } = req.query;

      const whereClause: { userId: string; releaseId?: string } = { userId };
      if (typeof releaseId === 'string') {
        whereClause.releaseId = releaseId;
      }

      const diaryEntries = await prisma.diaryEntry.findMany({
        where: whereClause,
        include: diaryEntryInclude,
        orderBy: { listenedAt: 'desc' },
        take: Math.min(parseInt(limit as string, 10), 50),
        skip: parseInt(offset as string, 10),
      });

      const total = await prisma.diaryEntry.count({ where: whereClause });
      const parsedLimit = parseInt(limit as string, 10);
      const parsedOffset = parseInt(offset as string, 10);

      res.json({
        success: true,
        data: diaryEntries.map((entry) => this.serializeDiaryEntry(entry)),
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

  updateDiaryEntry = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { listenedAt, notes } = req.body;
      const userId = (req as AuthRequest).user!.id;

      const diaryEntry = await prisma.diaryEntry.findUnique({ where: { id } });
      if (!diaryEntry) {
        return next(createError('Diary entry not found', 404));
      }

      if (diaryEntry.userId !== userId) {
        return next(createError('You can only update your own diary entries', 403));
      }

      const updatedEntry = await prisma.diaryEntry.update({
        where: { id },
        data: {
          listenedAt: listenedAt ? new Date(listenedAt) : diaryEntry.listenedAt,
          notes: notes !== undefined ? notes : diaryEntry.notes,
        },
        include: diaryEntryInclude,
      });

      res.json({
        success: true,
        data: this.serializeDiaryEntry(updatedEntry),
      });
    } catch (error) {
      next(error);
    }
  };

  deleteDiaryEntry = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = (req as AuthRequest).user!.id;

      const diaryEntry = await prisma.diaryEntry.findUnique({ where: { id } });
      if (!diaryEntry) {
        return next(createError('Diary entry not found', 404));
      }

      if (diaryEntry.userId !== userId) {
        return next(createError('You can only delete your own diary entries', 403));
      }

      await prisma.diaryEntry.delete({ where: { id } });

      res.json({ success: true, message: 'Diary entry deleted successfully' });
    } catch (error) {
      next(error);
    }
  };

  private serializeDiaryEntry(entry: any) {
    if (!entry) {
      return entry;
    }

    return {
      ...entry,
      release: entry.release ? serializeReleaseSummary(entry.release) : null,
      review: entry.review ? serializeReview(entry.review, false) : null,
    };
  }
}

export const diaryController = new DiaryController();
