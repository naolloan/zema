'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Crown, ExternalLink, Heart, LibraryBig, MessageSquare, Radio, Star, X } from 'lucide-react'
import { BrandLoader } from '@/components/brand/brand-logo'
import { ArtistCreditLine } from '@/components/music/artist-credit-line'
import { CoverArt } from '@/components/music/cover-art'
import { ReviewCard } from '@/components/music/review-card'
import { TrackList } from '@/components/music/track-list'
import { ReleaseActionPanel } from '@/components/music/release-action-panel'
import { ReviewComposer } from '@/components/music/review-composer'
import { getRelease, getReleaseLikes, getReleaseLists, getReleaseLogs, getReleaseRatings, getReleaseReviews } from '@/lib/music-api'
import { formatDate, formatDateTime, formatRatingValue } from '@/lib/utils'
import { UserAvatar } from '@/components/profile/user-avatar'
import type { List, Rating, Release, ReleaseLikeEntry, ReleaseLogEntry, Review } from '@/types'
import { useAuthStore } from '@/store/auth-store'

type ReviewSort = 'recent' | 'oldest' | 'popular'
type ReviewFilter = 'all' | 'diary' | 'standalone'

function formatCompactCount(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value)
}

function renderStarRow(average: number) {
  const fullStars = Math.round(average)
  return Array.from({ length: 5 }, (_, index) => (
    <Star
      key={index}
      className={index < fullStars ? 'h-4 w-4 fill-current text-[#48c774]' : 'h-4 w-4 text-white/20'}
    />
  ))
}

function applyOptimisticUserRatingChange(current: Release, nextRelease: Release): Release {
  const previousValue = current.userRating?.value ?? null
  const nextValue = nextRelease.userRating?.value ?? null

  if (previousValue === nextValue) {
    return {
      ...current,
      ...nextRelease,
    }
  }

  const currentBreakdown = current.ratingBreakdown
  if (!currentBreakdown) {
    return {
      ...current,
      ...nextRelease,
    }
  }

  const histogram = currentBreakdown.histogram.map((bucket) => ({ ...bucket }))
  const previousIndex = previousValue === null ? -1 : histogram.findIndex((bucket) => bucket.value === previousValue)
  const nextIndex = nextValue === null ? -1 : histogram.findIndex((bucket) => bucket.value === nextValue)

  if (previousIndex >= 0) {
    histogram[previousIndex] = {
      ...histogram[previousIndex],
      count: Math.max(0, histogram[previousIndex].count - 1),
    }
  }

  if (nextIndex >= 0) {
    histogram[nextIndex] = {
      ...histogram[nextIndex],
      count: histogram[nextIndex].count + 1,
    }
  }

  const currentTotal = currentBreakdown.total || current.ratingCount || 0
  const currentAverage = currentBreakdown.average || current.averageRating || 0
  const nextTotal = currentTotal + (nextValue !== null ? 1 : 0) - (previousValue !== null ? 1 : 0)
  const currentSum = currentAverage * currentTotal
  const nextSum = currentSum + (nextValue ?? 0) - (previousValue ?? 0)
  const nextAverage = nextTotal > 0 ? nextSum / nextTotal : 0

  return {
    ...current,
    ...nextRelease,
    averageRating: nextAverage,
    ratingCount: nextTotal,
    counts: current.counts
      ? {
          ...current.counts,
          ratings: nextTotal,
        }
      : current.counts,
    ratingBreakdown: {
      ...currentBreakdown,
      average: nextAverage,
      total: nextTotal,
      histogram,
    },
  }
}

export default function ReleasePage() {
  const RATING_USERS_PAGE_SIZE = 50
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const user = useAuthStore((state) => state.user)
  const [release, setRelease] = useState<Release | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [loadingMoreReviews, setLoadingMoreReviews] = useState(false)
  const [reviewsTotal, setReviewsTotal] = useState(0)
  const [reviewSort, setReviewSort] = useState<ReviewSort>('recent')
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all')
  const [selectedRatingValue, setSelectedRatingValue] = useState<number | null>(null)
  const [ratingUsers, setRatingUsers] = useState<Rating[]>([])
  const [ratingUsersLoading, setRatingUsersLoading] = useState(false)
  const [loadingMoreRatingUsers, setLoadingMoreRatingUsers] = useState(false)
  const [ratingUsersTotal, setRatingUsersTotal] = useState(0)
  const [activePanel, setActivePanel] = useState<'logs' | 'lists' | 'likes' | null>(null)
  const [releaseLogs, setReleaseLogs] = useState<ReleaseLogEntry[]>([])
  const [releaseLists, setReleaseLists] = useState<List[]>([])
  const [releaseLikes, setReleaseLikes] = useState<ReleaseLikeEntry[]>([])
  const [activePanelLoading, setActivePanelLoading] = useState(false)
  const overlayCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [overlayVisible, setOverlayVisible] = useState(false)

  useEffect(() => {
    return () => {
      if (overlayCloseTimeoutRef.current) {
        clearTimeout(overlayCloseTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    async function loadRelease() {
      if (!params?.id) return
      setLoading(true)
      const [releaseData, reviewData] = await Promise.all([
        getRelease(params.id),
        getReleaseReviews(params.id, 12, 0, { sort: reviewSort, filter: reviewFilter }),
      ])
      setRelease(releaseData)
      setReviews(reviewData?.data || [])
      setReviewsTotal(reviewData?.pagination.total || 0)
      setLoading(false)
    }

    loadRelease()
  }, [params?.id, reviewFilter, reviewSort])

  async function refreshReviews() {
    if (!params?.id) return
    setReviewsLoading(true)
    const reviewData = await getReleaseReviews(params.id, 12, 0, { sort: reviewSort, filter: reviewFilter })
    setReviews(reviewData?.data || [])
    setReviewsTotal(reviewData?.pagination.total || 0)
    setReviewsLoading(false)
  }

  async function handleLoadMoreReviews() {
    if (!params?.id) return
    setLoadingMoreReviews(true)
    const reviewData = await getReleaseReviews(params.id, 12, reviews.length, { sort: reviewSort, filter: reviewFilter })
    if (reviewData?.data?.length) {
      setReviews((current) => [...current, ...reviewData.data])
      setReviewsTotal(reviewData.pagination.total)
    }
    setLoadingMoreReviews(false)
  }

  function handleReviewChange(nextReview: Review) {
    setReviews((current) => current.map((review) => (review.id === nextReview.id ? nextReview : review)))
  }

  function handleReleaseChange(nextRelease: Release) {
    setRelease((current) => {
      if (!current) {
        return nextRelease
      }

      return applyOptimisticUserRatingChange(current, nextRelease)
    })
  }

  async function handleOpenRatingUsers(value: number, count: number) {
    if (!params?.id || count === 0) {
      return
    }

    setSelectedRatingValue(value)
    setRatingUsersLoading(true)
    setRatingUsers([])
    setRatingUsersTotal(0)
    const ratingData = await getReleaseRatings(params.id, value, RATING_USERS_PAGE_SIZE, 0)
    setRatingUsers(ratingData?.data || [])
    setRatingUsersTotal(ratingData?.pagination.total || 0)
    setRatingUsersLoading(false)
  }

  async function handleLoadMoreRatingUsers() {
    if (!params?.id || selectedRatingValue === null || ratingUsers.length >= ratingUsersTotal) {
      return
    }

    setLoadingMoreRatingUsers(true)
    const ratingData = await getReleaseRatings(params.id, selectedRatingValue, RATING_USERS_PAGE_SIZE, ratingUsers.length)
    if (ratingData?.data?.length) {
      setRatingUsers((current) => [...current, ...ratingData.data])
      setRatingUsersTotal(ratingData.pagination.total)
    }
    setLoadingMoreRatingUsers(false)
  }

  async function openPanel(panel: 'logs' | 'lists' | 'likes') {
    if (!params?.id) return

    setActivePanel(panel)
    setActivePanelLoading(true)

    if (panel === 'logs') {
      const payload = await getReleaseLogs(params.id, 100, 0)
      setReleaseLogs(payload?.data || [])
    }

    if (panel === 'lists') {
      const payload = await getReleaseLists(params.id, 100, 0)
      setReleaseLists(payload?.data || [])
    }

    if (panel === 'likes') {
      const payload = await getReleaseLikes(params.id, 100, 0)
      setReleaseLikes(payload?.data || [])
    }

    setActivePanelLoading(false)
  }

  const overlayActive = Boolean(selectedRatingValue || activePanel)

  function closeOverlayPanels() {
    const next = new URLSearchParams(searchParams?.toString() || '')
    next.delete('panel')
    router.replace(next.toString() ? `/releases/${params.id}?${next.toString()}` : `/releases/${params.id}`)
    setOverlayVisible(false)
    if (overlayCloseTimeoutRef.current) {
      clearTimeout(overlayCloseTimeoutRef.current)
    }
    overlayCloseTimeoutRef.current = setTimeout(() => {
      setSelectedRatingValue(null)
      setRatingUsers([])
      setRatingUsersTotal(0)
      setActivePanel(null)
    }, 160)
  }

  function handleOpenPanel(panel: 'logs' | 'lists' | 'likes') {
    const next = new URLSearchParams(searchParams?.toString() || '')
    next.set('panel', panel)
    router.replace(`/releases/${params.id}?${next.toString()}`)
    openPanel(panel)
  }

  function getRankHref() {
    if (!release?.ranking) return null

    switch (release.ranking.type) {
      case 'ALBUM':
        return '/lists/official/top-250-albums'
      case 'EP':
        return '/lists/official/top-250-eps'
      case 'SINGLE':
        return '/lists/official/top-250-songs'
      case 'MIXTAPE':
        return '/lists/official/top-250-mixtapes'
      default:
        return null
    }
  }

  useEffect(() => {
    const panel = searchParams?.get('panel')
    if ((panel === 'logs' || panel === 'lists' || panel === 'likes') && panel !== activePanel) {
      openPanel(panel)
    }
  }, [activePanel, params?.id, searchParams])

  useEffect(() => {
    if (!selectedRatingValue && !activePanel) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeOverlayPanels()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [activePanel, selectedRatingValue])

  useEffect(() => {
    if (overlayActive) {
      if (overlayCloseTimeoutRef.current) {
        clearTimeout(overlayCloseTimeoutRef.current)
      }
      requestAnimationFrame(() => {
        setOverlayVisible(true)
      })
      return
    }

    setOverlayVisible(false)
  }, [overlayActive])

  if (loading) {
    return <main className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 py-10 text-white/70"><BrandLoader className="h-5 w-auto" /></main>
  }
  if (!release) {
    return <main className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-12 sm:px-6 lg:px-8"><Link href="/explore" className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"><ArrowLeft className="h-4 w-4" />Back to explore</Link><div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-white"><h1 className="text-3xl font-semibold">Release not found</h1><p className="mt-3 text-white/64">Try discovering it again from the search page so it can be loaded from the catalog.</p></div></main>
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/explore" className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"><ArrowLeft className="h-4 w-4" />Back to explore</Link>
      <section className="relative isolate overflow-hidden rounded-[2.25rem] border border-white/10 bg-[#0b1017]">
        {release.artworkUrl ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center opacity-40 blur-lg scale-105"
              style={{ backgroundImage: `url(${release.artworkUrl})` }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(5,7,11,0.7),rgba(5,7,11,0.42)_36%,rgba(5,7,11,0.82))]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,123,84,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(142,202,230,0.12),transparent_32%)]" />
          </>
        ) : null}
        <div className="relative grid gap-8 p-6 lg:grid-cols-[340px_1fr] lg:p-8">
          <div><CoverArt title={release.title} artworkUrl={release.artworkUrl} className="max-w-[340px]" /></div>
          <div className="space-y-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(255,123,84,0.16),_transparent_30%),linear-gradient(145deg,_rgba(255,255,255,0.08),_rgba(255,255,255,0.03))] p-8 backdrop-blur-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f4d35e]">{release.type}</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">{release.title}</h1>
            <ArtistCreditLine credits={release.artistCredits} className="mt-4 block text-base text-white/68" />
            <div className="mt-5 flex flex-wrap gap-3 text-sm text-white/56">{release.releaseDate ? <span className="rounded-full bg-white/10 px-3 py-1.5">{formatDate(release.releaseDate)}</span> : null}{release.disambiguation ? <span className="rounded-full bg-white/10 px-3 py-1.5">{release.disambiguation}</span> : null}</div>
            {release.spotifyUrl ? (
              <a
                href={release.spotifyUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#1DB954]/35 bg-[#1DB954]/15 px-4 py-2 text-sm font-semibold text-[#d8ffe8] transition hover:bg-[#1DB954]/22"
              >
                Listen On Spotify
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-4 rounded-[1.5rem] border border-white/10 bg-[#0f141d]/78 px-4 py-4 text-sm font-semibold text-white/78">
            <button
              type="button"
              onClick={() => handleOpenPanel('logs')}
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 transition hover:bg-white/8 hover:text-white"
              title="Open logs"
            >
              <Radio className="h-4 w-4 text-[#48c774]" />
              {formatCompactCount(release.counts?.logs || 0)}
            </button>
            <button
              type="button"
              onClick={() => handleOpenPanel('lists')}
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 transition hover:bg-white/8 hover:text-white"
              title="Open lists containing this release"
            >
              <LibraryBig className="h-4 w-4 text-[#7cc6ff]" />
              {formatCompactCount(release.counts?.lists || 0)}
            </button>
            <button
              type="button"
              onClick={() => handleOpenPanel('likes')}
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 transition hover:bg-white/8 hover:text-white"
              title="Open likes"
            >
              <Heart className="h-4 w-4 fill-current text-[#ff7b54]" />
              {formatCompactCount(release.counts?.likes || 0)}
            </button>
            {release.ranking ? (
              getRankHref() ? (
                <Link
                  href={getRankHref() || '#'}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-2 transition hover:bg-white/8 hover:text-white"
                  title={`Open ${release.ranking.type.toLowerCase()} Top 250`}
                >
                  <Crown className="h-4 w-4 text-[#f4d35e]" />
                  #{release.ranking.rank}
                </Link>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full px-3 py-2">
                  <Crown className="h-4 w-4 text-[#f4d35e]" />
                  #{release.ranking.rank}
                </span>
              )
            ) : null}
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[1.5rem] bg-[#111318]/74 p-5">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">Ratings</p>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/52">{formatCompactCount(release.ratingBreakdown?.total || release.ratingCount || 0)} fans</p>
              </div>
              <div className="mt-5 flex items-end gap-4">
                <div className="flex h-16 flex-1 items-end gap-1">
                  {(release.ratingBreakdown?.histogram || []).map((bucket) => {
                    const maxCount = Math.max(...(release.ratingBreakdown?.histogram || [{ value: 1, count: 1 }]).map((entry) => entry.count), 1)
                    const height = Math.max(8, Math.round((bucket.count / maxCount) * 64))
                    const percent = release.ratingBreakdown?.total ? Math.round((bucket.count / release.ratingBreakdown.total) * 100) : 0
                    return (
                      <button
                        key={bucket.value}
                        type="button"
                        onClick={() => handleOpenRatingUsers(bucket.value, bucket.count)}
                        disabled={bucket.count === 0}
                        className="group/bar relative flex flex-1 flex-col items-center justify-end gap-2 disabled:cursor-default"
                      >
                        <div className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-1/2 z-20 min-w-max -translate-x-1/2 rounded-xl border border-white/10 bg-[#0f141d] px-3 py-2 text-xs text-white opacity-0 shadow-[0_14px_40px_rgba(0,0,0,0.35)] transition group-hover/bar:opacity-100">
                          {bucket.count} people rated this {formatRatingValue(bucket.value)} · {percent}% of ratings
                        </div>
                        <div className={bucket.count ? 'w-full rounded-t-md bg-[#6b7a8e] transition hover:bg-[#8fa0b8]' : 'w-full rounded-t-md bg-white/10'} style={{ height }} />
                        <span className="text-[11px] font-semibold text-white/38">{formatRatingValue(bucket.value)}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-5xl font-semibold text-white">{typeof release.averageRating === 'number' ? release.averageRating.toFixed(1) : 'N/A'}</p>
                  <div className="mt-2 flex items-center justify-end gap-1">
                    {renderStarRow(release.averageRating || 0)}
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[1.5rem] bg-[#111318]/74 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">Reviews</p>
                <p className="mt-3 inline-flex items-center gap-2 text-3xl font-semibold text-white"><MessageSquare className="h-5 w-5 text-[#8ecae6]" />{release.counts?.reviews || reviewsTotal}</p>
              </div>
              <div className="rounded-[1.5rem] bg-[#111318]/74 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">Chart Status</p>
                <p className="mt-3 text-lg font-semibold text-white">
                  {release.ranking ? `Top 250 ${release.ranking.type.toLowerCase()}s` : 'Not ranked yet'}
                </p>
                <p className="mt-2 text-sm text-white/58">
                  {release.ranking
                    ? `Currently sitting at #${release.ranking.rank} in the live ${release.ranking.type.toLowerCase()} chart.`
                    : 'A release needs enough ratings and a strong enough score to break into its live Top 250.'}
                </p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>
      <section className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-8">
          <div><p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f4d35e]">Tracklist</p><h2 className="mt-2 text-3xl font-semibold text-white">What’s on the record</h2><div className="mt-5"><TrackList tracks={release.tracks || []} /></div></div>
          <ReviewComposer release={release} reviews={reviews} user={user} onReviewsChange={setReviews} />
          <div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8ecae6]">Community Reviews</p>
                <h2 className="mt-2 text-3xl font-semibold text-white">What listeners wrote</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-white/42">
                  Sort
                  <select value={reviewSort} onChange={(event) => setReviewSort(event.target.value as ReviewSort)} className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/8 px-4 text-sm text-black outline-none">
                    <option value="recent">Most Recent</option>
                    <option value="popular">Most Liked</option>
                    <option value="oldest">Oldest</option>
                  </select>
                </label>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-white/42">
                  Filter
                  <select value={reviewFilter} onChange={(event) => setReviewFilter(event.target.value as ReviewFilter)} className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/8 px-4 text-sm text-black outline-none">
                    <option value="all">All Reviews</option>
                    <option value="diary">Diary-linked</option>
                    <option value="standalone">Standalone</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              {reviewsLoading ? <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 text-sm text-white/56">Updating reviews...</div> : null}
              {reviews.length ? reviews.map((review) => <ReviewCard key={review.id} review={review} onReviewChange={handleReviewChange} />) : <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 text-sm text-white/56">No reviews match this view yet.</div>}
            </div>
            {reviews.length < reviewsTotal ? (
              <button type="button" onClick={handleLoadMoreReviews} disabled={loadingMoreReviews} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#f4d35e] px-5 py-3 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082] disabled:opacity-70">
                {loadingMoreReviews ? <BrandLoader className="h-4 w-auto" /> : null}
                Load more reviews
              </button>
            ) : null}
          </div>
        </div>
        <div className="xl:sticky xl:top-24 xl:self-start"><ReleaseActionPanel release={release} onReleaseChange={handleReleaseChange} onDiaryCreated={refreshReviews} /></div>
      </section>
      {overlayActive ? (
        <section
          className={`fixed inset-0 z-50 flex items-center justify-center bg-[#05070b]/78 px-4 py-8 backdrop-blur-sm transition-opacity duration-150 ease-out ${overlayVisible ? 'opacity-100' : 'opacity-0'}`}
          onClick={closeOverlayPanels}
        >
          <div
            className={`w-full max-w-2xl rounded-[1.75rem] border border-white/10 bg-[#101720] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.5)] transition-all duration-150 ease-out ${overlayVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-[0.98] opacity-0'}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8ecae6]">
                  {selectedRatingValue ? 'Ratings' : activePanel === 'logs' ? 'Logs' : activePanel === 'lists' ? 'Lists' : 'Likes'}
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-white">
                  {selectedRatingValue
                    ? `${formatRatingValue(selectedRatingValue)}-star listeners`
                    : activePanel === 'logs'
                      ? `${release.title} logs`
                      : activePanel === 'lists'
                        ? `Lists containing ${release.title}`
                        : `People who liked ${release.title}`}
                </h3>
                <p className="mt-2 text-sm text-white/60">
                  {selectedRatingValue
                    ? `Everyone who rated ${release.title} ${formatRatingValue(selectedRatingValue)} star${selectedRatingValue === 1 ? '' : 's'}.`
                    : activePanel === 'logs'
                      ? 'Every public diary log we currently have for this release.'
                      : activePanel === 'lists'
                        ? 'Public lists that include this release.'
                        : 'Everyone who liked this release.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeOverlayPanels}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-white transition hover:bg-white/[0.08]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {ratingUsersLoading || activePanelLoading ? (
                <div className="flex items-center gap-2 rounded-[1rem] bg-white/[0.04] px-4 py-3 text-sm text-white/64">
                  <BrandLoader className="h-4 w-auto" />
                  Loading...
                </div>
              ) : selectedRatingValue ? (
                ratingUsers.length ? (
                ratingUsers.map((rating) => (
                  <Link key={rating.id} href={`/users/${rating.user?.id}`} className="flex items-center justify-between gap-4 rounded-[1rem] bg-white/[0.04] px-4 py-3 transition hover:bg-white/[0.07]">
                    <div className="flex items-center gap-3">
                      {rating.user ? <UserAvatar user={rating.user} className="h-11 w-11" textClassName="text-sm" /> : null}
                      <div>
                        <p className="text-sm font-semibold text-white">{rating.user?.displayName || rating.user?.username}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-white/38">@{rating.user?.username}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#48c774]">{formatRatingValue(rating.value)} stars</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/38">{formatDateTime(rating.createdAt)}</p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-[1rem] bg-white/[0.04] px-4 py-3 text-sm text-white/60">No ratings found for this bar.</div>
              )
              ) : activePanel === 'logs' ? (
                releaseLogs.length ? (
                  releaseLogs.map((entry) => (
                    <div key={entry.id} className="rounded-[1rem] bg-white/[0.04] px-4 py-3">
                      <div className="flex items-center justify-between gap-4">
                        <Link href={`/users/${entry.user.id}`} className="flex items-center gap-3 transition hover:opacity-90">
                          <UserAvatar user={entry.user} className="h-11 w-11" textClassName="text-sm" />
                          <div>
                            <p className="text-sm font-semibold text-white">{entry.user.displayName || entry.user.username}</p>
                            <p className="text-xs uppercase tracking-[0.18em] text-white/38">@{entry.user.username}</p>
                          </div>
                        </Link>
                        <p className="text-xs uppercase tracking-[0.18em] text-white/38">{formatDateTime(entry.listenedAt)}</p>
                      </div>
                      {entry.notes ? <p className="mt-3 text-sm leading-6 text-white/72">{entry.notes}</p> : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1rem] bg-white/[0.04] px-4 py-3 text-sm text-white/60">No logs yet.</div>
                )
              ) : activePanel === 'lists' ? (
                releaseLists.length ? (
                  releaseLists.map((list) => (
                    <Link key={list.id} href={`/lists/${list.id}`} className="block rounded-[1rem] bg-white/[0.04] px-4 py-3 transition hover:bg-white/[0.07]">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{list.title}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/38">
                            by {list.user.displayName || list.user.username} · {list.itemsCount} releases
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-[#8ecae6]">{list.likesCount || 0} likes</p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-[1rem] bg-white/[0.04] px-4 py-3 text-sm text-white/60">No public lists yet.</div>
                )
              ) : releaseLikes.length ? (
                releaseLikes.map((entry) => (
                  <Link key={entry.id} href={`/users/${entry.user.id}`} className="flex items-center justify-between gap-4 rounded-[1rem] bg-white/[0.04] px-4 py-3 transition hover:bg-white/[0.07]">
                    <div className="flex items-center gap-3">
                      <UserAvatar user={entry.user} className="h-11 w-11" textClassName="text-sm" />
                      <div>
                        <p className="text-sm font-semibold text-white">{entry.user.displayName || entry.user.username}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-white/38">@{entry.user.username}</p>
                      </div>
                    </div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/38">{formatDateTime(entry.createdAt)}</p>
                  </Link>
                ))
              ) : (
                <div className="rounded-[1rem] bg-white/[0.04] px-4 py-3 text-sm text-white/60">No likes yet.</div>
              )}
            </div>
            {selectedRatingValue && ratingUsers.length < ratingUsersTotal ? (
              <button
                type="button"
                onClick={handleLoadMoreRatingUsers}
                disabled={loadingMoreRatingUsers}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#f4d35e] px-5 py-3 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082] disabled:opacity-70"
              >
                {loadingMoreRatingUsers ? <BrandLoader className="h-4 w-auto" /> : null}
                Load more listeners
              </button>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  )
}
