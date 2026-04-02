import { Request, Response, NextFunction } from 'express';
import { createError } from '../middleware/errorHandler';
import { prisma } from '../prisma';
import { listPreviewInclude, releaseSummaryInclude, serializeListComment, serializeListSummary, serializeReleaseSummary } from '../utils/serializers';
import { AuthRequest } from '../middleware/auth';


class ListController {
  constructor() {
    this.createList = this.createList.bind(this);
    this.updateList = this.updateList.bind(this);
    this.deleteList = this.deleteList.bind(this);
    this.getListById = this.getListById.bind(this);
    this.getDiscoverLists = this.getDiscoverLists.bind(this);
    this.getUserLists = this.getUserLists.bind(this);
    this.likeList = this.likeList.bind(this);
    this.unlikeList = this.unlikeList.bind(this);
    this.addComment = this.addComment.bind(this);
    this.deleteComment = this.deleteComment.bind(this);
    this.addListItem = this.addListItem.bind(this);
    this.updateListItem = this.updateListItem.bind(this);
    this.removeListItem = this.removeListItem.bind(this);
    this.reorderListItems = this.reorderListItems.bind(this);
  }

  private async resolveLikedIds(currentUserId: string | undefined, listIds: string[]) {
    if (!currentUserId || listIds.length === 0) {
      return new Set<string>();
    }

    const likes = await prisma.listLike.findMany({
      where: {
        userId: currentUserId,
        listId: { in: listIds },
      },
      select: { listId: true },
    });

    return new Set(likes.map((like) => like.listId));
  }

  private serializeListCollection(lists: any[], likedIds: Set<string>) {
    return lists.map((list) => serializeListSummary(list, likedIds.has(list.id)));
  }

  async createList(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, description, category = 'MIXED', isPublic = false } = req.body;
      const userId = (req as AuthRequest).user!.id;

      if (!title || title.trim().length === 0) {
        return next(createError('Title is required', 400));
      }

      const list = await prisma.list.create({
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          category,
          isPublic,
          userId,
        },
        include: listPreviewInclude,
      });

      res.status(201).json({
        success: true,
        data: serializeListSummary(list, false),
      });
    } catch (error) {
      next(error);
    }
  }

  async updateList(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { title, description, category, isPublic } = req.body;
      const userId = (req as AuthRequest).user!.id;

      const list = await prisma.list.findUnique({ where: { id } });
      if (!list) {
        return next(createError('List not found', 404));
      }

      if (list.userId !== userId) {
        return next(createError('You can only update your own lists', 403));
      }

      const updatedList = await prisma.list.update({
        where: { id },
        data: {
          title: title?.trim() || list.title,
          description: description !== undefined ? description?.trim() || null : list.description,
          category: category !== undefined ? category : list.category,
          isPublic: isPublic !== undefined ? isPublic : list.isPublic,
        },
        include: listPreviewInclude,
      });

      res.json({
        success: true,
        data: serializeListSummary(updatedList, false),
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteList(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as AuthRequest).user!.id;

      const list = await prisma.list.findUnique({ where: { id } });
      if (!list) {
        return next(createError('List not found', 404));
      }

      if (list.userId !== userId) {
        return next(createError('You can only delete your own lists', 403));
      }

      await prisma.list.delete({ where: { id } });
      res.json({ success: true, message: 'List deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async getListById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as AuthRequest).user?.id;

      const list = await prisma.list.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              commentPermission: true,
            },
          },
          items: {
            include: {
              release: {
                include: releaseSummaryInclude,
              },
            },
            orderBy: { position: 'asc' },
          },
          _count: {
            select: {
              likes: true,
            },
          },
          comments: {
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
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          },
        },
      });

      if (!list) {
        return next(createError('List not found', 404));
      }

      if (!list.isPublic && list.userId !== userId) {
        return next(createError('This list is private', 403));
      }

      const isLiked = userId
        ? Boolean(await prisma.listLike.findUnique({
            where: {
              userId_listId: {
                userId,
                listId: list.id,
              },
            },
          }))
        : false;

      res.json({
        success: true,
        data: {
          ...list,
          items: list.items.map((item) => ({
            ...item,
            release: serializeReleaseSummary(item.release),
          })),
          comments: list.comments.map(serializeListComment),
          itemsCount: list.items.length,
          likesCount: list._count.likes,
          isLiked,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserLists(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { limit = '10', offset = '0' } = req.query;
      const currentUserId = (req as AuthRequest).user?.id;
      const parsedLimit = Math.min(parseInt(limit as string, 10), 50);
      const parsedOffset = parseInt(offset as string, 10);

      const whereClause = {
        userId,
        ...(currentUserId !== userId ? { isPublic: true } : {}),
      };

      const lists = await prisma.list.findMany({
        where: whereClause,
        include: listPreviewInclude,
        orderBy: { createdAt: 'desc' },
        take: parsedLimit,
        skip: parsedOffset,
      });
      const likedIds = await this.resolveLikedIds(currentUserId, lists.map((list) => list.id));

      const total = await prisma.list.count({ where: whereClause });
      res.json({
        success: true,
        data: this.serializeListCollection(lists, likedIds),
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

  async getDiscoverLists(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit = '12', offset = '0', sort = 'weekly' } = req.query;
      const parsedLimit = Math.min(parseInt(limit as string, 10), 50);
      const parsedOffset = parseInt(offset as string, 10);
      const currentUserId = (req as AuthRequest).user?.id;

      const weeklyBoundary = new Date();
      weeklyBoundary.setDate(weeklyBoundary.getDate() - 7);
      let lists: any[] = [];
      let total = 0;

      if (sort === 'liked') {
        const likes = await prisma.listLike.findMany({
          where: {
            list: { isPublic: true },
          },
          include: {
            list: {
              include: listPreviewInclude,
            },
          },
          orderBy: { createdAt: 'desc' },
          take: Math.max((parsedOffset + parsedLimit) * 5, 40),
        });

        const deduped: any[] = [];
        const seen = new Set<string>();

        for (const like of likes) {
          if (seen.has(like.listId)) {
            continue;
          }

          seen.add(like.listId);
          deduped.push(like.list);
        }

        lists = deduped.slice(parsedOffset, parsedOffset + parsedLimit);
        total = await prisma.list.count({
          where: {
            isPublic: true,
            likes: { some: {} },
          },
        });
      } else {
        const whereClause = {
          isPublic: true,
          ...(sort === 'weekly' ? { updatedAt: { gte: weeklyBoundary } } : {}),
        };

        lists = await prisma.list.findMany({
          where: whereClause,
          include: listPreviewInclude,
          orderBy: sort === 'weekly'
            ? [{ items: { _count: 'desc' } }, { updatedAt: 'desc' }]
            : [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
          take: parsedLimit,
          skip: parsedOffset,
        });

        total = await prisma.list.count({ where: whereClause });
      }

      const likedIds = await this.resolveLikedIds(currentUserId, lists.map((list) => list.id));

      res.json({
        success: true,
        data: this.serializeListCollection(lists, likedIds),
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

  async likeList(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as AuthRequest).user!.id;

      const list = await prisma.list.findUnique({ where: { id } });
      if (!list) {
        return next(createError('List not found', 404));
      }

      if (!list.isPublic) {
        return next(createError('Only public lists can be liked', 403));
      }

      if (list.userId === userId) {
        return next(createError('You cannot like your own list', 400));
      }

      await prisma.listLike.upsert({
        where: {
          userId_listId: {
            userId,
            listId: id,
          },
        },
        update: {},
        create: {
          userId,
          listId: id,
        },
      });

      const likesCount = await prisma.listLike.count({ where: { listId: id } });
      res.json({ success: true, data: { isLiked: true, likesCount } });
    } catch (error) {
      next(error);
    }
  }

  async unlikeList(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as AuthRequest).user!.id;

      const existingLike = await prisma.listLike.findUnique({
        where: {
          userId_listId: {
            userId,
            listId: id,
          },
        },
      });

      if (existingLike) {
        await prisma.listLike.delete({ where: { id: existingLike.id } });
      }

      const likesCount = await prisma.listLike.count({ where: { listId: id } });
      res.json({ success: true, data: { isLiked: false, likesCount } });
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

      const list = await prisma.list.findUnique({
        where: { id },
        select: {
          id: true,
          isPublic: true,
          userId: true,
          user: {
            select: {
              commentPermission: true,
            },
          },
        },
      });

      if (!list) {
        return next(createError('List not found', 404));
      }

      if (!list.isPublic && list.userId !== userId) {
        return next(createError('This list is private', 403));
      }

      const canComment = await this.canCommentOnUserContent(userId, list.userId, list.user.commentPermission);
      if (!canComment) {
        return next(createError('You do not have permission to comment on this list', 403));
      }

      const comment = await prisma.listComment.create({
        data: {
          content: content.trim(),
          listId: id,
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
        data: serializeListComment(comment),
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteComment(req: Request, res: Response, next: NextFunction) {
    try {
      const { commentId } = req.params;
      const userId = (req as AuthRequest).user!.id;

      const comment = await prisma.listComment.findUnique({
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

      await prisma.listComment.delete({ where: { id: commentId } });
      res.json({ success: true, message: 'Comment deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async addListItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { releaseId, position, notes } = req.body;
      const userId = (req as AuthRequest).user!.id;

      if (!releaseId) {
        return next(createError('ReleaseId is required', 400));
      }

      const list = await prisma.list.findUnique({ where: { id } });
      if (!list) {
        return next(createError('List not found', 404));
      }

      if (list.userId !== userId) {
        return next(createError('You can only modify your own lists', 403));
      }

      const release = await prisma.release.findUnique({ where: { id: releaseId } });
      if (!release) {
        return next(createError('Release not found', 404));
      }

      const categoryReleaseMap = {
        ALBUMS: 'ALBUM',
        SINGLES: 'SINGLE',
        EPS: 'EP',
        MIXTAPES: 'MIXTAPE',
      } as const;
      const requiredType = list.category ? categoryReleaseMap[list.category as keyof typeof categoryReleaseMap] : undefined;
      if (requiredType && release.type !== requiredType) {
        return next(createError(`This list only accepts ${requiredType.toLowerCase()} releases`, 400));
      }

      const existingItem = await prisma.listItem.findUnique({
        where: {
          listId_releaseId: {
            listId: id,
            releaseId,
          },
        },
      });

      if (existingItem) {
        return next(createError('Release already in list', 409));
      }

      const listItem = await prisma.$transaction(async (tx) => {
        const itemCount = await tx.listItem.count({ where: { listId: id } });
        const normalizedPosition = Math.min(Math.max(Number(position) || itemCount + 1, 1), itemCount + 1);
        const itemsToShift = await tx.listItem.findMany({
          where: {
            listId: id,
            position: {
              gte: normalizedPosition,
            },
          },
          orderBy: { position: 'desc' },
        });

        for (const item of itemsToShift) {
          await tx.listItem.update({
            where: { id: item.id },
            data: { position: item.position + 1 },
          });
        }

        return tx.listItem.create({
          data: {
            listId: id,
            releaseId,
            position: normalizedPosition,
            notes: notes?.trim() || null,
          },
          include: {
            release: {
              include: releaseSummaryInclude,
            },
          },
        });
      });

      res.status(201).json({
        success: true,
        data: {
          ...listItem,
          release: serializeReleaseSummary(listItem.release),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateListItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, itemId } = req.params;
      const { notes } = req.body;
      const userId = (req as AuthRequest).user!.id;

      const list = await prisma.list.findUnique({ where: { id } });
      if (!list) {
        return next(createError('List not found', 404));
      }

      if (list.userId !== userId) {
        return next(createError('You can only modify your own lists', 403));
      }

      const listItem = await prisma.listItem.findUnique({ where: { id: itemId } });
      if (!listItem) {
        return next(createError('List item not found', 404));
      }

      if (listItem.listId !== id) {
        return next(createError('List item does not belong to this list', 400));
      }

      const updatedItem = await prisma.listItem.update({
        where: { id: itemId },
        data: {
          notes: notes !== undefined ? notes?.trim() || null : listItem.notes,
        },
        include: {
          release: {
            include: {
              artist: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
        },
      });

      res.json({
        success: true,
        data: {
          ...updatedItem,
          release: serializeReleaseSummary(updatedItem.release),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async removeListItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, itemId } = req.params;
      const userId = (req as AuthRequest).user!.id;

      const list = await prisma.list.findUnique({ where: { id } });
      if (!list) {
        return next(createError('List not found', 404));
      }

      if (list.userId !== userId) {
        return next(createError('You can only modify your own lists', 403));
      }

      const listItem = await prisma.listItem.findUnique({ where: { id: itemId } });
      if (!listItem) {
        return next(createError('List item not found', 404));
      }

      if (listItem.listId !== id) {
        return next(createError('List item does not belong to this list', 400));
      }

      await prisma.$transaction(async (tx) => {
        await tx.listItem.delete({ where: { id: itemId } });
        const remainingItems = await tx.listItem.findMany({
          where: { listId: id },
          orderBy: { position: 'asc' },
        });

        for (let index = 0; index < remainingItems.length; index += 1) {
          if (remainingItems[index].position !== index + 1) {
            await tx.listItem.update({
              where: { id: remainingItems[index].id },
              data: { position: index + 1 },
            });
          }
        }
      });

      res.json({ success: true, message: 'Item removed from list successfully' });
    } catch (error) {
      next(error);
    }
  }

  async reorderListItems(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { itemIds } = req.body;
      const userId = (req as AuthRequest).user!.id;

      if (!Array.isArray(itemIds) || itemIds.length === 0) {
        return next(createError('ItemIds array is required', 400));
      }

      const list = await prisma.list.findUnique({ where: { id } });
      if (!list) {
        return next(createError('List not found', 404));
      }

      if (list.userId !== userId) {
        return next(createError('You can only modify your own lists', 403));
      }

      const items = await prisma.listItem.findMany({
        where: {
          id: { in: itemIds },
          listId: id,
        },
      });

      if (items.length !== itemIds.length) {
        return next(createError('Some items do not belong to this list', 400));
      }

      await prisma.$transaction(async (tx) => {
        for (let index = 0; index < itemIds.length; index += 1) {
          await tx.listItem.update({
            where: { id: itemIds[index] },
            data: { position: -(index + 1) },
          });
        }

        for (let index = 0; index < itemIds.length; index += 1) {
          await tx.listItem.update({
            where: { id: itemIds[index] },
            data: { position: index + 1 },
          });
        }
      });

      res.json({ success: true, message: 'List items reordered successfully' });
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

export const listController = new ListController();
