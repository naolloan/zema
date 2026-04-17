function artistSpotifyUrl(spotifyId: string | null | undefined) {
  return spotifyId ? `https://open.spotify.com/artist/${spotifyId}` : null;
}

function releaseSpotifyUrl(spotifyId: string | null | undefined) {
  return spotifyId ? `https://open.spotify.com/album/${spotifyId}` : null;
}

function trackSpotifyUrl(spotifyId: string | null | undefined) {
  return spotifyId ? `https://open.spotify.com/track/${spotifyId}` : null;
}

export const artistSummarySelect = {
  id: true,
  name: true,
  type: true,
  disambiguation: true,
  bio: true,
  spotifyPopularity: true,
  spotifyFollowers: true,
  spotifyGenres: true,
  wikidataId: true,
  wikipediaUrl: true,
  musicBrainzId: true,
  spotifyId: true,
};

export const artistCreditInclude: any = {
  artist: {
    select: artistSummarySelect,
  },
  orderBy: [{ position: 'asc' }, { id: 'asc' }],
};

export const releaseSummaryInclude: any = {
  artist: {
    select: artistSummarySelect,
  },
  artistCredits: {
    include: {
      artist: {
        select: artistSummarySelect,
      },
    },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
  },
  _count: {
    select: {
      ratings: true,
      reviews: true,
      diaryEntries: true,
      likes: true,
      listItems: true,
    },
  },
};

export const trackInclude: any = {
  release: {
    include: releaseSummaryInclude,
  },
  artistCredits: {
    include: {
      artist: {
        select: artistSummarySelect,
      },
    },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
  },
};

export const releaseDetailInclude: any = {
  ...releaseSummaryInclude,
  tracks: {
    include: {
      artistCredits: {
        include: {
          artist: {
            select: artistSummarySelect,
          },
        },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
      },
    },
    orderBy: [{ discNumber: 'asc' }, { trackNumber: 'asc' }, { title: 'asc' }],
  },
  _count: {
    select: {
      ratings: true,
      reviews: true,
      diaryEntries: true,
      likes: true,
    },
  },
};

export const listPreviewInclude: any = {
  user: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      createdAt: true,
    },
  },
  items: {
    take: 4,
    orderBy: { position: 'asc' },
    include: {
      release: {
        include: releaseSummaryInclude,
      },
    },
  },
  _count: {
    select: {
      items: true,
      likes: true,
    },
  },
};

export const reviewInclude: any = {
  user: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
    },
  },
  release: {
    include: releaseSummaryInclude,
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
};

export const trackReviewInclude: any = {
  user: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
    },
  },
  track: {
    include: trackInclude,
  },
};

export function serializeUserSummary(user: any) {
  if (!user) return user;

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName ?? null,
    avatarUrl: user.avatarUrl ?? null,
    commentPermission: user.commentPermission ?? undefined,
    bio: user.bio ?? null,
    createdAt: user.createdAt,
  };
}

export function serializeReviewComment(comment: any) {
  if (!comment) return comment;

  return {
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    user: serializeUserSummary(comment.user),
  };
}

export function serializeListComment(comment: any) {
  if (!comment) return comment;

  return {
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    user: serializeUserSummary(comment.user),
  };
}

export function serializeArtistSummary(artist: any) {
  if (!artist) return artist;

  return {
    ...artist,
    bio: artist.bio ?? null,
    spotifyPopularity: artist.spotifyPopularity ?? null,
    spotifyFollowers: artist.spotifyFollowers ?? null,
    spotifyGenres: artist.spotifyGenres ?? [],
    wikidataId: artist.wikidataId ?? null,
    wikipediaUrl: artist.wikipediaUrl ?? null,
    spotifyId: artist.spotifyId ?? null,
    spotifyUrl: artistSpotifyUrl(artist.spotifyId),
  };
}

export function serializeReleaseSummary(release: any) {
  if (!release) return release;

  return {
    id: release.id,
    title: release.title,
    type: release.type,
    releaseDate: release.releaseDate,
    disambiguation: release.disambiguation ?? null,
    artworkUrl: release.artworkUrl ?? null,
    description: release.description ?? null,
    label: release.label ?? null,
    copyrights: release.copyrights ?? [],
    spotifyPopularity: release.spotifyPopularity ?? null,
    wikidataId: release.wikidataId ?? null,
    wikipediaUrl: release.wikipediaUrl ?? null,
    musicBrainzId: release.musicBrainzId ?? null,
    spotifyId: release.spotifyId ?? null,
    spotifyUrl: releaseSpotifyUrl(release.spotifyId),
    createdAt: release.createdAt,
    updatedAt: release.updatedAt,
    artist: serializeArtistSummary(release.artist),
    artistCredits: (release.artistCredits ?? []).map((credit: any) => ({
      ...credit,
      artist: serializeArtistSummary(credit.artist),
    })),
    averageRating: release.averageRating,
    ratingCount: release.ratingCount,
  };
}

export function serializeTrack(track: any) {
  if (!track) return track;

  return {
    id: track.id,
    title: track.title,
    duration: track.duration ?? null,
    discNumber: track.discNumber ?? null,
    trackNumber: track.trackNumber ?? null,
    disambiguation: track.disambiguation ?? null,
    musicBrainzId: track.musicBrainzId ?? null,
    spotifyId: track.spotifyId ?? null,
    spotifyUrl: trackSpotifyUrl(track.spotifyId),
    createdAt: track.createdAt,
    updatedAt: track.updatedAt,
    release: track.release ? serializeReleaseSummary(track.release) : null,
    artistCredits: (track.artistCredits ?? []).map((credit: any) => ({
      ...credit,
      artist: serializeArtistSummary(credit.artist),
    })),
  };
}

export function serializeTrackDetail(track: any) {
  if (!track) return track;

  return {
    ...serializeTrack(track),
    averageRating: track.averageRating ?? 0,
    ratingCount: track.ratingCount ?? 0,
    counts: track.counts
      ? {
          ratings: track.counts.ratings ?? 0,
        }
      : undefined,
    ratingBreakdown: track.ratingBreakdown ?? undefined,
    userRating: track.userRating ?? null,
  };
}

export function serializeReleaseDetail(release: any) {
  if (!release) return release;

  const summary = serializeReleaseSummary(release);
  return {
    ...summary,
    tracks: (release.tracks ?? []).map(serializeTrack),
    counts: release._count
      ? {
          ratings: release._count.ratings ?? 0,
          reviews: release._count.reviews ?? 0,
          logs: release._count.diaryEntries ?? 0,
          likes: release._count.likes ?? 0,
          lists: release.listsCount ?? release._count.listItems ?? 0,
        }
      : undefined,
    ranking: release.ranking ?? null,
    ratingBreakdown: release.ratingBreakdown ?? undefined,
  };
}

export function serializeListSummary(list: any, isLiked = false) {
  if (!list) return list;

  return {
    id: list.id,
    title: list.title,
    description: list.description ?? null,
    category: list.category,
    isPublic: list.isPublic,
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
    user: serializeUserSummary(list.user),
    itemsCount: list._count?.items ?? list.itemsCount ?? 0,
    likesCount: list._count?.likes ?? list.likesCount ?? 0,
    isLiked,
    previewReleases: (list.items ?? [])
      .map((item: any) => item.release)
      .filter(Boolean)
      .map(serializeReleaseSummary),
  };
}

export function serializeReview(review: any, isLiked = false) {
  if (!review) return review;

  return {
    id: review.id,
    content: review.content,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    user: serializeUserSummary(review.user),
    release: review.release ? serializeReleaseSummary(review.release) : null,
    likesCount: review._count?.likes ?? review.likesCount ?? 0,
    isLiked,
    diaryEntryId: review.diaryEntryId ?? null,
    comments: (review.comments ?? []).map(serializeReviewComment),
  };
}

export function serializeTrackReview(review: any) {
  if (!review) return review;

  return {
    id: review.id,
    content: review.content,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    user: serializeUserSummary(review.user),
    track: review.track ? serializeTrack(review.track) : null,
  };
}
