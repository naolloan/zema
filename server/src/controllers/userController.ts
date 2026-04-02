import { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { createError } from '../middleware/errorHandler';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { releaseSummaryInclude, reviewInclude, serializeArtistSummary, serializeReleaseSummary, serializeReview, serializeUserSummary } from '../utils/serializers';

const AVATAR_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'avatars');

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

class UserController {
  constructor() {
    this.searchUsers = this.searchUsers.bind(this);
    this.getProfile = this.getProfile.bind(this);
    this.updateProfile = this.updateProfile.bind(this);
    this.uploadAvatar = this.uploadAvatar.bind(this);
    this.getUserById = this.getUserById.bind(this);
    this.followUser = this.followUser.bind(this);
    this.unfollowUser = this.unfollowUser.bind(this);
    this.getFollowers = this.getFollowers.bind(this);
    this.getFollowing = this.getFollowing.bind(this);
    this.getUserReviews = this.getUserReviews.bind(this);
    this.getUserDiary = this.getUserDiary.bind(this);
    this.getUserFavorites = this.getUserFavorites.bind(this);
    this.getUserReleaseLikes = this.getUserReleaseLikes.bind(this);
    this.addFavoriteRelease = this.addFavoriteRelease.bind(this);
    this.removeFavoriteRelease = this.removeFavoriteRelease.bind(this);
    this.addFavoriteArtist = this.addFavoriteArtist.bind(this);
    this.removeFavoriteArtist = this.removeFavoriteArtist.bind(this);
    this.getUserWantToHear = this.getUserWantToHear.bind(this);
    this.getUserLists = this.getUserLists.bind(this);
    this.getMyNotifications = this.getMyNotifications.bind(this);
    this.markNotificationsRead = this.markNotificationsRead.bind(this);
    this.markNotificationReadState = this.markNotificationReadState.bind(this);
  }

  async searchUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { q: query, limit = '10', offset = '0' } = req.query;
      const currentUserId = (req as AuthRequest).user?.id;

      if (!query || typeof query !== 'string') {
        return next(createError('Search query is required', 400));
      }

      const parsedLimit = Math.min(parseInt(limit as string, 10), 50);
      const parsedOffset = parseInt(offset as string, 10);
      const fetchLimit = Math.min(Math.max(parsedLimit * 3, parsedLimit), 50);
      const whereClause = {
        OR: [
          { username: { contains: query, mode: 'insensitive' as const } },
          { displayName: { contains: query, mode: 'insensitive' as const } },
        ],
      };

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where: whereClause,
          orderBy: [{ displayName: 'asc' }, { username: 'asc' }],
          take: fetchLimit,
          skip: parsedOffset,
          select: {
            id: true,
            username: true,
            displayName: true,
            bio: true,
            avatarUrl: true,
            createdAt: true,
            _count: {
              select: {
                followers: true,
                following: true,
                reviews: true,
              },
            },
          },
        }),
        prisma.user.count({ where: whereClause }),
      ]);

      const sortedUsers = [...users].sort((left, right) => {
        const leftScore = Math.max(
          scoreQueryMatch(query, left.displayName),
          scoreQueryMatch(query, left.username),
        );
        const rightScore = Math.max(
          scoreQueryMatch(query, right.displayName),
          scoreQueryMatch(query, right.username),
        );

        if (rightScore !== leftScore) {
          return rightScore - leftScore;
        }

        const leftName = normalizeSearchText(left.displayName || left.username);
        const rightName = normalizeSearchText(right.displayName || right.username);
        return leftName.localeCompare(rightName);
      }).slice(0, parsedLimit);

      const relationshipMap = await this.getRelationshipMap(currentUserId, sortedUsers.map((user) => user.id));

      res.json({
        success: true,
        data: sortedUsers.map((user) => ({
          ...serializeUserSummary(user),
          counts: {
            followers: user._count.followers,
            following: user._count.following,
            reviews: user._count.reviews,
          },
          ...relationshipMap.get(user.id),
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

  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthRequest).user!.id;
      const payload = await this.buildProfilePayload(userId, userId);

      if (!payload) {
        return next(createError('User not found', 404));
      }

      res.json({ success: true, data: payload });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthRequest).user!.id;
      const { displayName, bio, avatarUrl, commentPermission } = req.body;
      const normalizedAvatarUrl = typeof avatarUrl === 'string' ? avatarUrl.trim() : undefined;

      if (normalizedAvatarUrl) {
        const isHttpImage = /^https?:\/\/.+/i.test(normalizedAvatarUrl);
        const isLocalUpload = /^https?:\/\/.+\/uploads\/avatars\/.+/i.test(normalizedAvatarUrl) || /^\/uploads\/avatars\/.+/i.test(normalizedAvatarUrl);

        if (!isHttpImage && !isLocalUpload) {
          return next(createError('Profile picture must be an image URL or uploaded image.', 400));
        }

        if (normalizedAvatarUrl.length > 4_000) {
          return next(createError('Profile picture is too large. Please choose a smaller image.', 400));
        }
      }

      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { avatarUrl: true },
      });

      if (existingUser?.avatarUrl && existingUser.avatarUrl !== normalizedAvatarUrl) {
        await this.deleteStoredAvatar(existingUser.avatarUrl);
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          displayName,
          bio,
          avatarUrl: normalizedAvatarUrl || null,
          commentPermission: commentPermission || undefined,
        },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          bio: true,
          avatarUrl: true,
          commentPermission: true,
          createdAt: true,
        },
      });

      res.json({ success: true, data: updatedUser });
    } catch (error) {
      next(error);
    }
  }

  async uploadAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthRequest).user!.id;
      const { imageDataUrl } = req.body;

      if (!imageDataUrl || typeof imageDataUrl !== 'string') {
        return next(createError('Image data is required.', 400));
      }

      const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (!match) {
        return next(createError('Uploaded avatar must be a valid image.', 400));
      }

      const mimeType = match[1];
      const base64Data = match[2];
      const extension = this.getAvatarExtension(mimeType);

      if (!extension) {
        return next(createError('Only PNG, JPG, WebP, and GIF avatars are supported.', 400));
      }

      const buffer = Buffer.from(base64Data, 'base64');
      if (buffer.length > 2 * 1024 * 1024) {
        return next(createError('Uploaded avatar is too large. Please choose a smaller image.', 400));
      }

      await fs.mkdir(AVATAR_UPLOAD_DIR, { recursive: true });

      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { avatarUrl: true },
      });

      const fileName = `${userId}-${randomUUID()}.${extension}`;
      const filePath = path.join(AVATAR_UPLOAD_DIR, fileName);
      await fs.writeFile(filePath, buffer);

      if (existingUser?.avatarUrl) {
        await this.deleteStoredAvatar(existingUser.avatarUrl);
      }

      const avatarUrl = `${req.protocol}://${req.get('host')}/uploads/avatars/${fileName}`;

      res.json({
        success: true,
        data: { avatarUrl },
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const currentUserId = (req as AuthRequest).user?.id;
      const payload = await this.buildProfilePayload(id, currentUserId);

      if (!payload) {
        return next(createError('User not found', 404));
      }

      res.json({ success: true, data: payload });
    } catch (error) {
      next(error);
    }
  }

  async followUser(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUserId = (req as AuthRequest).user!.id;
      const { id } = req.params;

      if (currentUserId === id) {
        return next(createError('You cannot follow yourself', 400));
      }

      const targetUser = await prisma.user.findUnique({ where: { id }, select: { id: true } });
      if (!targetUser) {
        return next(createError('User not found', 404));
      }

      await prisma.userFollow.upsert({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: id,
          },
        },
        update: {},
        create: {
          followerId: currentUserId,
          followingId: id,
        },
      });

      const relationship = await this.getRelationshipSnapshot(currentUserId, id);
      res.json({ success: true, data: relationship });
    } catch (error) {
      next(error);
    }
  }

  async unfollowUser(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUserId = (req as AuthRequest).user!.id;
      const { id } = req.params;

      const existing = await prisma.userFollow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: id,
          },
        },
      });

      if (existing) {
        await prisma.userFollow.delete({ where: { id: existing.id } });
      }

      const relationship = await this.getRelationshipSnapshot(currentUserId, id);
      res.json({ success: true, data: relationship });
    } catch (error) {
      next(error);
    }
  }

  async getFollowers(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const currentUserId = (req as AuthRequest).user?.id;
      const { limit = '20', offset = '0' } = req.query;
      const parsedLimit = Math.min(parseInt(limit as string, 10), 50);
      const parsedOffset = parseInt(offset as string, 10);

      const [follows, total] = await Promise.all([
        prisma.userFollow.findMany({
          where: { followingId: id },
          include: {
            follower: {
              select: {
                id: true,
                username: true,
                displayName: true,
                bio: true,
                avatarUrl: true,
                createdAt: true,
                _count: {
                  select: {
                    followers: true,
                    following: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: parsedLimit,
          skip: parsedOffset,
        }),
        prisma.userFollow.count({ where: { followingId: id } }),
      ]);

      const users = follows.map((follow) => follow.follower);
      const relationshipMap = await this.getRelationshipMap(currentUserId, users.map((user) => user.id));

      res.json({
        success: true,
        data: users.map((user) => ({
          ...serializeUserSummary(user),
          counts: {
            followers: user._count.followers,
            following: user._count.following,
          },
          ...relationshipMap.get(user.id),
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

  async getFollowing(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const currentUserId = (req as AuthRequest).user?.id;
      const { limit = '20', offset = '0' } = req.query;
      const parsedLimit = Math.min(parseInt(limit as string, 10), 50);
      const parsedOffset = parseInt(offset as string, 10);

      const [follows, total] = await Promise.all([
        prisma.userFollow.findMany({
          where: { followerId: id },
          include: {
            following: {
              select: {
                id: true,
                username: true,
                displayName: true,
                bio: true,
                avatarUrl: true,
                createdAt: true,
                _count: {
                  select: {
                    followers: true,
                    following: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: parsedLimit,
          skip: parsedOffset,
        }),
        prisma.userFollow.count({ where: { followerId: id } }),
      ]);

      const users = follows.map((follow) => follow.following);
      const relationshipMap = await this.getRelationshipMap(currentUserId, users.map((user) => user.id));

      res.json({
        success: true,
        data: users.map((user) => ({
          ...serializeUserSummary(user),
          counts: {
            followers: user._count.followers,
            following: user._count.following,
          },
          ...relationshipMap.get(user.id),
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

  async getUserReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { limit = '10', offset = '0' } = req.query;
      const currentUserId = (req as AuthRequest).user?.id;
      const parsedLimit = Math.min(parseInt(limit as string, 10), 50);
      const parsedOffset = parseInt(offset as string, 10);

      const reviews = await prisma.review.findMany({
        where: { userId: id },
        include: reviewInclude,
        orderBy: { createdAt: 'desc' },
        take: parsedLimit,
        skip: parsedOffset,
      });

      const likedReviewIds = new Set<string>();
      if (currentUserId && reviews.length > 0) {
        const likes = await prisma.reviewLike.findMany({
          where: {
            userId: currentUserId,
            reviewId: { in: reviews.map((review) => review.id) },
          },
          select: { reviewId: true },
        });
        for (const like of likes) {
          likedReviewIds.add(like.reviewId);
        }
      }

      const total = await prisma.review.count({ where: { userId: id } });
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

  async getUserDiary(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { limit = '10', offset = '0' } = req.query;
      const parsedLimit = Math.min(parseInt(limit as string, 10), 50);
      const parsedOffset = parseInt(offset as string, 10);

      const diaryEntries = await prisma.diaryEntry.findMany({
        where: { userId: id },
        include: {
          release: {
            include: releaseSummaryInclude,
          },
          review: {
            include: reviewInclude,
          },
        },
        orderBy: { listenedAt: 'desc' },
        take: parsedLimit,
        skip: parsedOffset,
      });

      const total = await prisma.diaryEntry.count({ where: { userId: id } });
      res.json({
        success: true,
        data: diaryEntries.map((entry) => ({
          ...entry,
          release: serializeReleaseSummary(entry.release),
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

  async getUserFavorites(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      res.json({ success: true, data: await this.buildCuratedFavoritesPayload(id) });
    } catch (error) {
      next(error);
    }
  }

  async getUserReleaseLikes(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { limit = '12', offset = '0' } = req.query;
      const parsedLimit = Math.min(parseInt(limit as string, 10), 50);
      const parsedOffset = parseInt(offset as string, 10);

      const [likes, total] = await Promise.all([
        prisma.releaseLike.findMany({
          where: { userId: id },
          include: {
            release: {
              include: releaseSummaryInclude,
            },
          },
          orderBy: { createdAt: 'desc' },
          take: parsedLimit,
          skip: parsedOffset,
        }),
        prisma.releaseLike.count({ where: { userId: id } }),
      ]);

      res.json({
        success: true,
        data: likes.map((like) => ({
          ...like,
          release: {
            ...serializeReleaseSummary(like.release),
            isLiked: true,
          },
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

  async addFavoriteRelease(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthRequest).user!.id;
      const { releaseId, section } = req.body as { releaseId?: string; section?: 'ALBUMS' | 'SONGS' };

      if (!releaseId || !section || !['ALBUMS', 'SONGS'].includes(section)) {
        return next(createError('A release and favorite section are required', 400));
      }

      const release = await prisma.release.findUnique({ where: { id: releaseId } });
      if (!release) {
        return next(createError('Release not found', 404));
      }

      if (section === 'SONGS' && release.type !== 'SINGLE') {
        return next(createError('Only songs can be added to favorite songs', 400));
      }

      if (section === 'ALBUMS' && release.type === 'SINGLE') {
        return next(createError('Songs belong in favorite songs, not favorite albums', 400));
      }

      const existingFavorite = await prisma.favorite.findUnique({
        where: {
          userId_releaseId: {
            userId,
            releaseId,
          },
        },
      });

      if (existingFavorite) {
        return next(createError('Release already in your curated favorites', 409));
      }

      const currentCount = await prisma.favorite.count({
        where: { userId, section },
      });

      if (currentCount >= 4) {
        return next(createError(`Maximum 4 entries allowed in favorite ${section === 'ALBUMS' ? 'albums' : 'songs'}`, 400));
      }

      const favorite = await prisma.favorite.create({
        data: {
          userId,
          releaseId,
          section,
          position: currentCount + 1,
        },
        include: {
          release: {
            include: releaseSummaryInclude,
          },
        },
      });

      res.json({
        success: true,
        data: {
          ...favorite,
          release: serializeReleaseSummary(favorite.release),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async removeFavoriteRelease(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthRequest).user!.id;
      const { releaseId } = req.params;

      const favorite = await prisma.favorite.findUnique({
        where: {
          userId_releaseId: {
            userId,
            releaseId,
          },
        },
      });

      if (!favorite) {
        return next(createError('Favorite release not found', 404));
      }

      await prisma.$transaction(async (tx) => {
        await tx.favorite.delete({ where: { id: favorite.id } });
        const remainingFavorites = await tx.favorite.findMany({
          where: { userId, section: favorite.section },
          orderBy: { position: 'asc' },
        });

        for (let index = 0; index < remainingFavorites.length; index += 1) {
          await tx.favorite.update({
            where: { id: remainingFavorites[index].id },
            data: { position: index + 1 },
          });
        }
      });

      res.json({ success: true, message: 'Favorite release removed' });
    } catch (error) {
      next(error);
    }
  }

  async addFavoriteArtist(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthRequest).user!.id;
      const { artistId } = req.body as { artistId?: string };

      if (!artistId) {
        return next(createError('Artist is required', 400));
      }

      const artist = await prisma.artist.findUnique({ where: { id: artistId } });
      if (!artist) {
        return next(createError('Artist not found', 404));
      }

      const existingFavorite = await prisma.favoriteArtist.findUnique({
        where: {
          userId_artistId: {
            userId,
            artistId,
          },
        },
      });

      if (existingFavorite) {
        return next(createError('Artist already in your curated favorites', 409));
      }

      const currentCount = await prisma.favoriteArtist.count({ where: { userId } });
      if (currentCount >= 4) {
        return next(createError('Maximum 4 favorite artists allowed', 400));
      }

      const favoriteArtist = await prisma.favoriteArtist.create({
        data: {
          userId,
          artistId,
          position: currentCount + 1,
        },
        include: {
          artist: true,
        },
      });

      res.json({
        success: true,
        data: {
          ...favoriteArtist,
          artist: serializeArtistSummary(favoriteArtist.artist),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async removeFavoriteArtist(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthRequest).user!.id;
      const { artistId } = req.params;

      const favoriteArtist = await prisma.favoriteArtist.findUnique({
        where: {
          userId_artistId: {
            userId,
            artistId,
          },
        },
      });

      if (!favoriteArtist) {
        return next(createError('Favorite artist not found', 404));
      }

      await prisma.$transaction(async (tx) => {
        await tx.favoriteArtist.delete({ where: { id: favoriteArtist.id } });
        const remainingArtists = await tx.favoriteArtist.findMany({
          where: { userId },
          orderBy: { position: 'asc' },
        });

        for (let index = 0; index < remainingArtists.length; index += 1) {
          await tx.favoriteArtist.update({
            where: { id: remainingArtists[index].id },
            data: { position: index + 1 },
          });
        }
      });

      res.json({ success: true, message: 'Favorite artist removed' });
    } catch (error) {
      next(error);
    }
  }

  async getUserWantToHear(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { limit = '12', offset = '0' } = req.query;
      const parsedLimit = Math.min(parseInt(limit as string, 10), 50);
      const parsedOffset = parseInt(offset as string, 10);

      const [items, total] = await Promise.all([
        prisma.wantToHear.findMany({
          where: { userId: id },
          include: {
            release: {
              include: releaseSummaryInclude,
            },
          },
          orderBy: { createdAt: 'desc' },
          take: parsedLimit,
          skip: parsedOffset,
        }),
        prisma.wantToHear.count({ where: { userId: id } }),
      ]);

      res.json({
        success: true,
        data: items.map((item) => ({
          ...item,
          release: serializeReleaseSummary(item.release),
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

  async getMyNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthRequest).user!.id;
      const { limit = '20', offset = '0', filter = 'all' } = req.query;
      const parsedLimit = Math.min(parseInt(limit as string, 10), 50);
      const parsedOffset = Math.max(parseInt(offset as string, 10) || 0, 0);
      const notificationFilter = filter === 'unread' ? 'unread' : 'all';
      const sourceLimit = Math.max(parsedOffset + parsedLimit + 20, 50);
      const notifications = await this.buildNotificationsFeed(userId, sourceLimit);
      const filteredNotifications = notificationFilter === 'unread'
        ? notifications.filter((notification) => notification.unread)
        : notifications;
      const paginatedNotifications = filteredNotifications.slice(parsedOffset, parsedOffset + parsedLimit);

      res.json({
        success: true,
        data: paginatedNotifications,
        pagination: {
          page: Math.floor(parsedOffset / parsedLimit) + 1,
          limit: parsedLimit,
          total: filteredNotifications.length,
          totalPages: Math.ceil(filteredNotifications.length / parsedLimit) || 1,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async markNotificationsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthRequest).user!.id;
      const { state = 'read' } = req.body ?? {};

      if (state === 'unread') {
        await prisma.notificationRead.deleteMany({
          where: { userId },
        });
      } else {
        const notifications = await this.buildNotificationsFeed(userId, 250);
        await prisma.notificationRead.createMany({
          data: notifications.map((notification) => ({
            userId,
            notificationKey: notification.id,
          })),
          skipDuplicates: true,
        });
      }

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async markNotificationReadState(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthRequest).user!.id;
      const { notificationId } = req.params;
      const { state = 'read' } = req.body ?? {};

      if (!notificationId) {
        return next(createError('Notification id is required', 400));
      }

      if (state === 'unread') {
        await prisma.notificationRead.deleteMany({
          where: {
            userId,
            notificationKey: notificationId,
          },
        });
      } else {
        await prisma.notificationRead.upsert({
          where: {
            userId_notificationKey: {
              userId,
              notificationKey: notificationId,
            },
          },
          update: {},
          create: {
            userId,
            notificationKey: notificationId,
          },
        });
      }

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async getUserLists(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { limit = '10', offset = '0' } = req.query;
      const currentUserId = (req as AuthRequest).user?.id;
      const parsedLimit = Math.min(parseInt(limit as string, 10), 50);
      const parsedOffset = parseInt(offset as string, 10);
      const whereClause = {
        userId: id,
        ...(currentUserId !== id ? { isPublic: true } : {}),
      };

      const lists = await prisma.list.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
          _count: {
            select: {
              items: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: parsedLimit,
        skip: parsedOffset,
      });

      const total = await prisma.list.count({ where: whereClause });
      res.json({
        success: true,
        data: lists.map((list) => ({
          ...list,
          itemsCount: list._count.items,
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

  private getAvatarExtension(mimeType: string) {
    const mimeMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };

    return mimeMap[mimeType.toLowerCase()] || null;
  }

  private async deleteStoredAvatar(avatarUrl: string | null | undefined) {
    if (!avatarUrl) {
      return;
    }

    try {
      const parsedUrl = new URL(avatarUrl, 'http://localhost');
      if (!parsedUrl.pathname.startsWith('/uploads/avatars/')) {
        return;
      }

      const safeName = path.basename(parsedUrl.pathname);
      const targetPath = path.join(AVATAR_UPLOAD_DIR, safeName);
      await fs.unlink(targetPath);
    } catch (error: any) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  private async buildProfilePayload(targetUserId: string, currentUserId?: string | null) {
    const [user, wantToHearCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          username: true,
          displayName: true,
          bio: true,
          avatarUrl: true,
          commentPermission: true,
          createdAt: true,
          _count: {
            select: {
              reviews: true,
              ratings: true,
              diaryEntries: true,
              lists: true,
              followers: true,
              following: true,
            },
          },
        },
      }),
      prisma.wantToHear.count({
        where: { userId: targetUserId },
      }),
    ]);

    if (!user) {
      return null;
    }

    const favorites = await this.buildCuratedFavoritesPayload(user.id);
    const likedReleasesCount = await prisma.releaseLike.count({
      where: { userId: user.id },
    });

    const relationship = await this.getRelationshipSnapshot(currentUserId, user.id);

    return {
      ...user,
      _count: {
        ...user._count,
        wantToHear: wantToHearCount,
      },
      favoriteAlbums: favorites.favoriteAlbums,
      favoriteSongs: favorites.favoriteSongs,
      favoriteArtists: favorites.favoriteArtists,
      counts: {
        followers: user._count.followers,
        following: user._count.following,
        likedReleases: likedReleasesCount,
      },
      ...relationship,
    };
  }

  private async buildCuratedFavoritesPayload(targetUserId: string) {
    const [favoriteReleases, favoriteArtists] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId: targetUserId },
        include: {
          release: {
            include: releaseSummaryInclude,
          },
        },
        orderBy: [{ section: 'asc' }, { position: 'asc' }],
      }),
      prisma.favoriteArtist.findMany({
        where: { userId: targetUserId },
        include: {
          artist: true,
        },
        orderBy: { position: 'asc' },
      }),
    ]);

    return {
      favoriteAlbums: favoriteReleases
        .filter((favorite) => favorite.section === 'ALBUMS')
        .map((favorite) => ({
          ...favorite,
          release: serializeReleaseSummary(favorite.release),
        })),
      favoriteSongs: favoriteReleases
        .filter((favorite) => favorite.section === 'SONGS')
        .map((favorite) => ({
          ...favorite,
          release: serializeReleaseSummary(favorite.release),
        })),
      favoriteArtists: favoriteArtists.map((favoriteArtist) => ({
        ...favoriteArtist,
        artist: serializeArtistSummary(favoriteArtist.artist),
      })),
    };
  }

  private async buildNotificationsFeed(userId: string, sourceLimit: number) {
    const [follows, reviewLikes, reviewComments, listLikes] = await Promise.all([
      prisma.userFollow.findMany({
        where: { followingId: userId },
        include: {
          follower: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: sourceLimit,
      }),
      prisma.reviewLike.findMany({
        where: {
          review: {
            userId,
          },
          userId: { not: userId },
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
          review: {
            include: {
              release: {
                include: releaseSummaryInclude,
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: sourceLimit,
      }),
      prisma.reviewComment.findMany({
        where: {
          review: {
            userId,
          },
          userId: { not: userId },
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
          review: {
            include: {
              release: {
                include: releaseSummaryInclude,
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: sourceLimit,
      }),
      prisma.listLike.findMany({
        where: {
          list: {
            userId,
          },
          userId: { not: userId },
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
          list: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: sourceLimit,
      }),
    ]);

    const baseNotifications = [
      ...follows.map((follow) => ({
        id: `follow-${follow.id}`,
        type: 'follow',
        createdAt: follow.createdAt,
        user: serializeUserSummary(follow.follower),
        text: `${follow.follower.displayName || follow.follower.username} followed you`,
        targetUrl: `/users/${follow.follower.id}`,
      })),
      ...reviewLikes.map((like) => ({
        id: `review-like-${like.id}`,
        type: 'review_like',
        createdAt: like.createdAt,
        user: serializeUserSummary(like.user),
        text: `${like.user.displayName || like.user.username} liked your review of ${like.review.release.title}`,
        release: serializeReleaseSummary(like.review.release),
        targetUrl: `/releases/${like.review.release.id}#review-${like.review.id}`,
      })),
      ...reviewComments.map((comment) => ({
        id: `review-comment-${comment.id}`,
        type: 'review_comment',
        createdAt: comment.createdAt,
        user: serializeUserSummary(comment.user),
        text: `${comment.user.displayName || comment.user.username} commented on your review of ${comment.review.release.title}`,
        release: serializeReleaseSummary(comment.review.release),
        targetUrl: `/releases/${comment.review.release.id}#review-${comment.review.id}`,
      })),
      ...listLikes.map((like) => ({
        id: `list-like-${like.id}`,
        type: 'list_like',
        createdAt: like.createdAt,
        user: serializeUserSummary(like.user),
        text: `${like.user.displayName || like.user.username} liked your list ${like.list.title}`,
        list: like.list,
        targetUrl: `/lists/${like.list.id}`,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const readRows = baseNotifications.length
      ? await prisma.notificationRead.findMany({
          where: {
            userId,
            notificationKey: { in: baseNotifications.map((notification) => notification.id) },
          },
          select: { notificationKey: true },
        })
      : [];
    const readSet = new Set(readRows.map((row) => row.notificationKey));

    return baseNotifications.map((notification) => ({
      ...notification,
      unread: !readSet.has(notification.id),
    }));
  }

  private async getRelationshipMap(currentUserId: string | undefined, targetUserIds: string[]) {
    const map = new Map<string, { isFollowing: boolean; isFollowedBy: boolean; isFriend: boolean }>();

    for (const targetUserId of targetUserIds) {
      map.set(targetUserId, {
        isFollowing: false,
        isFollowedBy: false,
        isFriend: false,
      });
    }

    if (!currentUserId || targetUserIds.length === 0) {
      return map;
    }

    const [followingRows, followerRows] = await Promise.all([
      prisma.userFollow.findMany({
        where: {
          followerId: currentUserId,
          followingId: { in: targetUserIds },
        },
        select: { followingId: true },
      }),
      prisma.userFollow.findMany({
        where: {
          followerId: { in: targetUserIds },
          followingId: currentUserId,
        },
        select: { followerId: true },
      }),
    ]);

    const followingSet = new Set(followingRows.map((row) => row.followingId));
    const followerSet = new Set(followerRows.map((row) => row.followerId));

    for (const targetUserId of targetUserIds) {
      const isFollowing = followingSet.has(targetUserId);
      const isFollowedBy = followerSet.has(targetUserId);
      map.set(targetUserId, {
        isFollowing,
        isFollowedBy,
        isFriend: isFollowing && isFollowedBy,
      });
    }

    return map;
  }

  private async getRelationshipSnapshot(currentUserId: string | undefined | null, targetUserId: string) {
    if (!currentUserId || currentUserId === targetUserId) {
      return {
        isFollowing: false,
        isFollowedBy: false,
        isFriend: false,
      };
    }

    const relationMap = await this.getRelationshipMap(currentUserId, [targetUserId]);
    return relationMap.get(targetUserId) || {
      isFollowing: false,
      isFollowedBy: false,
      isFriend: false,
    };
  }
}

export const userController = new UserController();
