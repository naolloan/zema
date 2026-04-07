'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity, Search, Sparkles, Waves } from 'lucide-react'
import { BrandLoader } from '@/components/brand/brand-logo'
import { ListCard } from '@/components/lists/list-card'
import { Input } from '@/components/ui/input'
import { UserAvatar } from '@/components/profile/user-avatar'
import { ReleaseCard } from './release-card'
import { ArtistCreditLine } from './artist-credit-line'
import { ReviewCard } from './review-card'
import { searchMusic, getTopReleases, getRecentDiaryEntries, getRecentReviews } from '@/lib/music-api'
import { searchUsers } from '@/lib/auth-api'
import { formatDate } from '@/lib/utils'
import type { ChartResponse, DiaryEntry, Review, SearchResult, User } from '@/types'

type SearchScope = 'all' | 'artist' | 'release' | 'track' | 'user' | 'list'
type SearchHistoryEntry = { query: string; scope: SearchScope }

const SEARCH_HISTORY_KEY = 'zema-search-history'

function formatSearchScopeLabel(scope: SearchScope) {
  return {
    all: 'Everything',
    artist: 'Artists',
    release: 'Releases',
    track: 'Tracks',
    list: 'Lists',
    user: 'Users',
  }[scope]
}

export function ExploreView() {
  const [query, setQuery] = useState('')
  const [searchScope, setSearchScope] = useState<SearchScope>('all')
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
  const [userSearchResult, setUserSearchResult] = useState<User[]>([])
  const [charts, setCharts] = useState<{ albums: ChartResponse | null; singles: ChartResponse | null }>({
    albums: null,
    singles: null,
  })
  const [recentReviews, setRecentReviews] = useState<Review[]>([])
  const [recentDiary, setRecentDiary] = useState<DiaryEntry[]>([])
  const [loadingCharts, setLoadingCharts] = useState(true)
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([])

  useEffect(() => {
    async function loadDiscovery() {
      setLoadingCharts(true)
      const [albums, singles, reviews, diary] = await Promise.all([
        getTopReleases('ALBUM', 6),
        getTopReleases('SINGLE', 6),
        getRecentReviews(3, 0),
        getRecentDiaryEntries(3, 0),
      ])
      setCharts({ albums, singles })
      setRecentReviews(reviews?.data || [])
      setRecentDiary(diary?.data || [])
      setLoadingCharts(false)
    }

    loadDiscovery()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      const stored = window.localStorage.getItem(SEARCH_HISTORY_KEY)
      if (!stored) {
        return
      }

      const parsed = JSON.parse(stored) as SearchHistoryEntry[]
      setSearchHistory(Array.isArray(parsed) ? parsed.slice(0, 8) : [])
    } catch {
      setSearchHistory([])
    }
  }, [])

  function persistSearchHistory(nextHistory: SearchHistoryEntry[]) {
    setSearchHistory(nextHistory)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(nextHistory))
    }
  }

  function saveSearchToHistory(nextQuery: string, nextScope: SearchScope) {
    const normalized = nextQuery.trim()
    if (!normalized) {
      return
    }

    const deduped = [
      { query: normalized, scope: nextScope },
      ...searchHistory.filter((entry) => !(entry.query.toLowerCase() === normalized.toLowerCase() && entry.scope === nextScope)),
    ].slice(0, 8)

    persistSearchHistory(deduped)
  }

  async function runSearch(nextQuery: string, nextScope: SearchScope) {
    const normalized = nextQuery.trim()
    if (!normalized) return

    setSearching(true)
    setHasSearched(true)
    setQuery(normalized)
    setSearchScope(nextScope)

    if (nextScope === 'user') {
      const result = await searchUsers(normalized, 12, 0)
      setUserSearchResult(result.data)
      setSearchResult(null)
    } else {
      const [result, users] = await Promise.all([
        searchMusic(normalized, nextScope),
        nextScope === 'all' ? searchUsers(normalized, 12, 0) : Promise.resolve(null),
      ])
      setSearchResult(result)
      setUserSearchResult(users?.data || [])
    }

    saveSearchToHistory(normalized, nextScope)
    setSearching(false)
  }

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await runSearch(query, searchScope)
  }

  function clearSearchHistory() {
    persistSearchHistory([])
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SEARCH_HISTORY_KEY)
    }
  }

  function handleReviewChange(nextReview: Review) {
    setRecentReviews((current) => current.map((review) => (review.id === nextReview.id ? nextReview : review)))
  }

  const hasSearch = hasSearched && query.trim().length > 0 && (searchScope === 'user' ? true : Boolean(searchResult) || userSearchResult.length > 0)
  const musicSearchResult = searchScope === 'user' ? null : searchResult
  const showUsers = searchScope === 'all'
  const showArtists = searchScope === 'all' || searchScope === 'artist'
  const showReleases = searchScope === 'all' || searchScope === 'release'
  const showTracks = searchScope === 'all' || searchScope === 'track'
  const showLists = searchScope === 'all' || searchScope === 'list'

  const searchContent = searchScope === 'user' ? (
    <section className="rounded-[1.9rem] border border-[#8ecae6]/18 bg-[linear-gradient(180deg,rgba(142,202,230,0.12),rgba(255,255,255,0.04))] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
      <h2 className="text-lg font-semibold text-white">Users</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {userSearchResult.length ? userSearchResult.map((person) => (
          <Link key={person.id} href={`/users/${person.id}`} className="flex items-center gap-4 rounded-[1.5rem] border border-white/10 bg-[#101720]/88 p-4 transition hover:border-[#8ecae6]/35 hover:bg-[#131a24]">
            <UserAvatar user={person} className="h-14 w-14" textClassName="text-lg" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">{person.displayName || person.username}</p>
              <p className="truncate text-sm text-white/56">@{person.username}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#8ecae6]">
                {person.counts?.followers || 0} followers
              </p>
            </div>
          </Link>
        )) : <p className="text-sm text-white/60">No user matches yet.</p>}
      </div>
    </section>
  ) : musicSearchResult ? (
    <section className="space-y-8">
      {showUsers ? (
        <div className="rounded-[1.9rem] border border-[#8ecae6]/18 bg-[linear-gradient(180deg,rgba(142,202,230,0.12),rgba(255,255,255,0.04))] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
          <h2 className="text-lg font-semibold text-white">Users</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {userSearchResult.length ? userSearchResult.map((person) => (
              <Link key={person.id} href={`/users/${person.id}`} className="flex items-center gap-4 rounded-[1.5rem] border border-white/10 bg-[#101720]/88 p-4 transition hover:border-[#8ecae6]/35 hover:bg-[#131a24]">
                <UserAvatar user={person} className="h-14 w-14" textClassName="text-lg" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{person.displayName || person.username}</p>
                  <p className="truncate text-sm text-white/56">@{person.username}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#8ecae6]">
                    {person.counts?.followers || 0} followers
                  </p>
                </div>
              </Link>
            )) : <p className="text-sm text-white/60">No user matches yet.</p>}
          </div>
        </div>
      ) : null}

      {showArtists ? (
        <div className="rounded-[1.9rem] border border-[#8ecae6]/18 bg-[linear-gradient(180deg,rgba(142,202,230,0.12),rgba(255,255,255,0.04))] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
          <h2 className="text-lg font-semibold text-white">Artists</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {musicSearchResult.artists.length ? musicSearchResult.artists.map((artist) => (
              <Link key={artist.id} href={`/artists/${artist.id}`} className="block rounded-2xl border border-white/10 bg-[#0f141d]/86 px-4 py-3 transition hover:border-[#8ecae6]/35 hover:bg-[#131a24]">
                <p className="font-medium text-white">{artist.name}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[#8ecae6]">{artist.type}</p>
              </Link>
            )) : <p className="text-sm text-white/60">No artist matches yet.</p>}
          </div>
        </div>
      ) : null}

      {showReleases ? (
        <div className="rounded-[1.9rem] border border-[#f4d35e]/16 bg-[linear-gradient(180deg,rgba(244,211,94,0.1),rgba(255,255,255,0.04))] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
          <h2 className="text-lg font-semibold text-white">Releases</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {musicSearchResult.releases.length ? musicSearchResult.releases.map((release) => (
              <ReleaseCard key={release.id} release={release} />
            )) : <p className="text-sm text-white/60">No release matches yet.</p>}
          </div>
        </div>
      ) : null}

      {showLists ? (
        <div className="rounded-[1.9rem] border border-[#ff7b54]/18 bg-[linear-gradient(180deg,rgba(255,123,84,0.12),rgba(255,255,255,0.04))] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
          <h2 className="text-lg font-semibold text-white">Lists</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {musicSearchResult.lists.length ? musicSearchResult.lists.map((list) => (
              <ListCard key={list.id} list={list} />
            )) : <p className="text-sm text-white/60">No list matches yet.</p>}
          </div>
        </div>
      ) : null}

      {showTracks ? (
        <div className="rounded-[1.9rem] border border-[#2a9d8f]/16 bg-[linear-gradient(180deg,rgba(42,157,143,0.1),rgba(255,255,255,0.04))] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
          <h2 className="text-lg font-semibold text-white">Tracks</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {musicSearchResult.tracks.length ? musicSearchResult.tracks.map((track) => (
              <div key={track.id} className="rounded-2xl border border-white/10 bg-[#101720]/88 p-4">
                <Link href={`/tracks/${track.id}`} className="font-medium text-white transition hover:text-[#ffe082]">
                  {track.title}
                </Link>
                <ArtistCreditLine credits={track.artistCredits} className="mt-1 block text-xs text-white/62" />
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                  <Link href={`/tracks/${track.id}`} className="inline-flex text-[#8ecae6] transition hover:text-[#d0effa]">
                    Open track page
                  </Link>
                  {track.release ? (
                    <Link href={`/releases/${track.release.id}`} className="inline-flex text-[#f4d35e] transition hover:text-[#ffe082]">
                      From {track.release.title}
                    </Link>
                  ) : null}
                </div>
              </div>
            )) : <p className="text-sm text-white/60">No track matches yet.</p>}
          </div>
        </div>
      ) : null}
    </section>
  ) : null

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[2.25rem] border border-[#f4d35e]/20 bg-[radial-gradient(circle_at_top_left,_rgba(255,123,84,0.24),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(42,157,143,0.24),_transparent_24%),linear-gradient(145deg,_rgba(255,255,255,0.1),_rgba(255,255,255,0.04))] p-8 shadow-[0_24px_90px_rgba(0,0,0,0.32)]">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#f4d35e]">Discovery Hub</p>
        <div className="mt-4 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Find the records people actually care about, then dive straight into the conversation.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-white/72">
              Search artists, releases, and tracks from the live music catalog, browse the community charts, or jump into the latest reviews and listening activity.
            </p>
          </div>
          <div className="grid gap-3 rounded-[1.9rem] border border-white/10 bg-[#111318]/78 p-4 text-sm text-white/78">
            <div className="flex items-center gap-3 rounded-2xl border border-[#f4d35e]/18 bg-[linear-gradient(135deg,rgba(244,211,94,0.16),rgba(255,255,255,0.03))] p-4">
              <Sparkles className="h-4 w-4 text-[#f4d35e]" />
              Dynamic top charts by release type
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-[#8ecae6]/18 bg-[linear-gradient(135deg,rgba(142,202,230,0.14),rgba(255,255,255,0.03))] p-4">
              <Search className="h-4 w-4 text-[#8ecae6]" />
              Faster targeted search with artist, release, and track scopes
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-[#2a9d8f]/18 bg-[linear-gradient(135deg,rgba(42,157,143,0.14),rgba(255,255,255,0.03))] p-4">
              <Waves className="h-4 w-4 text-[#2a9d8f]" />
              Live paths into reviews, activity, and listener profiles
            </div>
          </div>
        </div>

        <form onSubmit={handleSearch} className="mt-8 grid gap-3 md:grid-cols-[180px_1fr_auto]">
          <select value={searchScope} onChange={(event) => setSearchScope(event.target.value as SearchScope)} className="h-12 rounded-full border border-white/14 bg-white/8 px-4 text-sm font-medium text-black outline-none">
            <option value="all">Everything</option>
            <option value="artist">Artists</option>
            <option value="release">Releases</option>
            <option value="track">Tracks</option>
            <option value="list">Lists</option>
            <option value="user">Users</option>
          </select>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${searchScope === 'all' ? 'artists, releases, tracks, or lists' : formatSearchScopeLabel(searchScope).toLowerCase()}`}
            className="h-12 rounded-full border-white/12 bg-white/10 px-5 text-white placeholder:text-white/40"
          />
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#f4d35e] px-6 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={searching}
          >
            {searching ? <BrandLoader className="h-4 w-auto" /> : 'Search'}
          </button>
        </form>

        {searchHistory.length ? (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/42">Recent searches</p>
            {searchHistory.map((entry) => (
              <button
                key={`${entry.scope}-${entry.query}`}
                type="button"
                onClick={() => void runSearch(entry.query, entry.scope)}
                className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/76 transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                {entry.query} <span className="ml-2 text-xs uppercase tracking-[0.18em] text-white/42">{formatSearchScopeLabel(entry.scope)}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={clearSearchHistory}
              className="rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#8ecae6] transition hover:text-white"
            >
              Clear
            </button>
          </div>
        ) : null}
      </section>

      {hasSearch ? (
        searchContent
      ) : (
        <>
          <section className="grid gap-8 xl:grid-cols-2">
            {loadingCharts ? (
              <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-8 text-white/64 xl:col-span-2">
                <div className="flex items-center gap-3">
                  <BrandLoader className="h-5 w-auto" />
                  Loading charts...
                </div>
              </div>
            ) : (
              <>
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f4d35e]">Community Chart</p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">Top Albums</h2>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {charts.albums?.items.map((item) => (
                      <ReleaseCard key={item.release.id} release={{ ...item.release, averageRating: item.averageRating, ratingCount: item.ratingCount }} eyebrow={`#${item.rank}`} />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8ecae6]">Fast Movers</p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">Top Singles</h2>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {charts.singles?.items.map((item) => (
                      <ReleaseCard key={item.release.id} release={{ ...item.release, averageRating: item.averageRating, ratingCount: item.ratingCount }} eyebrow={`#${item.rank}`} />
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>

          <section className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#ff7b54]">Recent Reviews</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Fresh writing from the community</h2>
                </div>
                <Link href="/reviews" className="text-sm font-medium text-[#f4d35e] transition hover:text-[#ffe082]">View all reviews</Link>
              </div>
              <div className="space-y-4">
                {recentReviews.length ? recentReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} onReviewChange={handleReviewChange} />
                )) : <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 text-sm text-white/56">No recent reviews yet.</div>}
              </div>
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#2a9d8f]">Listening Activity</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">What people logged lately</h2>
                </div>
                <Link href="/activity" className="text-sm font-medium text-[#f4d35e] transition hover:text-[#ffe082]">View activity feed</Link>
              </div>
              <div className="space-y-4">
                {recentDiary.length ? recentDiary.map((entry) => (
                  <article key={entry.id} className="rounded-[1.75rem] border border-[#2a9d8f]/14 bg-[linear-gradient(180deg,rgba(42,157,143,0.08),rgba(255,255,255,0.04))] p-5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
                      <span>{formatDate(entry.listenedAt)}</span>
                      {entry.user ? <Link href={`/users/${entry.user.id}`} className="text-[#8ecae6] transition hover:text-[#b9e4f4]">{entry.user.displayName || entry.user.username}</Link> : null}
                    </div>
                    <Link href={`/releases/${entry.release.id}`} className="mt-3 block text-xl font-semibold text-white transition hover:text-[#f4d35e]">
                      {entry.release.title}
                    </Link>
                    <ArtistCreditLine credits={entry.release.artistCredits} className="mt-2 block text-sm text-white/60" />
                    <p className="mt-3 text-sm leading-7 text-white/68">{entry.notes || (entry.review ? 'Logged with a linked review.' : 'Logged in the diary feed.')}</p>
                  </article>
                )) : <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 text-sm text-white/56">No recent listening activity yet.</div>}
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  )
}
