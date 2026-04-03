import { Request, Response, NextFunction } from 'express';
import { createError } from '../middleware/errorHandler';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { reviewInclude, serializeReview } from '../utils/serializers';


class ReviewController {
  constructor() {
    this.createReview = this.createReview.bind(this);
    this.updateReview = this.updateReview.bind(this);
    this.deleteReview = this.deleteReview.bind(this);
    this.getRecentReviews = this.getRecentReviews.bind(this);
    this.getReviewById = this.getReviewById.bind(this);
    this.toggleLike = this.toggleLike.bind(this);
    this.addComment = this.addComment.bind(this);
    this.deleteComment = this.deleteComment.bind(this);
  }

  async createReview(req: Request, res: Response, next: NextFunction) {
    try {
      const { content, releaseId } = req.body;
      const userId = (req as AuthRequest).user!.id;
      const normalizedContent = typeof content === 'string' ? content.trim() : '';

      if (!normalizedContent || !releaseId) {
        return next(createError('Content and releaseId are required', 400));
      }

      const release = await prisma.release.findUnique({ where: { id: releaseId } });
      if (!release) {
        return next(createError('Release not found', 404));
      }

      const existingReview = await prisma.review.findUnique({
        where: {
          userId_releaseId: {
            userId,
            releaseId,
          },
        },
      });

      if (existingReview) {
        return next(createError('You have already reviewed this release', 409));
      }

      const review = await prisma.review.create({
        data: {
          content: normalizedContent,
          userId,
          releaseId,
        },
        include: reviewInclude,
      });

      res.status(201).json({
        success: true,
        data: serializeReview(review, false),
      });
    } catch (error) {
      next(error);
    }
  }

  async updateReview(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const userId = (req as AuthRequest).user!.id;
      const normalizedContent = typeof content === 'string' ? content.trim() : '';

      if (!normalizedContent) {
        return next(createError('Content is required', 400));
      }

      const review = await prisma.review.findUnique({ where: { id } });
      if (!review) {
        return next(createError('Review not found', 404));
      }

      if (review.userId !== userId) {
        return next(createError('You can only update your own reviews', 403));
      }

      const updatedReview = await prisma.review.update({
        where: { id },
        data: { content: normalizedContent },
        include: reviewInclude,
      });

      res.json({
        success: true,
        data: serializeReview(updatedReview, false),
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteReview(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as AuthRequest).user!.id;

      const review = await prisma.review.findUnique({ where: { id } });
      if (!review) {
        return next(createError('Review not found', 404));
      }

      if (review.userId !== userId) {
        return next(createError('You can only delete your own reviews', 403));
      }

      await prisma.review.delete({ where: { id } });
      res.json({ success: true, message: 'Review deleted successfully' });
    } catch (error) {
      next(error);
    }
  }


  async getRecentReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit = '20', offset = '0' } = req.query;
      const userId = (req as AuthRequest).user?.id;
      const parsedLimit = Math.min(parseInt(limit as string, 10), 50);
      const parsedOffset = parseInt(offset as string, 10);

      const reviews = await prisma.review.findMany({
        include: reviewInclude,
        orderBy: { createdAt: 'desc' },
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

      const total = await prisma.review.count();
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

  async getReviewById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as AuthRequest).user?.id;

      const review = await prisma.review.findUnique({
        where: { id },
        include: reviewInclude,
      });

      if (!review) {
        return next(createError('Review not found', 404));
      }

      let isLiked = false;
      if (userId) {
        const like = await prisma.reviewLike.findUnique({
          where: {
            userId_reviewId: {
              userId,
              reviewId: id,
            },
          },
        });
        isLiked = Boolean(like);
      }

      res.json({
        success: true,
        data: serializeReview(review, isLiked),
      });
    } catch (error) {
      next(error);
    }
  }

  async toggleLike(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as AuthRequest).user!.id;

      const review = await prisma.review.findUnique({ where: { id } });
      if (!review) {
        return next(createError('Review not found', 404));
      }

      const existingLike = await prisma.reviewLike.findUnique({
        where: {
          userId_reviewId: {
            userId,
            reviewId: id,
          },
        },
      });

      if (existingLike) {
        await prisma.reviewLike.delete({ where: { id: existingLike.id } });
        res.json({ success: true, data: { isLiked: false, message: 'Review unliked' } });
      } else {
        await prisma.reviewLike.create({
          data: {
            userId,
            reviewId: id,
          },
        });
        res.json({ success: true, data: { isLiked: true, message: 'Review liked' } });
      }
    } catch (error) {
      next(error);
    }
  }

  async addComment(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const userId = (req as AuthRequest).user!.id;

      if (!content || typeof content !== 'string' || content.trim().length < 2) {
        return next(createError('Comment content must be at least 2 characters long', 400));
      }

      const review = await prisma.review.findUnique({
        where: { id },
        select: {
          id: true,
          userId: true,
          user: {
            select: {
              commentPermission: true,
            },
          },
        },
      });

      if (!review) {
        return next(createError('Review not found', 404));
      }

      const canComment = await this.canCommentOnUserContent(userId, review.userId, review.user.commentPermission);
      if (!canComment) {
        return next(createError('You do not have permission to comment on this review', 403));
      }

      const comment = await prisma.reviewComment.create({
        data: {
          content: content.trim(),
          reviewId: id,
          userId,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        data: comment,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteComment(req: Request, res: Response, next: NextFunction) {
    try {
      const { commentId } = req.params;
      const userId = (req as AuthRequest).user!.id;

      const comment = await prisma.reviewComment.findUnique({
        where: { id: commentId },
        select: {
          id: true,
          userId: true,
        },
      });

      if (!comment) {
        return next(createError('Comment not found', 404));
      }

      if (comment.userId !== userId) {
        return next(createError('You can only delete your own comments', 403));
      }

      await prisma.reviewComment.delete({ where: { id: commentId } });
      res.json({ success: true, message: 'Comment deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  private async canCommentOnUserContent(
    actorUserId: string,
    ownerUserId: string,
    permission: 'ANYONE' | 'FOLLOWING' | 'SELF' | null | undefined,
  ) {
    if (actorUserId === ownerUserId) {
      return true;
    }

    if (permission === 'ANYONE') {
      return true;
    }

    if (permission === 'SELF') {
      return false;
    }

    const followsActor = await prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId: ownerUserId,
          followingId: actorUserId,
        },
      },
    });

    return Boolean(followsActor);
  }
}

export const reviewController = new ReviewController();
