'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Activity, Heart, MessageCircle, Star, UserPlus } from 'lucide-react'
import { BrandLoader } from '@/components/brand/brand-logo'
import { getFollowers, getFollowing, getUserDiary, getUserLists, getUserProfile, getUserReleaseLikes, getUserReviews, getUserWantToHear } from '@/lib/auth-api'
import { ListCard } from '@/components/lists/list-card'
import { ListLikeButton } from '@/components/lists/list-like-button'
import { FollowButton } from '@/components/profile/follow-button'
import { UserAvatar } from '@/components/profile/user-avatar'
import { formatDate, truncateText } from '@/lib/utils'
import { CoverArt } from '@/components/music/cover-art'
import { ArtistCreditLine } from '@/components/music/artist-credit-line'
import { ReviewCard } from '@/components/music/review-card'
import type { DiaryEntry, LikedReleaseItem, List, Profile, Review, User, WantToHearItem } from '@/types'
import { useAuthStore } from '@/store/auth-store'

type ProfileTab = 'profile' | 'activity' | 'network' | 'logged' | 'reviewed' | 'liked' | 'want' | 'diary' | 'lists'

const tabs: Array<{ id: ProfileTab; label: string }> = [
  { id: 'profile', label: 'Profile' },
  { id: 'activity', label: 'Activity' },
  { id: 'network', label: 'Network' },
  { id: 'logged', label: 'Logged' },
  { id: 'reviewed', label: 'Reviewed' },
  { id: 'liked', label: 'Liked' },
  { id: 'want', label: 'Want to Hear' },
  { id: 'diary', label: 'Diary' },
  { id: 'lists', label: 'Lists' },
]

type ActivityItem =
  | { type: 'follow'; text: string; meta: string }
  | { type: 'like'; text: string; meta: string }
  | { type: 'comment'; text: string; meta: string }
  | { type: 'log'; text: string; meta: string }

export default function PublicUserPage() {
  const params = useParams<{ id: string }>()
  const { user, hydrated, hydrate } = useAuthStore((state) => ({
    user: state.user,
    hydrated: state.hydrated,
    hydrate: state.hydrate,
  }))
  const [selectedTab, setSelectedTab] = useState<ProfileTab>('profile')
  const [releaseSort, setReleaseSort] = useState<'recent' | 'title' | 'type'>('recent')
  const [reviewSort, setReviewSort] = useState<'recent' | 'popular' | 'title'>('recent')
  const [networkSort, setNetworkSort] = useState<'recent' | 'name'>('recent')
  const [listSort, setListSort] = useState<'recent' | 'title' | 'size'>('recent')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [lists, setLists] = useState<List[]>([])
  const [diary, setDiary] = useState<DiaryEntry[]>([])
  const [followers, setFollowers] = useState<User[]>([])
  const [following, setFollowing] = useState<User[]>([])
  const [wantToHear, setWantToHear] = useState<WantToHearItem[]>([])
  const [likedReleases, setLikedReleases] = useState<LikedReleaseItem[]>([])
  const [reviewsTotal, setReviewsTotal] = useState(0)
  const [loadingMoreReviews, setLoadingMoreReviews] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!hydrated) {
      hydrate()
    }
  }, [hydrate, hydrated])

  useEffect(() => {
    async function loadUserPage() {
      if (!params?.id) {
        return
      }

      setLoading(true)
      try {
        const [profileData, reviewData, listData, diaryData, followerData, followingData, wantToHearData, likedReleaseData] = await Promise.all([
          getUserProfile(params.id),
          getUserReviews(params.id, 6, 0),
          getUserLists(params.id, 6),
          getUserDiary(params.id, 5, 0),
          getFollowers(params.id, 8, 0),
          getFollowing(params.id, 8, 0),
          getUserWantToHear(params.id, 6, 0),
          getUserReleaseLikes(params.id, 12, 0),
        ])

        setProfile(profileData)
        setReviews(reviewData.data)
        setReviewsTotal(reviewData.pagination.total)
        setLists(listData.data)
        setDiary(diaryData.data)
        setFollowers(followerData.data)
        setFollowing(followingData.data)
        setWantToHear(wantToHearData.data)
        setLikedReleases(likedReleaseData.data)
      } catch {
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    loadUserPage()
  }, [params?.id])

  const favoriteAlbumReleases = useMemo(() => (profile?.favoriteAlbums ?? []).map((favorite) => favorite.release), [profile?.favoriteAlbums])
  const favoriteSongReleases = useMemo(() => (profile?.favoriteSongs ?? []).map((favorite) => favorite.release), [profile?.favoriteSongs])
  const favoriteArtists = useMemo(() => (profile?.favoriteArtists ?? []).map((favorite) => favorite.artist), [profile?.favoriteArtists])

  const loggedReleases = useMemo(
    () =>
      diary
        .map((entry) => entry.release)
        .filter((release, index, current) => current.findIndex((item) => item.id === release.id) === index)
        .slice(0, 6),
    [diary],
  )

  const reviewedReleases = useMemo(
    () =>
      reviews
        .map((review) => review.release)
        .filter((release, index, current) => current.findIndex((item) => item.id === release.id) === index)
        .slice(0, 6),
    [reviews],
  )

  const wantedReleases = useMemo(() => wantToHear.map((item) => item.release), [wantToHear])
  const likedReleaseShelf = useMemo(() => likedReleases.map((item) => item.release), [likedReleases])

  const mutuals = useMemo(() => {
    const followerIds = new Set(followers.map((entry) => entry.id))
    return following.filter((entry) => followerIds.has(entry.id))
  }, [followers, following])

  const activityItems = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = []

    followers.slice(0, 2).forEach((follower) => {
      items.push({
        type: 'follow',
        text: `${follower.displayName || follower.username} followed this profile`,
        meta: `@${follower.username}`,
      })
    })

    reviews.slice(0, 3).forEach((review) => {
      if (review.likesCount > 0) {
        items.push({
          type: 'like',
          text: `${review.likesCount} like${review.likesCount === 1 ? '' : 's'} on ${review.release.title}`,
          meta: formatDate(review.createdAt),
        })
      }

      if (review.comments.length > 0) {
        items.push({
          type: 'comment',
          text: `${review.comments.length} comment${review.comments.length === 1 ? '' : 's'} on ${review.release.title}`,
          meta: formatDate(review.createdAt),
        })
      }
    })

    diary.slice(0, 2).forEach((entry) => {
      items.push({
        type: 'log',
        text: `Logged ${entry.release.title}`,
        meta: formatDate(entry.listenedAt),
      })
    })

    return items.slice(0, 6)
  }, [diary, followers, reviews])

  const sortedLoggedReleases = useMemo(() => sortReleases(loggedReleases, releaseSort), [loggedReleases, releaseSort])
  const sortedReviewedReleases = useMemo(() => sortReleases(reviewedReleases, releaseSort), [reviewedReleases, releaseSort])
  const sortedFavoriteAlbumReleases = useMemo(() => sortReleases(favoriteAlbumReleases, releaseSort), [favoriteAlbumReleases, releaseSort])
  const sortedFavoriteSongReleases = useMemo(() => sortReleases(favoriteSongReleases, releaseSort), [favoriteSongReleases, releaseSort])
  const sortedLikedReleases = useMemo(() => sortReleases(likedReleaseShelf, releaseSort), [likedReleaseShelf, releaseSort])
  const sortedWantedReleases = useMemo(() => sortReleases(wantedReleases, releaseSort), [wantedReleases, releaseSort])
  const sortedReviews = useMemo(() => sortReviews(reviews, reviewSort), [reviews, reviewSort])
  const sortedMutuals = useMemo(() => sortUsers(mutuals, networkSort), [mutuals, networkSort])
  const sortedFollowing = useMemo(() => sortUsers(following, networkSort), [following, networkSort])
  const sortedLists = useMemo(() => sortLists(lists, listSort), [lists, listSort])

  async function handleLoadMoreReviews() {
    if (!params?.id) return
    setLoadingMoreReviews(true)
    const reviewData = await getUserReviews(params.id, 6, reviews.length)
    if (reviewData.data.length) {
      setReviews((current) => [...current, ...reviewData.data])
      setReviewsTotal(reviewData.pagination.total)
    }
    setLoadingMoreReviews(false)
  }

  function handleReviewChange(nextReview: Review) {
    setReviews((current) => current.map((review) => (review.id === nextReview.id ? nextReview : review)))
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 py-10 text-white/70">
        <BrandLoader className="h-5 w-auto" />
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-white">
          <h1 className="text-3xl font-semibold">Profile not found</h1>
          <p className="mt-3 text-white/64">This listener may have changed their account or the profile link is no longer valid.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[1.7rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,22,31,0.96),rgba(16,19,27,0.88))] p-6 shadow-[0_22px_60px_rgba(0,0,0,0.28)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-5">
            <UserAvatar user={profile} className="h-20 w-20 border border-white/14" textClassName="text-2xl" />
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold text-white">{profile.displayName || profile.username}</h1>
                {user && user.id !== profile.id ? (
                  <FollowButton
                    userId={profile.id}
                    initialIsFollowing={Boolean(profile.isFollowing)}
                    onRelationshipChange={(next) => {
                      setProfile((current) =>
                        current
                          ? {
                              ...current,
                              ...next,
                              counts: {
                                followers: Math.max(0, (current.counts?.followers || 0) + (next.isFollowing === current.isFollowing ? 0 : next.isFollowing ? 1 : -1)),
                                following: current.counts?.following || 0,
                              },
                            }
                          : current
                      )
                    }}
                  />
                ) : null}
              </div>
              <p className="mt-2 text-sm uppercase tracking-[0.2em] text-white/45">@{profile.username}</p>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70">
                {profile.bio || 'This listener has not added a bio yet, but their recent listening and lists still tell the story.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-6">
            <ProfileStat label="Logged" value={profile._count.diaryEntries} onClick={() => setSelectedTab('logged')} />
            <ProfileStat label="Reviews" value={profile._count.reviews} onClick={() => setSelectedTab('reviewed')} />
            <ProfileStat label="Lists" value={profile._count.lists} onClick={() => setSelectedTab('lists')} />
            <ProfileStat label="Want To Hear" value={profile._count.wantToHear} onClick={() => setSelectedTab('want')} />
            <ProfileStat label="Following" value={profile.counts?.following || 0} href={`/users/${profile.id}/following`} />
            <ProfileStat label="Followers" value={profile.counts?.followers || 0} href={`/users/${profile.id}/followers`} />
          </div>
        </div>
      </section>

      <nav className="overflow-x-auto rounded-[1.2rem] border border-white/10 bg-[#11161f] px-3 py-3">
        <div className="flex min-w-max items-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedTab(tab.id)}
              className={selectedTab === tab.id ? 'rounded-full bg-[#f4d35e] px-4 py-2 text-sm font-semibold text-[#111318]' : 'rounded-full px-4 py-2 text-sm font-medium text-white/68 transition hover:bg-white/[0.06] hover:text-white'}
            >
              {tab.label}
            </button>
          ))}
          <Link href={`/users/${profile.id}/followers`} className="ml-auto rounded-full px-4 py-2 text-sm font-medium text-[#8ecae6] transition hover:bg-white/[0.06]">
            Followers
          </Link>
        </div>
      </nav>

      {selectedTab === 'profile' ? (
        <div className="space-y-8">
          <ContentSection label="Favorite Albums" title="Their cornerstone projects">
            <ReleaseStrip releases={sortedFavoriteAlbumReleases} emptyLabel="This listener has not selected favorite albums yet." />
          </ContentSection>
          <ContentSection label="Favorite Songs" title="Their signature songs">
            <ReleaseStrip releases={sortedFavoriteSongReleases} emptyLabel="This listener has not selected favorite songs yet." />
          </ContentSection>
          <ContentSection label="Favorite Artists" title="The names at the center of their taste">
            <ArtistStrip artists={favoriteArtists} emptyLabel="This listener has not selected favorite artists yet." />
          </ContentSection>
        </div>
      ) : null}

      {selectedTab === 'activity' ? (
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <ContentSection label="Recent Activity" title="What they have been around lately">
            <ReleaseStrip releases={loggedReleases.length ? loggedReleases : reviewedReleases} emptyLabel="Activity posters will show up here once logging and reviewing starts." />
          </ContentSection>
          <section className="rounded-[1.35rem] border border-white/10 bg-[#101720] p-5">
            <ContentSection label="Activity Feed" title="Likes, comments, and follows">
              <div className="mt-4 space-y-3">
                {activityItems.length ? activityItems.map((item, index) => <ActivityRow key={`${item.type}-${index}`} item={item} />) : <p className="text-sm text-white/60">Activity will collect here once people start interacting with this profile and its reviews.</p>}
              </div>
            </ContentSection>
          </section>
        </div>
      ) : null}

      {selectedTab === 'network' ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <section className="rounded-[1.35rem] border border-white/10 bg-[#101720] p-5">
            <ContentSection label="Mutuals" title="People they follow back">
              <SortSelect
                value={networkSort}
                onChange={setNetworkSort}
                options={[
                  { value: 'recent', label: 'Most recent' },
                  { value: 'name', label: 'Name' },
                ]}
              />
              <UserGrid users={sortedMutuals} emptyLabel="Mutual follows will appear here as this network grows." />
            </ContentSection>
          </section>
          <section className="rounded-[1.35rem] border border-white/10 bg-[#101720] p-5">
            <ContentSection label="Recent Follows" title="Latest people in their orbit">
              <SortSelect
                value={networkSort}
                onChange={setNetworkSort}
                options={[
                  { value: 'recent', label: 'Most recent' },
                  { value: 'name', label: 'Name' },
                ]}
              />
              <UserGrid users={sortedFollowing} emptyLabel="The people they follow will appear here." />
            </ContentSection>
          </section>
        </div>
      ) : null}

      {selectedTab === 'logged' ? (
        <ContentSection label="Logged Releases" title="Records in their diary">
          <SortSelect
            value={releaseSort}
            onChange={setReleaseSort}
            options={[
              { value: 'recent', label: 'Most recent' },
              { value: 'title', label: 'Title' },
              { value: 'type', label: 'Type' },
            ]}
          />
          <ReleaseStrip releases={sortedLoggedReleases} emptyLabel="Logged releases will appear here once diary activity starts." />
        </ContentSection>
      ) : null}

      {selectedTab === 'reviewed' ? (
        <div className="space-y-8">
          <ContentSection label="Reviewed Releases" title="Records they wrote about">
            <SortSelect
              value={releaseSort}
              onChange={setReleaseSort}
              options={[
                { value: 'recent', label: 'Most recent' },
                { value: 'title', label: 'Title' },
                { value: 'type', label: 'Type' },
              ]}
            />
            <ReleaseStrip releases={sortedReviewedReleases} emptyLabel="Reviewed releases will collect here once reviews are written." />
          </ContentSection>
          <ContentSection label="Recent Reviews" title="What they wrote">
            <SortSelect
              value={reviewSort}
              onChange={setReviewSort}
              options={[
                { value: 'recent', label: 'Most recent' },
                { value: 'popular', label: 'Most liked' },
                { value: 'title', label: 'Release title' },
              ]}
            />
            <div className="mt-4 space-y-4">
              {sortedReviews.length ? sortedReviews.map((review) => <ReviewCard key={review.id} review={review} onReviewChange={handleReviewChange} />) : <EmptyCard text="No reviews yet." />}
            </div>
            {reviews.length < reviewsTotal ? (
              <button type="button" onClick={handleLoadMoreReviews} disabled={loadingMoreReviews} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#f4d35e] px-5 py-3 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082] disabled:opacity-70">
                {loadingMoreReviews ? <BrandLoader className="h-4 w-auto" /> : null}
                Load more reviews
              </button>
            ) : null}
          </ContentSection>
        </div>
      ) : null}

      {selectedTab === 'liked' ? (
        <ContentSection label="Liked Releases" title="The releases they hearted">
          <SortSelect
            value={releaseSort}
            onChange={setReleaseSort}
            options={[
              { value: 'recent', label: 'Most recent' },
              { value: 'title', label: 'Title' },
              { value: 'type', label: 'Type' },
            ]}
          />
          <ReleaseStrip releases={sortedLikedReleases} emptyLabel="Liked releases will appear here once they start hearting records." />
        </ContentSection>
      ) : null}

      {selectedTab === 'want' ? (
        <ContentSection label="Want To Hear" title="Their watchlist-style shelf">
          <SortSelect
            value={releaseSort}
            onChange={setReleaseSort}
            options={[
              { value: 'recent', label: 'Most recent' },
              { value: 'title', label: 'Title' },
              { value: 'type', label: 'Type' },
            ]}
          />
          <ReleaseStrip releases={sortedWantedReleases} emptyLabel="Want-to-hear releases will appear here." />
        </ContentSection>
      ) : null}

      {selectedTab === 'diary' ? (
        <ContentSection label="Diary" title="Latest listens">
          <div className="mt-4 space-y-4">
            {diary.length ? diary.map((entry) => <DiaryRow key={entry.id} entry={entry} />) : <EmptyCard text="No diary activity yet." />}
          </div>
        </ContentSection>
      ) : null}

      {selectedTab === 'lists' ? (
        <section className="rounded-[1.35rem] border border-white/10 bg-[#101720] p-5">
          <div className="flex items-center justify-between gap-4">
            <ContentSection label="Public Lists" title="Curated collections">
              <SortSelect
                value={listSort}
                onChange={setListSort}
                options={[
                  { value: 'recent', label: 'Most recent' },
                  { value: 'title', label: 'Title' },
                  { value: 'size', label: 'List size' },
                ]}
              />
              <div className="mt-4 space-y-3">
                {sortedLists.length ? (
                  sortedLists.map((list) => (
                    <ListCard
                      key={list.id}
                      list={list}
                      compact
                      action={<ListLikeButton listId={list.id} ownerId={list.user.id} initialLikesCount={list.likesCount} initialIsLiked={list.isLiked} />}
                    />
                  ))
                ) : (
                  <p className="text-sm text-white/60">No public lists yet.</p>
                )}
              </div>
            </ContentSection>
            <Link href={`/users/${profile.id}/lists`} className="text-sm font-medium text-[#8ecae6] transition hover:text-[#d0effa]">
              View all
            </Link>
          </div>
        </section>
      ) : null}
    </main>
  )
}

function ContentSection({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  return (
    <section>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-white/45">{label}</p>
      <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
      {children}
    </section>
  )
}

function ProfileStat({ label, value, onClick, href }: { label: string; value: number; onClick?: () => void; href?: string }) {
  const content = (
    <>
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/42">{label}</p>
    </>
  )

  if (href) {
    return (
      <Link href={href} className="rounded-[1rem] border border-white/8 bg-white/[0.03] px-4 py-3 text-center transition hover:bg-white/[0.06]">
        {content}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="rounded-[1rem] border border-white/8 bg-white/[0.03] px-4 py-3 text-center transition hover:bg-white/[0.06]">
        {content}
      </button>
    )
  }

  return (
    <div className="rounded-[1rem] border border-white/8 bg-white/[0.03] px-4 py-3 text-center">
      {content}
    </div>
  )
}

function ReleaseStrip({ releases, emptyLabel }: { releases: DiaryEntry['release'][]; emptyLabel: string }) {
  return releases.length ? (
    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {releases.map((release) => (
        <Link key={release.id} href={`/releases/${release.id}`} className="group block">
          <CoverArt title={release.title} artworkUrl={release.artworkUrl} className="rounded-[0.85rem] transition duration-200 group-hover:-translate-y-1" />
        </Link>
      ))}
    </div>
  ) : (
    <EmptyCard text={emptyLabel} className="mt-4" />
  )
}

function ArtistStrip({ artists, emptyLabel }: { artists: Profile['favoriteArtists'][number]['artist'][]; emptyLabel: string }) {
  return artists.length ? (
    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
      {artists.map((artist) => (
        <Link key={artist.id} href={`/artists/${artist.id}`} className="rounded-[1rem] border border-white/10 bg-white/[0.03] px-4 py-5 transition hover:bg-white/[0.06]">
          <p className="text-sm font-semibold text-white">{artist.name}</p>
          <p className="mt-2 text-[0.72rem] uppercase tracking-[0.18em] text-white/42">{artist.type}</p>
        </Link>
      ))}
    </div>
  ) : (
    <EmptyCard text={emptyLabel} className="mt-4" />
  )
}

function EmptyCard({ text, className = '' }: { text: string; className?: string }) {
  return <div className={`rounded-[1.3rem] border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60 ${className}`}>{text}</div>
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const icon =
    item.type === 'follow' ? <UserPlus className="h-4 w-4 text-[#8ecae6]" /> :
    item.type === 'like' ? <Heart className="h-4 w-4 text-[#f4d35e]" /> :
    item.type === 'comment' ? <MessageCircle className="h-4 w-4 text-[#48c774]" /> :
    <Activity className="h-4 w-4 text-white/60" />

  return (
    <div className="flex items-start gap-3 rounded-[1rem] bg-white/[0.04] px-4 py-3">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-sm leading-6 text-white/78">{item.text}</p>
        <p className="mt-1 text-[0.68rem] uppercase tracking-[0.18em] text-white/38">{item.meta}</p>
      </div>
    </div>
  )
}

function UserGrid({ users, emptyLabel }: { users: User[]; emptyLabel: string }) {
  return users.length ? (
    <div className="mt-4 grid gap-3">
      {users.map((entry) => (
        <Link key={entry.id} href={`/users/${entry.id}`} className="flex items-center gap-3 rounded-[1rem] bg-white/[0.04] px-4 py-3 transition hover:bg-white/[0.07]">
          <UserAvatar user={entry} className="h-12 w-12" textClassName="text-sm" />
          <div>
            <p className="text-sm font-semibold text-white">{entry.displayName || entry.username}</p>
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">@{entry.username}</p>
          </div>
        </Link>
      ))}
    </div>
  ) : (
    <EmptyCard text={emptyLabel} className="mt-4" />
  )
}

function DiaryRow({ entry }: { entry: DiaryEntry }) {
  return (
    <Link href={`/releases/${entry.release.id}`} className="flex items-start gap-3 rounded-[1rem] bg-white/[0.04] p-3 transition hover:bg-white/[0.07]">
      <div className="w-14 shrink-0">
        <CoverArt title={entry.release.title} artworkUrl={entry.release.artworkUrl} className="rounded-[0.75rem]" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{entry.release.title}</p>
        <ArtistCreditLine credits={entry.release.artistCredits} className="mt-1 block text-xs text-white/52" />
        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/38">{formatDate(entry.listenedAt)}</p>
      </div>
    </Link>
  )
}

function SortSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: Array<{ value: T; label: string }>
}) {
  return (
    <div className="mt-4">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-11 rounded-2xl border border-white/10 bg-white/8 px-4 text-sm text-black outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            Sort: {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function sortReleases(releases: DiaryEntry['release'][], mode: 'recent' | 'title' | 'type') {
  const next = [...releases]
  if (mode === 'title') return next.sort((a, b) => a.title.localeCompare(b.title))
  if (mode === 'type') return next.sort((a, b) => a.type.localeCompare(b.type) || a.title.localeCompare(b.title))
  return next
}

function sortReviews(reviews: Review[], mode: 'recent' | 'popular' | 'title') {
  const next = [...reviews]
  if (mode === 'popular') return next.sort((a, b) => b.likesCount - a.likesCount || b.comments.length - a.comments.length)
  if (mode === 'title') return next.sort((a, b) => a.release.title.localeCompare(b.release.title))
  return next
}

function sortUsers(users: User[], mode: 'recent' | 'name') {
  const next = [...users]
  if (mode === 'name') return next.sort((a, b) => (a.displayName || a.username).localeCompare(b.displayName || b.username))
  return next
}

function sortLists(lists: List[], mode: 'recent' | 'title' | 'size') {
  const next = [...lists]
  if (mode === 'title') return next.sort((a, b) => a.title.localeCompare(b.title))
  if (mode === 'size') return next.sort((a, b) => b.itemsCount - a.itemsCount || a.title.localeCompare(b.title))
  return next
}
