import { Request, Response, NextFunction } from "express";
import { spotifyService } from "../services/spotifyService";
import { createError } from "../middleware/errorHandler";
import { prisma } from "../prisma";
import { AuthRequest } from "../middleware/auth";
import { trackInclude, trackReviewInclude, serializeTrack, serializeTrackDetail, serializeTrackReview } from "../utils/serializers";

const TRACK_RATING_VALUES = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

class TrackController {
  getTrackReviews = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { limit = "12", offset = "0" } = req.query;

      const track = await this.findTrackRecord(id);
      if (!track) {
        return next(createError("Track not found", 404));
      }

      const parsedLimit = Math.min(parseInt(limit as string, 10) || 12, 50);
      const parsedOffset = parseInt(offset as string, 10) || 0;

      const [reviews, total] = await Promise.all([
        prisma.trackReview.findMany({
          where: { trackId: track.id },
          include: trackReviewInclude,
          orderBy: { createdAt: "desc" },
          take: parsedLimit,
          skip: parsedOffset,
        }),
        prisma.trackReview.count({
          where: { trackId: track.id },
        }),
      ]);

      res.json({
        success: true,
        data: reviews.map(serializeTrackReview),
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

  createTrackReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthRequest).user?.id;
      const { id } = req.params;
      const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";

      if (!userId) {
        return next(createError("Access token required", 401));
      }

      if (!content) {
        return next(createError("Content is required", 400));
      }

      const track = await this.findTrackRecord(id);
      if (!track) {
        return next(createError("Track not found", 404));
      }

      const existingReview = await prisma.trackReview.findUnique({
        where: {
          userId_trackId: {
            userId,
            trackId: track.id,
          },
        },
      });

      if (existingReview) {
        return next(createError("You have already reviewed this track", 409));
      }

      const review = await prisma.trackReview.create({
        data: {
          userId,
          trackId: track.id,
          content,
        },
        include: trackReviewInclude,
      });

      res.status(201).json({
        success: true,
        data: serializeTrackReview(review),
      });
    } catch (error) {
      next(error);
    }
  };

  updateTrackReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reviewId } = req.params;
      const userId = (req as AuthRequest).user?.id;
      const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";

      if (!userId) {
        return next(createError("Access token required", 401));
      }

      if (!content) {
        return next(createError("Content is required", 400));
      }

      const review = await prisma.trackReview.findUnique({
        where: { id: reviewId },
      });

      if (!review) {
        return next(createError("Track review not found", 404));
      }

      if (review.userId !== userId) {
        return next(createError("You can only update your own track reviews", 403));
      }

      const updated = await prisma.trackReview.update({
        where: { id: reviewId },
        data: { content },
        include: trackReviewInclude,
      });

      res.json({
        success: true,
        data: serializeTrackReview(updated),
      });
    } catch (error) {
      next(error);
    }
  };

  deleteTrackReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reviewId } = req.params;
      const userId = (req as AuthRequest).user?.id;

      if (!userId) {
        return next(createError("Access token required", 401));
      }

      const review = await prisma.trackReview.findUnique({
        where: { id: reviewId },
      });

      if (!review) {
        return next(createError("Track review not found", 404));
      }

      if (review.userId !== userId) {
        return next(createError("You can only delete your own track reviews", 403));
      }

      await prisma.trackReview.delete({
        where: { id: reviewId },
      });

      res.json({ success: true, message: "Track review deleted successfully" });
    } catch (error) {
      next(error);
    }
  };

  rateTrack = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthRequest).user?.id;
      const { id } = req.params;
      const value = Number(req.body?.value);

      if (!userId) {
        return next(createError("Access token required", 401));
      }

      if (!TRACK_RATING_VALUES.includes(value)) {
        return next(createError("Track ratings must be between 0.5 and 5 in half-step increments", 400));
      }

      const track = await this.findTrackRecord(id);
      if (!track) {
        return next(createError("Track not found", 404));
      }

      const rating = await prisma.trackRating.upsert({
        where: {
          userId_trackId: {
            userId,
            trackId: track.id,
          },
        },
        update: { value },
        create: {
          userId,
          trackId: track.id,
          value,
        },
      });

      res.json({ success: true, data: rating });
    } catch (error) {
      next(error);
    }
  };

  removeTrackRating = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthRequest).user?.id;
      const { id } = req.params;

      if (!userId) {
        return next(createError("Access token required", 401));
      }

      const track = await this.findTrackRecord(id);
      if (!track) {
        return next(createError("Track not found", 404));
      }

      await prisma.trackRating.deleteMany({
        where: {
          userId,
          trackId: track.id,
        },
      });

      res.json({ success: true, message: "Track rating removed" });
    } catch (error) {
      next(error);
    }
  };

  searchTracks = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q: query, limit = "10" } = req.query;
      if (!query || typeof query !== "string") {
        return next(createError("Search query is required", 400));
      }

      const searchLimit = Math.min(parseInt(limit as string, 10), 50);
      const localTracks = await prisma.track.findMany({
        where: {
          title: {
            contains: query,
            mode: "insensitive",
          },
        },
        include: trackInclude,
        take: searchLimit,
        orderBy: { title: "asc" },
      });

      if (localTracks.length >= searchLimit || !spotifyService.isConfigured()) {
        return res.json({ success: true, data: localTracks.map(serializeTrack) });
      }

      const spotifyResults = await spotifyService.searchTracks(query, searchLimit - localTracks.length);
      const hydratedTracks: any[] = [];

      for (const spotifyTrack of spotifyResults) {
        const track = await this.findOrCreateTrackFromSpotify(spotifyTrack);
        if (track && !localTracks.some((localTrack) => localTrack.id === track.id)) {
          hydratedTracks.push(track);
        }
      }

      res.json({
        success: true,
        data: [...localTracks, ...hydratedTracks].slice(0, searchLimit).map(serializeTrack),
      });
    } catch (error) {
      next(error);
    }
  };

  getTrackById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = (req as AuthRequest).user?.id;

      let track = await this.findTrackRecord(id, trackInclude);

      if (!track && spotifyService.isConfigured()) {
        const spotifyTrack = await spotifyService.getTrackById(id);
        if (spotifyTrack) {
          track = await this.findOrCreateTrackFromSpotify(spotifyTrack);
        }
      }

      if (!track) {
        return next(createError("Track not found", 404));
      }

      const detail = await this.buildTrackDetail(track.id, userId);

      res.json({ success: true, data: serializeTrackDetail(detail) });
    } catch (error) {
      next(error);
    }
  };

  private async buildTrackDetail(trackId: string, userId?: string) {
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: trackInclude,
    });

    if (!track) {
      throw createError("Track not found", 404);
    }

    const [aggregate, ratings, userRating] = await Promise.all([
      prisma.trackRating.aggregate({
        where: { trackId },
        _avg: { value: true },
        _count: { _all: true },
      }),
      prisma.trackRating.findMany({
        where: { trackId },
        select: { value: true },
      }),
      userId
        ? prisma.trackRating.findUnique({
            where: {
              userId_trackId: {
                userId,
                trackId,
              },
            },
            select: { id: true, value: true },
          })
        : Promise.resolve(null),
    ]);

    const histogram = TRACK_RATING_VALUES.map((bucketValue) => ({
      value: bucketValue,
      count: ratings.filter((rating) => rating.value === bucketValue).length,
    }));

    return {
      ...track,
      averageRating: aggregate._avg.value ?? 0,
      ratingCount: aggregate._count._all ?? 0,
      counts: {
        ratings: aggregate._count._all ?? 0,
      },
      ratingBreakdown: {
        average: aggregate._avg.value ?? 0,
        total: aggregate._count._all ?? 0,
        histogram,
      },
      userRating,
    };
  }

  private async findTrackRecord(id: string, include: any = undefined) {
    const args = include ? { include } : {};
    let track = await prisma.track.findUnique({
      where: { id },
      ...args,
    } as any);

    if (!track) {
      track = await prisma.track.findFirst({
        where: { spotifyId: id },
        ...args,
      } as any);
    }

    return track;
  }

  private async findOrCreateSpotifyArtist(spotifyArtist: { id: string; name: string }) {
    let artist = await prisma.artist.findFirst({ where: { spotifyId: spotifyArtist.id } });
    if (!artist) {
      artist = await prisma.artist.create({
        data: {
          spotifyId: spotifyArtist.id,
          name: spotifyArtist.name,
          type: "INDIVIDUAL",
        },
      });
    }
    return artist;
  }

  private mapSpotifyReleaseType(albumType: string | null | undefined, title: string) {
    const normalizedTitle = (title || "").toLowerCase();
    if (normalizedTitle.includes("mixtape")) {
      return "MIXTAPE" as const;
    }

    if ((albumType || "").toLowerCase() === "single") {
      return "SINGLE" as const;
    }

    return "ALBUM" as const;
  }

  private parseDate(value: string | null | undefined) {
    if (!value) return null;
    if (/^\d{4}$/.test(value)) {
      return new Date(value + "-01-01T00:00:00.000Z");
    }
    if (/^\d{4}-\d{2}$/.test(value)) {
      return new Date(value + "-01T00:00:00.000Z");
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private async findOrCreateReleaseFromSpotify(album: any) {
    const existingRelease = await prisma.release.findFirst({
      where: { spotifyId: album.id },
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
            role: index === 0 ? "MAIN_ARTIST" : "FEATURED_ARTIST",
            joinPhrase: null,
            position: index + 1,
          })),
        },
      },
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
    if (credits.length === 0) {
      return null;
    }

    const createdArtists = await Promise.all(credits.map((credit: any) => this.findOrCreateSpotifyArtist(credit)));

    let releaseId: string | null = null;
    if (spotifyTrack.album?.id) {
      const albumRelease = await this.findOrCreateReleaseFromSpotify({
        id: spotifyTrack.album.id,
        name: spotifyTrack.album.name,
        album_type: spotifyTrack.album.album_type || "album",
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
            role: index === 0 ? "MAIN_ARTIST" : "FEATURED_ARTIST",
            joinPhrase: null,
            position: index + 1,
          })),
        },
      },
      include: trackInclude,
    });
  }
}

export const trackController = new TrackController();
