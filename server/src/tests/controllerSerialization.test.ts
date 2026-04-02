import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseController } from '../controllers/releaseController';
import { chartController } from '../controllers/chartController';
import { artistController } from '../controllers/artistController';
import { listController } from '../controllers/listController';
import { searchController } from '../controllers/searchController';
import { reviewController } from '../controllers/reviewController';
import { ratingController } from '../controllers/ratingController';
import { userController } from '../controllers/userController';
import { diaryController } from '../controllers/diaryController';
import { prisma } from '../prisma';
import { spotifyService } from '../services/spotifyService';

type MockResponse = {
  statusCode: number;
  body: any;
  status: (code: number) => MockResponse;
  json: (payload: any) => MockResponse;
};

function createResponse(): MockResponse {
  return {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
}

function createNext() {
  const calls: any[] = [];
  const next = (error?: any) => {
    if (error) {
      calls.push(error);
    }
  };

  return { next, calls };
}

function createReleaseFixture(overrides: Record<string, any> = {}) {
  return {
    id: 'release-1',
    title: 'Midnight Signals',
    type: 'ALBUM',
    releaseDate: new Date('2024-01-01T00:00:00.000Z'),
    disambiguation: null,
    artworkUrl: 'https://example.com/cover.jpg',
    musicBrainzId: 'mb-release-1',
    createdAt: new Date('2024-01-10T00:00:00.000Z'),
    updatedAt: new Date('2024-01-11T00:00:00.000Z'),
    artist: {
      id: 'artist-main',
      name: 'Signal Bloom',
      type: 'INDIVIDUAL',
      musicBrainzId: 'mb-artist-main',
    },
    artistCredits: [
      {
        id: 'credit-1',
        role: 'MAIN_ARTIST',
        position: 1,
        artistId: 'artist-main',
        releaseId: 'release-1',
        trackId: null,
        artist: {
          id: 'artist-main',
          name: 'Signal Bloom',
          type: 'INDIVIDUAL',
          musicBrainzId: 'mb-artist-main',
        },
      },
      {
        id: 'credit-2',
        role: 'FEATURED_ARTIST',
        position: 2,
        artistId: 'artist-feature',
        releaseId: 'release-1',
        trackId: null,
        artist: {
          id: 'artist-feature',
          name: 'Night Static',
          type: 'GROUP',
          musicBrainzId: 'mb-artist-feature',
        },
      },
    ],
    ...overrides,
  };
}

function createTrackFixture(overrides: Record<string, any> = {}) {
  return {
    id: 'track-1',
    title: 'Northbound',
    duration: 245,
    trackNumber: 1,
    disambiguation: null,
    musicBrainzId: 'mb-track-1',
    createdAt: new Date('2024-01-10T00:00:00.000Z'),
    updatedAt: new Date('2024-01-11T00:00:00.000Z'),
    release: createReleaseFixture(),
    artistCredits: [
      {
        id: 'track-credit-1',
        role: 'MAIN_ARTIST',
        position: 1,
        artistId: 'artist-main',
        releaseId: null,
        trackId: 'track-1',
        artist: {
          id: 'artist-main',
          name: 'Signal Bloom',
          type: 'INDIVIDUAL',
          musicBrainzId: 'mb-artist-main',
        },
      },
    ],
    ...overrides,
  };
}

function createReviewFixture(overrides: Record<string, any> = {}) {
  return {
    id: 'review-1',
    content: 'This record grows more detailed every time I revisit it.',
    createdAt: new Date('2024-02-01T00:00:00.000Z'),
    updatedAt: new Date('2024-02-02T00:00:00.000Z'),
    diaryEntryId: 'diary-1',
    user: {
      id: 'user-2',
      username: 'listener',
      displayName: 'Daily Listener',
      avatarUrl: null,
    },
    release: createReleaseFixture(),
    _count: { likes: 3 },
    ...overrides,
  };
}

function resetPrismaMocks() {
  const prismaMock = prisma as any;
  prismaMock.release.findUnique = async () => null;
  prismaMock.rating.aggregate = async () => ({ _avg: { value: null }, _count: { value: 0 } });
  prismaMock.rating.findUnique = async () => null;
  prismaMock.favorite.findUnique = async () => null;
  prismaMock.review.findUnique = async () => null;
  prismaMock.review.findMany = async () => [];
  prismaMock.review.count = async () => 0;
  prismaMock.reviewLike.findUnique = async () => null;
  prismaMock.reviewLike.findMany = async () => [];
  prismaMock.diaryEntry.findMany = async () => [];
  prismaMock.diaryEntry.count = async () => 0;
  prismaMock.rating.groupBy = async () => [];
  prismaMock.release.findMany = async () => [];
  prismaMock.list.findMany = async () => [];
  prismaMock.list.count = async () => 0;
  prismaMock.artist.findMany = async () => [];
  prismaMock.artist.count = async () => 0;
  prismaMock.track.findMany = async () => [];
  prismaMock.track.count = async () => 0;
  prismaMock.artist.findUnique = async () => null;
  prismaMock.release.count = async () => 0;
  prismaMock.rating.findMany = async () => [];
  prismaMock.rating.count = async () => 0;
  spotifyService.isConfigured = () => false;
  spotifyService.searchArtists = async () => [];
  spotifyService.searchAlbums = async () => [];
  spotifyService.searchTracks = async () => [];
  spotifyService.getArtistById = async () => null;
  spotifyService.getAlbumById = async () => null;
  spotifyService.getTrackById = async () => null;
  spotifyService.getArtistAlbums = async () => [];
  spotifyService.getAlbumTracks = async () => [];
  prismaMock.$transaction = async (callback: (tx: any) => Promise<any>) => callback({
    release: { findUnique: async () => null },
    review: { findUnique: async () => null, create: async () => null },
    diaryEntry: { create: async () => null, findUnique: async () => null },
  });
}

test.beforeEach(() => {
  resetPrismaMocks();
});

test('getReleaseById returns normalized release details with artist and track credits', async () => {
  const prismaMock = prisma as any;
  const release = createReleaseFixture({
    tracks: [createTrackFixture()],
    _count: { ratings: 12, reviews: 4 },
  });

  prismaMock.release.findUnique = async () => release;
  prismaMock.rating.aggregate = async () => ({ _avg: { value: 4.6 }, _count: { value: 12 } });
  prismaMock.rating.findUnique = async () => ({ id: 'rating-1', value: 5 });
  prismaMock.releaseLike.findUnique = async () => ({ id: 'release-like-1' });

  const req: any = { params: { id: 'release-1' }, user: { id: 'user-1' } };
  const res = createResponse();
  const { next, calls } = createNext();

  await releaseController.getReleaseById(req, res as any, next as any);

  assert.equal(calls.length, 0);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.id, 'release-1');
  assert.equal(res.body.data.artistCredits.length, 2);
  assert.equal(res.body.data.artistCredits[1].artist.name, 'Night Static');
  assert.equal(res.body.data.tracks.length, 1);
  assert.equal(res.body.data.tracks[0].artistCredits[0].artist.name, 'Signal Bloom');
  assert.equal(res.body.data.averageRating, 4.6);
  assert.equal(res.body.data.ratingCount, 12);
  assert.deepEqual(res.body.data.userRating, { id: 'rating-1', value: 5 });
  assert.equal(res.body.data.isLiked, true);
  assert.deepEqual(res.body.data.counts, { ratings: 12, reviews: 4, logs: 0, likes: 0, lists: 0 });
});

test('getReviewById returns normalized review payload with liked state', async () => {
  const prismaMock = prisma as any;
  prismaMock.review.findUnique = async () => createReviewFixture();
  prismaMock.reviewLike.findUnique = async () => ({ id: 'like-1' });

  const req: any = { params: { id: 'review-1' }, user: { id: 'user-1' } };
  const res = createResponse();
  const { next, calls } = createNext();

  await reviewController.getReviewById(req, res as any, next as any);

  assert.equal(calls.length, 0);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.id, 'review-1');
  assert.equal(res.body.data.isLiked, true);
  assert.equal(res.body.data.likesCount, 3);
  assert.equal(res.body.data.diaryEntryId, 'diary-1');
  assert.equal(res.body.data.release.artistCredits[0].artist.name, 'Signal Bloom');
});

test('getUserReviews applies liked flags while preserving normalized release summaries', async () => {
  const prismaMock = prisma as any;
  prismaMock.review.findMany = async () => [createReviewFixture({ id: 'review-1' })];
  prismaMock.reviewLike.findMany = async () => [{ reviewId: 'review-1' }];
  prismaMock.review.count = async () => 1;

  const req: any = {
    params: { id: 'user-2' },
    query: { limit: '10', offset: '0' },
    user: { id: 'user-1' },
  };
  const res = createResponse();
  const { next, calls } = createNext();

  await userController.getUserReviews(req, res as any, next as any);

  assert.equal(calls.length, 0);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.data[0].isLiked, true);
  assert.equal(res.body.data[0].release.artistCredits.length, 2);
  assert.equal(res.body.pagination.total, 1);
  assert.equal(res.body.pagination.totalPages, 1);
});

test('createDiaryEntry creates a linked review and returns normalized nested payloads', async () => {
  const prismaMock = prisma as any;
  prismaMock.$transaction = async (callback: (tx: any) => Promise<any>) => callback({
    release: {
      findUnique: async ({ where }: any) => where.id === 'release-1' ? { id: 'release-1' } : null,
    },
    review: {
      findUnique: async () => null,
      create: async () => ({ id: 'review-1' }),
    },
    wantToHear: {
      deleteMany: async () => ({ count: 1 }),
    },
    diaryEntry: {
      create: async () => ({ id: 'diary-1' }),
      findUnique: async () => ({
        id: 'diary-1',
        listenedAt: new Date('2024-03-10T00:00:00.000Z'),
        notes: 'Late-night replay',
        release: createReleaseFixture(),
        review: createReviewFixture(),
      }),
    },
  });

  const req: any = {
    body: {
      releaseId: 'release-1',
      listenedAt: '2024-03-10T00:00:00.000Z',
      notes: 'Late-night replay',
      createReview: true,
      reviewContent: 'This record grows more detailed every time I revisit it.',
    },
    user: { id: 'user-1' },
  };
  const res = createResponse();
  const { next, calls } = createNext();

  await diaryController.createDiaryEntry(req, res as any, next as any);

  assert.equal(calls.length, 0);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.id, 'diary-1');
  assert.equal(res.body.data.release.artistCredits[1].artist.name, 'Night Static');
  assert.equal(res.body.data.review.id, 'review-1');
  assert.equal(res.body.data.review.diaryEntryId, 'diary-1');
  assert.equal(res.body.data.review.release.id, 'release-1');
});


test('getTopReleases returns ranked normalized release summaries with total chart size', async () => {
  const prismaMock = prisma as any;
  prismaMock.rating.groupBy = async () => [
    { releaseId: 'release-1', _avg: { value: 4.8 }, _count: { value: 10 } },
    { releaseId: 'release-2', _avg: { value: 4.7 }, _count: { value: 8 } },
  ];
  prismaMock.release.findMany = async ({ where }: any) =>
    where.id.in.map((id: string) =>
      createReleaseFixture({
        id,
        title: id === 'release-1' ? 'Midnight Signals' : 'Harbor Lights',
        musicBrainzId: `mb-${id}`,
      }),
    );

  const req: any = { query: { limit: '1', offset: '0', type: 'album' } };
  const res = createResponse();
  const { next, calls } = createNext();

  await chartController.getTopReleases(req, res as any, next as any);

  assert.equal(calls.length, 0);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.total, 2);
  assert.equal(res.body.data.type, 'ALBUM');
  assert.equal(res.body.data.items.length, 1);
  assert.equal(res.body.data.items[0].rank, 1);
  assert.equal(res.body.data.items[0].averageRating, 4.8);
  assert.equal(res.body.data.items[0].release.artistCredits.length, 2);
});

test('getUserLists enforces public-only filtering for other viewers', async () => {
  const prismaMock = prisma as any;
  let whereSeen: any = null;
  prismaMock.list.findMany = async (args: any) => {
    whereSeen = args.where;
    return [
      {
        id: 'list-1',
        title: 'Public Picks',
        description: null,
        category: 'MIXED',
        isPublic: true,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
        userId: 'user-2',
        user: { id: 'user-2', username: 'listener', displayName: 'Daily Listener' },
        _count: { items: 3 },
      },
    ];
  };
  prismaMock.list.count = async () => 1;

  const req: any = { params: { userId: 'user-2' }, query: { limit: '10', offset: '0' }, user: { id: 'user-1' } };
  const res = createResponse();
  const { next, calls } = createNext();

  await listController.getUserLists(req, res as any, next as any);

  assert.equal(calls.length, 0);
  assert.deepEqual(whereSeen, { userId: 'user-2', isPublic: true });
  assert.equal(res.body.data[0].itemsCount, 3);
  assert.equal(res.body.pagination.total, 1);
});

test('getListById returns normalized list item release summaries', async () => {
  const prismaMock = prisma as any;
  prismaMock.list.findUnique = async () => ({
    id: 'list-1',
    title: 'Essential Night Drives',
    description: null,
    category: 'MIXED',
    isPublic: true,
    userId: 'user-2',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    user: { id: 'user-2', username: 'listener', displayName: 'Daily Listener', avatarUrl: null, commentPermission: 'FOLLOWING' },
    _count: {
      likes: 0,
    },
    comments: [],
    items: [
      {
        id: 'item-1',
        listId: 'list-1',
        releaseId: 'release-1',
        position: 1,
        notes: null,
        release: createReleaseFixture(),
      },
    ],
  });
  prismaMock.listLike.findUnique = async () => null;

  const req: any = { params: { id: 'list-1' }, user: { id: 'user-1' } };
  const res = createResponse();
  const { next, calls } = createNext();

  await listController.getListById(req, res as any, next as any);

  assert.equal(calls.length, 0);
  assert.equal(res.body.data.itemsCount, 1);
  assert.equal(res.body.data.items[0].release.artistCredits.length, 2);
  assert.equal(res.body.data.items[0].release.artist.name, 'Signal Bloom');
});

test('globalSearch returns normalized release and track results', async () => {
  const prismaMock = prisma as any;
  prismaMock.artist.findMany = async () => [];
  prismaMock.artist.count = async () => 0;
  prismaMock.release.findMany = async () => [createReleaseFixture()];
  prismaMock.release.count = async () => 1;
  prismaMock.track.findMany = async () => [createTrackFixture()];
  prismaMock.track.count = async () => 1;

  const req: any = { query: { q: 'signal', type: 'all', limit: '10', offset: '0' } };
  const res = createResponse();
  const { next, calls } = createNext();

  await searchController.globalSearch(req, res as any, next as any);

  assert.equal(calls.length, 0);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.releases[0].artistCredits.length, 2);
  assert.equal(res.body.data.tracks[0].artistCredits[0].artist.name, 'Signal Bloom');
  assert.equal(res.body.data.tracks[0].release.id, 'release-1');
});


test('getArtistById returns normalized collaborative releases with counts', async () => {
  const prismaMock = prisma as any;
  prismaMock.artist.findUnique = async ({ where }: any) => {
    if (where.id === 'artist-main') {
      return {
        id: 'artist-main',
        musicBrainzId: 'mb-artist-main',
        name: 'Signal Bloom',
        type: 'INDIVIDUAL',
        disambiguation: null,
        bio: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      };
    }
    return null;
  };
  prismaMock.release.findMany = async () => [
    createReleaseFixture({
      tracks: [createTrackFixture()],
      _count: { ratings: 7, reviews: 2 },
    }),
  ];
  prismaMock.release.count = async () => 1;
  prismaMock.rating.groupBy = async () => [
    { releaseId: 'release-1', _avg: { value: 4.4 }, _count: { value: 7 } },
  ];

  const req: any = { params: { id: 'artist-main' } };
  const res = createResponse();
  const { next, calls } = createNext();

  await artistController.getArtistById(req, res as any, next as any);

  assert.equal(calls.length, 0);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.name, 'Signal Bloom');
  assert.equal(res.body.data.releaseCount, 1);
  assert.equal(res.body.data.releases.length, 1);
  assert.equal(res.body.data.releases[0].artistCredits.length, 2);
  assert.equal(res.body.data.releases[0].tracks[0].artistCredits[0].artist.name, 'Signal Bloom');
  assert.equal(res.body.data.releases[0].averageRating, 4.4);
  assert.deepEqual(res.body.data.releases[0].counts, { ratings: 7, reviews: 2, logs: 0, likes: 0, lists: 0 });
});

test('getArtistReleases returns paginated normalized release details', async () => {
  const prismaMock = prisma as any;
  prismaMock.artist.findUnique = async () => ({ id: 'artist-main' });
  prismaMock.release.findMany = async () => [
    createReleaseFixture({
      id: 'release-2',
      title: 'Harbor Lights',
      tracks: [],
      _count: { ratings: 3, reviews: 1 },
    }),
  ];
  prismaMock.release.count = async () => 1;
  prismaMock.rating.groupBy = async () => [
    { releaseId: 'release-2', _avg: { value: 4.0 }, _count: { value: 3 } },
  ];

  const req: any = { params: { id: 'artist-main' }, query: { limit: '20', offset: '0' } };
  const res = createResponse();
  const { next, calls } = createNext();

  await artistController.getArtistReleases(req, res as any, next as any);

  assert.equal(calls.length, 0);
  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.data[0].id, 'release-2');
  assert.equal(res.body.data[0].artistCredits[1].artist.name, 'Night Static');
  assert.equal(res.body.pagination.total, 1);
});

test('getUserRatings returns normalized release summaries for each rating', async () => {
  const prismaMock = prisma as any;
  prismaMock.rating.findMany = async () => [
    {
      id: 'rating-1',
      value: 5,
      createdAt: new Date('2024-02-01T00:00:00.000Z'),
      updatedAt: new Date('2024-02-02T00:00:00.000Z'),
      userId: 'user-1',
      releaseId: 'release-1',
      release: createReleaseFixture({ averageRating: 4.6, ratingCount: 12 }),
    },
  ];
  prismaMock.rating.count = async () => 1;

  const req: any = { user: { id: 'user-1' }, query: { limit: '20', offset: '0' } };
  const res = createResponse();
  const { next, calls } = createNext();

  await ratingController.getUserRatings(req, res as any, next as any);

  assert.equal(calls.length, 0);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.data[0].value, 5);
  assert.equal(res.body.data[0].release.artistCredits.length, 2);
  assert.equal(res.body.data[0].release.artist.name, 'Signal Bloom');
  assert.equal(res.body.pagination.total, 1);
});


test('getRecentReviews returns normalized community review feed with liked state', async () => {
  const prismaMock = prisma as any;
  prismaMock.review.findMany = async () => [createReviewFixture({ id: 'review-1' })];
  prismaMock.reviewLike.findMany = async () => [{ reviewId: 'review-1' }];
  prismaMock.review.count = async () => 1;

  const req: any = {
    query: { limit: '12', offset: '0' },
    user: { id: 'user-1' },
  };
  const res = createResponse();
  const { next, calls } = createNext();

  await reviewController.getRecentReviews(req, res as any, next as any);

  assert.equal(calls.length, 0);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.data[0].isLiked, true);
  assert.equal(res.body.data[0].release.artistCredits[0].artist.name, 'Signal Bloom');
  assert.equal(res.body.pagination.total, 1);
});

test('getRecentDiaryEntries returns normalized community diary feed', async () => {
  const prismaMock = prisma as any;
  prismaMock.diaryEntry.findMany = async () => [{
    id: 'diary-1',
    listenedAt: new Date('2024-03-10T00:00:00.000Z'),
    notes: 'Late-night replay',
    release: createReleaseFixture(),
    review: createReviewFixture(),
  }];
  prismaMock.diaryEntry.count = async () => 1;

  const req: any = {
    query: { limit: '12', offset: '0' },
    user: { id: 'user-1' },
  };
  const res = createResponse();
  const { next, calls } = createNext();

  await diaryController.getRecentDiaryEntries(req, res as any, next as any);

  assert.equal(calls.length, 0);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.data[0].release.artistCredits[1].artist.name, 'Night Static');
  assert.equal(res.body.data[0].review.diaryEntryId, 'diary-1');
  assert.equal(res.body.pagination.total, 1);
});


test('getReleaseReviews supports sorting and diary-linked filtering', async () => {
  const prismaMock = prisma as any;
  let capturedFindMany: any = null;
  let capturedCount: any = null;
  prismaMock.release.findUnique = async () => ({ id: 'release-1' });
  prismaMock.review.findMany = async (args: any) => {
    capturedFindMany = args;
    return [createReviewFixture({ id: 'review-1' })];
  };
  prismaMock.review.count = async (args: any) => {
    capturedCount = args;
    return 1;
  };
  prismaMock.reviewLike.findMany = async () => [{ reviewId: 'review-1' }];

  const req: any = {
    params: { id: 'release-1' },
    query: { limit: '10', offset: '0', sort: 'popular', filter: 'diary' },
    user: { id: 'user-1' },
  };
  const res = createResponse();
  const { next, calls } = createNext();

  await releaseController.getReleaseReviews(req, res as any, next as any);

  assert.equal(calls.length, 0);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.data[0].isLiked, true);
  assert.deepEqual(capturedFindMany.where, { releaseId: 'release-1', diaryEntryId: { not: null } });
  assert.deepEqual(capturedCount.where, { releaseId: 'release-1', diaryEntryId: { not: null } });
  assert.deepEqual(capturedFindMany.orderBy, [{ likes: { _count: 'desc' } }, { createdAt: 'desc' }]);
});
