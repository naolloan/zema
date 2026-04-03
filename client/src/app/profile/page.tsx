'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Activity, Heart, MessageCircle, Plus, Settings2, UserPlus } from 'lucide-react'
import { BrandLoader } from '@/components/brand/brand-logo'
import { getFollowers, getFollowing, getMyDiary, getMyLists, getMyProfile, getUserReleaseLikes, getUserReviews, getUserWantToHear } from '@/lib/auth-api'
import { ListManager } from '@/components/lists/list-manager'
import { FavoriteManager } from '@/components/profile/favorite-manager'
import { UserAvatar } from '@/components/profile/user-avatar'
import { CoverArt } from '@/components/music/cover-art'
import { ArtistCreditLine } from '@/components/music/artist-credit-line'
import { formatDate, truncateText } from '@/lib/utils'
import type { DiaryEntry, LikedReleaseItem, List, Profile, Review, User, WantToHearItem } from '@/types'
import { useAuthStore } from '@/store/auth-store'

type ProfileTab = 'profile' | 'activity' | 'network' | 'logged' | 'reviewed' | 'liked' | 'want' | 'diary' | 'lists'

const profileTabs: Array<{ id: ProfileTab; label: string }> = [
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

function formatCommentPermissionLabel(permission: Profile['commentPermission']) {
  return {
    ANYONE: 'Anyone can comment',
    FOLLOWING: 'People you follow can comment',
    SELF: 'Only you can comment',
  }[permission || 'FOLLOWING']
}

export default function ProfilePage() {
  const { user, hydrated, hydrate, clearSession, setSession, token } = useAuthStore((state) => ({
    user: state.user,
    hydrated: state.hydrated,
    hydrate: state.hydrate,
    clearSession: state.clearSession,
    setSession: state.setSession,
    token: state.token,
  }))
  const [selectedTab, setSelectedTab] = useState<ProfileTab>('profile')
  const [releaseSort, setReleaseSort] = useState<'recent' | 'title' | 'type'>('recent')
  const [reviewSort, setReviewSort] = useState<'recent' | 'popular' | 'title'>('recent')
  const [networkSort, setNetworkSort] = useState<'recent' | 'name'>('recent')
  const [listSort, setListSort] = useState<'recent' | 'title' | 'size'>('recent')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [lists, setLists] = useState<List[]>([])
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [followers, setFollowers] = useState<User[]>([])
  const [following, setFollowing] = useState<User[]>([])
  const [wantToHear, setWantToHear] = useState<WantToHearItem[]>([])
  const [likedReleases, setLikedReleases] = useState<LikedReleaseItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    async function loadProfile() {
      if (!token || !user?.id) {
        setLoading(false)
        return
      }

      try {
        const [data, myLists, diaryData, reviewData, followerData, followingData, wantToHearData, likedReleaseData] = await Promise.all([
          getMyProfile(),
          getMyLists(user.id),
          getMyDiary(6, 0),
          getUserReviews(user.id, 4, 0),
          getFollowers(user.id, 8, 0),
          getFollowing(user.id, 8, 0),
          getUserWantToHear(user.id, 6, 0),
          getUserReleaseLikes(user.id, 12, 0),
        ])

        setProfile(data)
        setLists(myLists)
        setDiaryEntries(diaryData.data)
        setReviews(reviewData.data)
        setFollowers(followerData.data)
        setFollowing(followingData.data)
        setWantToHear(wantToHearData.data)
        setLikedReleases(likedReleaseData.data)
        setSession({ user: { ...user, ...data }, token })
      } catch {
        clearSession()
      } finally {
        setLoading(false)
      }
    }

    if (hydrated) {
      loadProfile()
    }
  }, [clearSession, hydrated, setSession, token, user?.id])

  const favoriteAlbumReleases = useMemo(() => (profile?.favoriteAlbums ?? []).map((favorite) => favorite.release), [profile?.favoriteAlbums])
  const favoriteSongReleases = useMemo(() => (profile?.favoriteSongs ?? []).map((favorite) => favorite.release), [profile?.favoriteSongs])
  const favoriteArtists = useMemo(() => (profile?.favoriteArtists ?? []).map((favorite) => favorite.artist), [profile?.favoriteArtists])

  const loggedReleases = useMemo(
    () =>
      diaryEntries
        .map((entry) => entry.release)
        .filter((release, index, current) => current.findIndex((item) => item.id === release.id) === index)
        .slice(0, 6),
    [diaryEntries],
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
        text: `${follower.displayName || follower.username} started following you`,
        meta: `@${follower.username}`,
      })
    })

    reviews.slice(0, 3).forEach((review) => {
      if (review.likesCount > 0) {
        items.push({
          type: 'like',
          text: `${review.likesCount} like${review.likesCount === 1 ? '' : 's'} on your review of ${review.release.title}`,
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

    diaryEntries.slice(0, 2).forEach((entry) => {
      items.push({
        type: 'log',
        text: `Logged ${entry.release.title}`,
        meta: formatDate(entry.listenedAt),
      })
    })

    return items.slice(0, 6)
  }, [diaryEntries, followers, reviews])

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

  if (!hydrated || loading) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 py-10 text-white/70">
        <BrandLoader className="h-5 w-auto" />
      </main>
    )
  }

  if (!user || !profile) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-white">
          <h1 className="text-3xl font-semibold">Sign in to view your profile</h1>
          <p className="mt-3 text-white/64">Your profile will show reviews, diary activity, ratings, lists, and your featured favorites.</p>
          <div className="mt-6 flex gap-3">
            <Link href="/auth/login" className="rounded-full bg-[#f4d35e] px-5 py-3 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082]">Sign In</Link>
            <Link href="/auth/register" className="rounded-full border border-white/12 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.08]">Create Account</Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <ProfileHeader profile={profile} onSelectTab={setSelectedTab} />

      <nav className="overflow-x-auto rounded-[1.2rem] border border-white/10 bg-[#11161f] px-3 py-3">
        <div className="flex min-w-max snap-x snap-mandatory items-center gap-2">
          {profileTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedTab(tab.id)}
              className={selectedTab === tab.id ? 'snap-start rounded-full bg-[#f4d35e] px-4 py-2 text-sm font-semibold text-[#111318]' : 'snap-start rounded-full px-4 py-2 text-sm font-medium text-white/68 transition hover:bg-white/[0.06] hover:text-white'}
            >
              {tab.label}
            </button>
          ))}
          <Link href={`/users/${profile.id}`} className="order-last ml-0 rounded-full px-4 py-2 text-sm font-medium text-[#8ecae6] transition hover:bg-white/[0.06] sm:ml-auto">
            Public View
          </Link>
        </div>
      </nav>

      {selectedTab === 'profile' ? (
        <div className="space-y-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="space-y-8">
              <ContentSection label="Favorite Albums" title="Your four cornerstone projects">
                <ReleaseStrip
                  releases={sortedFavoriteAlbumReleases}
                  emptyLabel="Choose up to four favorite albums from the curated favorites panel below."
                  fillTo={4}
                  emptyLink="/profile#curated-favorites"
                  emptyCardLabel="Add album"
                />
              </ContentSection>
              <ContentSection label="Favorite Songs" title="Your four signature songs">
                <ReleaseStrip
                  releases={sortedFavoriteSongReleases}
                  emptyLabel="Choose up to four favorite songs from the curated favorites panel below."
                  fillTo={4}
                  emptyLink="/profile#curated-favorites"
                  emptyCardLabel="Add song"
                />
              </ContentSection>
              <ContentSection label="Favorite Artists" title="The names at the center of your profile">
                <ArtistStrip
                  artists={favoriteArtists}
                  emptyLabel="Choose up to four favorite artists from the curated favorites panel below."
                  fillTo={4}
                  emptyLink="/profile#curated-favorites"
                  emptyCardLabel="Add artist"
                />
              </ContentSection>
              <ContentSection label="Wanted Soon" title="What you want to hear next">
                <ReleaseStrip releases={sortedWantedReleases} emptyLabel="Use the new want-to-hear action on release pages to build this shelf." />
              </ContentSection>
            </section>
            <section className="space-y-6">
              <div className="rounded-[1.35rem] border border-white/10 bg-[#101720] p-5">
                <ContentSection label="Settings" title="Account and privacy">
                  <div className="mt-4 space-y-3">
                    <div className="rounded-[1rem] border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8ecae6]">Email</p>
                      <p className="mt-2 text-sm font-medium text-white">{user.email || 'No email on file'}</p>
                      <p className="mt-2 text-sm text-white/60">
                        {user.emailVerifiedAt ? 'Verified sign-in email on this account.' : 'This email still needs verification.'}
                      </p>
                    </div>
                    <div className="rounded-[1rem] border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f4d35e]">Comment permissions</p>
                      <p className="mt-2 text-sm font-medium text-white">{formatCommentPermissionLabel(profile.commentPermission)}</p>
                      <p className="mt-2 text-sm text-white/60">
                        This applies to the conversation around your reviews and public lists.
                      </p>
                    </div>
                    <div className="rounded-[1rem] border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2a9d8f]">Account flow</p>
                      <p className="mt-2 text-sm font-medium text-white">Edit profile, avatar, password, permissions, and account deletion in one settings page.</p>
                      <p className="mt-2 text-sm text-white/60">
                        Keeping edits out of the main profile tab makes this page cleaner and easier to browse.
                      </p>
                      <Link
                        href="/profile/settings"
                        className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#8ecae6]/25 bg-[#8ecae6]/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#d7f2ff] transition hover:bg-[#8ecae6]/18"
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                        Open account settings
                      </Link>
                    </div>
                  </div>
                </ContentSection>
              </div>
            </section>
          </div>

          <FavoriteManager profile={profile} onProfileChange={setProfile} />
        </div>
      ) : null}

      {selectedTab === 'activity' ? (
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <ContentSection label="Recent Activity" title="What you have been around lately">
            <ReleaseStrip releases={loggedReleases.length ? loggedReleases : reviewedReleases} emptyLabel="Activity posters will show up here once you start logging and reviewing." />
          </ContentSection>
          <section className="rounded-[1.35rem] border border-white/10 bg-[#101720] p-5">
            <ContentSection label="Activity Feed" title="Likes, comments, and follows">
              <div className="mt-4 space-y-3">
                {activityItems.length ? activityItems.map((item, index) => <ActivityRow key={`${item.type}-${index}`} item={item} />) : <p className="text-sm text-white/60">Activity will collect here once people start interacting with your profile and reviews.</p>}
              </div>
            </ContentSection>
          </section>
        </div>
      ) : null}

      {selectedTab === 'network' ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <section className="rounded-[1.35rem] border border-white/10 bg-[#101720] p-5">
            <ContentSection label="Mutuals" title="People you follow back">
              <SortSelect
                value={networkSort}
                onChange={setNetworkSort}
                options={[
                  { value: 'recent', label: 'Most recent' },
                  { value: 'name', label: 'Name' },
                ]}
              />
              <UserGrid users={sortedMutuals} emptyLabel="Mutual follows will appear here as your network grows." />
            </ContentSection>
          </section>
          <section className="rounded-[1.35rem] border border-white/10 bg-[#101720] p-5">
            <ContentSection label="Recent Follows" title="Latest people in your orbit">
              <SortSelect
                value={networkSort}
                onChange={setNetworkSort}
                options={[
                  { value: 'recent', label: 'Most recent' },
                  { value: 'name', label: 'Name' },
                ]}
              />
              <UserGrid users={sortedFollowing} emptyLabel="The people you follow will appear here." />
            </ContentSection>
          </section>
        </div>
      ) : null}

      {selectedTab === 'logged' ? (
        <ContentSection label="Logged Releases" title="Records in your diary">
          <SortSelect
            value={releaseSort}
            onChange={setReleaseSort}
            options={[
              { value: 'recent', label: 'Most recent' },
              { value: 'title', label: 'Title' },
              { value: 'type', label: 'Type' },
            ]}
          />
          <ReleaseStrip releases={sortedLoggedReleases} emptyLabel="Logged releases will appear here once your diary fills up." />
        </ContentSection>
      ) : null}

      {selectedTab === 'reviewed' ? (
        <div className="space-y-8">
          <ContentSection label="Reviewed Releases" title="Records you wrote about">
            <SortSelect
              value={releaseSort}
              onChange={setReleaseSort}
              options={[
                { value: 'recent', label: 'Most recent' },
                { value: 'title', label: 'Title' },
                { value: 'type', label: 'Type' },
              ]}
            />
            <ReleaseStrip releases={sortedReviewedReleases} emptyLabel="Reviewed releases will collect here once you start writing." />
          </ContentSection>
          <ContentSection label="Recent Reviews" title="Your latest writing">
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
              {sortedReviews.length ? sortedReviews.map((review) => <ReviewSummary key={review.id} review={review} />) : <EmptyCard text="Reviews will show up here once you start writing." />}
            </div>
          </ContentSection>
        </div>
      ) : null}

      {selectedTab === 'liked' ? (
        <ContentSection label="Liked Releases" title="The releases you hearted">
          <SortSelect
            value={releaseSort}
            onChange={setReleaseSort}
            options={[
              { value: 'recent', label: 'Most recent' },
              { value: 'title', label: 'Title' },
              { value: 'type', label: 'Type' },
            ]}
          />
          <ReleaseStrip releases={sortedLikedReleases} emptyLabel="Liked releases will appear here once you start hearting records." />
        </ContentSection>
      ) : null}

      {selectedTab === 'want' ? (
        <ContentSection label="Want To Hear" title="Your watchlist-style shelf">
          <SortSelect
            value={releaseSort}
            onChange={setReleaseSort}
            options={[
              { value: 'recent', label: 'Most recent' },
              { value: 'title', label: 'Title' },
              { value: 'type', label: 'Type' },
            ]}
          />
          <ReleaseStrip releases={sortedWantedReleases} emptyLabel="Add releases to want to hear from release pages or the kebab menu." />
        </ContentSection>
      ) : null}

      {selectedTab === 'diary' ? (
        <div className="space-y-8">
          <ContentSection label="Diary" title="Latest listens">
            <div className="mt-4 space-y-4">
              {diaryEntries.length ? diaryEntries.map((entry) => <DiaryRow key={entry.id} entry={entry} />) : <EmptyCard text="No diary entries yet." />}
            </div>
            <Link href="/diary" className="mt-4 inline-flex text-sm font-medium text-[#8ecae6] transition hover:text-[#d0effa]">
              Open full diary
            </Link>
          </ContentSection>
        </div>
      ) : null}

      {selectedTab === 'lists' ? (
        <div className="space-y-8">
          <ContentSection label="Manage Your Lists" title="Create, organize, and fill your own lists right here.">
            <SortSelect
              value={listSort}
              onChange={setListSort}
              options={[
                { value: 'recent', label: 'Most recent' },
                { value: 'title', label: 'Title' },
                { value: 'size', label: 'List size' },
              ]}
            />
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/64">
              Official lists stay under the main Lists navigation. Your own curation tools live here on the profile page.
            </p>
          </ContentSection>
          <ListManager userId={profile.id} lists={sortedLists} onListsChange={setLists} />
        </div>
      ) : null}
    </main>
  )
}

function ProfileHeader({ profile, onSelectTab }: { profile: Profile; onSelectTab: (tab: ProfileTab) => void }) {
  return (
    <section className="rounded-[1.7rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,22,31,0.96),rgba(16,19,27,0.88))] p-6 shadow-[0_22px_60px_rgba(0,0,0,0.28)]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-5">
          <UserAvatar user={profile} className="h-20 w-20 border border-white/14" textClassName="text-2xl" />
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold text-white">{profile.displayName || profile.username}</h1>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/72">
                Your profile
              </span>
              <Link
                href="/profile/settings"
                className="inline-flex items-center gap-2 rounded-full border border-[#f4d35e]/28 bg-[#f4d35e]/14 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#fff0be] transition hover:bg-[#f4d35e]/22"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Edit profile
              </Link>
            </div>
            <p className="mt-2 text-sm uppercase tracking-[0.2em] text-white/45">@{profile.username}</p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70">
              {profile.bio || 'No bio yet. Start logging listens, writing reviews, and shaping the story your profile tells.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-4">
          <ProfileStat label="Logged" value={profile._count.diaryEntries} onClick={() => onSelectTab('logged')} />
          <ProfileStat label="Reviews" value={profile._count.reviews} onClick={() => onSelectTab('reviewed')} />
          <ProfileStat label="Lists" value={profile._count.lists} onClick={() => onSelectTab('lists')} />
          <ProfileStat label="Want To Hear" value={profile._count.wantToHear} onClick={() => onSelectTab('want')} />
          <ProfileStat label="Following" value={profile.counts?.following || 0} href={`/users/${profile.id}/following`} />
          <ProfileStat label="Followers" value={profile.counts?.followers || 0} href={`/users/${profile.id}/followers`} />
        </div>
      </div>
    </section>
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

function ReleaseStrip({
  releases,
  emptyLabel,
  fillTo,
  emptyLink,
  emptyCardLabel = 'Add favorite',
}: {
  releases: DiaryEntry['release'][]
  emptyLabel: string
  fillTo?: number
  emptyLink?: string
  emptyCardLabel?: string
}) {
  const emptySlots = fillTo ? Math.max(0, fillTo - releases.length) : 0

  if (!releases.length && !emptySlots) {
    return <EmptyCard text={emptyLabel} className="mt-4" />
  }

  return (
    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {releases.map((release) => (
        <Link key={release.id} href={`/releases/${release.id}`} className="group block">
          <CoverArt title={release.title} artworkUrl={release.artworkUrl} className="rounded-[0.85rem] transition duration-200 group-hover:-translate-y-1" />
        </Link>
      ))}
      {Array.from({ length: emptySlots }).map((_, index) =>
        emptyLink ? (
          <Link
            key={`empty-release-slot-${index}`}
            href={emptyLink}
            className="group flex aspect-square items-center justify-center rounded-[0.95rem] border border-dashed border-white/14 bg-white/[0.03] p-4 text-center transition hover:border-[#8ecae6]/32 hover:bg-white/[0.06]"
          >
            <div className="flex flex-col items-center gap-3 text-white/56 transition group-hover:text-white/78">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.04]">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em]">{emptyCardLabel}</p>
                <p className="mt-1 text-[0.72rem] text-white/44">Open curated favorites</p>
              </div>
            </div>
          </Link>
        ) : null,
      )}
    </div>
  )
}

function ArtistStrip({
  artists,
  emptyLabel,
  fillTo,
  emptyLink,
  emptyCardLabel = 'Add artist',
}: {
  artists: Profile['favoriteArtists'][number]['artist'][]
  emptyLabel: string
  fillTo?: number
  emptyLink?: string
  emptyCardLabel?: string
}) {
  const emptySlots = fillTo ? Math.max(0, fillTo - artists.length) : 0

  if (!artists.length && !emptySlots) {
    return <EmptyCard text={emptyLabel} className="mt-4" />
  }

  return (
    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
      {artists.map((artist) => (
        <Link key={artist.id} href={`/artists/${artist.id}`} className="rounded-[1rem] border border-white/10 bg-white/[0.03] px-4 py-5 transition hover:bg-white/[0.06]">
          <p className="text-sm font-semibold text-white">{artist.name}</p>
          <p className="mt-2 text-[0.72rem] uppercase tracking-[0.18em] text-white/42">{artist.type}</p>
        </Link>
      ))}
      {Array.from({ length: emptySlots }).map((_, index) =>
        emptyLink ? (
          <Link
            key={`empty-artist-slot-${index}`}
            href={emptyLink}
            className="group flex min-h-[152px] items-center justify-center rounded-[1rem] border border-dashed border-white/14 bg-white/[0.03] px-4 py-5 text-center transition hover:border-[#8ecae6]/32 hover:bg-white/[0.06]"
          >
            <div className="flex flex-col items-center gap-3 text-white/56 transition group-hover:text-white/78">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.04]">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em]">{emptyCardLabel}</p>
                <p className="mt-1 text-[0.72rem] text-white/44">Open curated favorites</p>
              </div>
            </div>
          </Link>
        ) : null,
      )}
    </div>
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

function ReviewSummary({ review }: { review: Review }) {
  return (
    <article className="grid gap-4 rounded-[1.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4 sm:grid-cols-[4.8rem_1fr]">
      <Link href={`/releases/${review.release.id}`} className="block">
        <CoverArt title={review.release.title} artworkUrl={review.release.artworkUrl} className="rounded-[0.9rem]" />
      </Link>
      <div>
        <Link href={`/releases/${review.release.id}`} className="block text-2xl font-semibold text-white transition hover:text-[#8ecae6]">
          {review.release.title}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-white/42">
          <span>{review.release.releaseDate ? new Date(review.release.releaseDate).getFullYear() : 'Unknown year'}</span>
          <span>Reviewed {formatDate(review.createdAt)}</span>
        </div>
        <p className="mt-4 text-sm leading-7 text-white/74">{truncateText(review.content, 220)}</p>
      </div>
    </article>
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
