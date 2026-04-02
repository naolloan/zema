import { Request, Response, NextFunction } from "express";
import { spotifyService } from "../services/spotifyService";
import { createError } from "../middleware/errorHandler";
import { prisma } from "../prisma";
import { trackInclude, serializeTrack } from "../utils/serializers";

class TrackController {
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

      let track = await prisma.track.findUnique({
        where: { id },
        include: trackInclude,
      });

      if (!track) {
        track = await prisma.track.findFirst({
          where: { spotifyId: id },
          include: trackInclude,
        });
      }

      if (!track && spotifyService.isConfigured()) {
        const spotifyTrack = await spotifyService.getTrackById(id);
        if (spotifyTrack) {
          track = await this.findOrCreateTrackFromSpotify(spotifyTrack);
        }
      }

      if (!track) {
        return next(createError("Track not found", 404));
      }

      res.json({ success: true, data: serializeTrack(track) });
    } catch (error) {
      next(error);
    }
  };

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
