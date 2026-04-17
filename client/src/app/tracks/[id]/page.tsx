'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Clock3, ExternalLink, Hash, Music2, Send, Star } from 'lucide-react'
import { BrandLoader } from '@/components/brand/brand-logo'
import { ArtistCreditLine } from '@/components/music/artist-credit-line'
import { CoverArt } from '@/components/music/cover-art'
import { RatingPicker } from '@/components/music/rating-picker'
import { TrackReviewCard } from '@/components/music/track-review-card'
import { createTrackReview, deleteTrackReview, rateTrack, removeTrackRating, updateTrackReview } from '@/lib/auth-api'
import { getTrack, getTrackReviews } from '@/lib/music-api'
import { formatDuration, formatRatingValue } from '@/lib/utils'
import type { Track, TrackReview } from '@/types'
import { useAuthStore } from '@/store/auth-store'

function applyOptimisticTrackRatingChange(current: Track, nextValue: number | null): Track {
  const previousValue = current.userRating?.value ?? null
  if (previousValue === nextValue) {
    return current
  }

  const currentBreakdown = current.ratingBreakdown
  if (!currentBreakdown) {
    return {
      ...current,
      userRating: nextValue === null ? null : { id: current.userRating?.id || `track-rating-${current.id}`, value: nextValue },
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
    averageRating: nextAverage,
    ratingCount: nextTotal,
    counts: {
      ratings: nextTotal,
    },
    ratingBreakdown: {
      ...currentBreakdown,
      average: nextAverage,
      total: nextTotal,
      histogram,
    },
    userRating: nextValue === null ? null : { id: current.userRating?.id || `track-rating-${current.id}`, value: nextValue },
  }
}

export default function TrackPage() {
  const params = useParams<{ id: string }>()
  const user = useAuthStore((state) => state.user)
  const [track, setTrack] = useState<Track | null>(null)
  const [reviews, setReviews] = useState<TrackReview[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [ratingLoadingValue, setRatingLoadingValue] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reviewDraft, setReviewDraft] = useState('')

  useEffect(() => {
    async function loadTrackPage() {
      if (!params?.id) return
      setLoading(true)
      const [trackData, reviewData] = await Promise.all([
        getTrack(params.id),
        getTrackReviews(params.id, 24, 0),
      ])
      setTrack(trackData)
      setReviews(reviewData?.data || [])
      setLoading(false)
    }

    loadTrackPage()
  }, [params?.id])

  const currentUserReview = useMemo(
    () => (user ? reviews.find((review) => review.user.id === user.id) ?? null : null),
    [reviews, user],
  )

  useEffect(() => {
    setReviewDraft(currentUserReview?.content || '')
  }, [currentUserReview?.content])

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <BrandLoader className="h-14 w-auto" />
      </main>
    )
  }

  if (!track) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-4xl flex-col items-center justify-center gap-4 px-4 py-10 text-center sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-white">Song not found</h1>
        <p className="max-w-xl text-white/60">This song could not be loaded yet. It may not be in the catalog, or it may need to be fetched from Spotify first.</p>
        <Link href="/explore" className="rounded-full bg-[#f4d35e] px-5 py-3 text-sm font-semibold text-[#111318]">
          Back to explore
        </Link>
      </main>
    )
  }

  const currentTrack = track

  async function handleRateTrack(value: number) {
    if (!user) {
      setError('Sign in to rate this song.')
      return
    }

    setRatingLoadingValue(value)
    setError(null)
    setMessage(null)

    try {
      await rateTrack(currentTrack.id, value)
      setTrack((current) => (current ? applyOptimisticTrackRatingChange(current, value) : current))
      setMessage(`Saved your ${formatRatingValue(value)}-star song rating.`)
    } catch (caught: any) {
      setError(caught?.response?.data?.error || 'Unable to save your song rating right now.')
    } finally {
      setRatingLoadingValue(null)
    }
  }

  async function handleClearTrackRating() {
    if (!user || !currentTrack.userRating) {
      return
    }

    setRatingLoadingValue(currentTrack.userRating.value)
    setError(null)
    setMessage(null)

    try {
      await removeTrackRating(currentTrack.id)
      setTrack((current) => (current ? applyOptimisticTrackRatingChange(current, null) : current))
      setMessage('Cleared your song rating.')
    } catch (caught: any) {
      setError(caught?.response?.data?.error || 'Unable to clear your song rating right now.')
    } finally {
      setRatingLoadingValue(null)
    }
  }

  async function handleSaveReview() {
    if (!user || !reviewDraft.trim()) {
      return
    }

    setReviewLoading(true)
    setError(null)
    setMessage(null)

    try {
      const savedReview = currentUserReview
        ? await updateTrackReview(currentUserReview.id, reviewDraft.trim())
        : await createTrackReview(currentTrack.id, reviewDraft.trim())

      setReviews((current) => {
        const withoutOld = current.filter((review) => review.id !== savedReview.id && review.user.id !== savedReview.user.id)
        return [savedReview, ...withoutOld]
      })
      setMessage(currentUserReview ? 'Updated your song review.' : 'Published your song review.')
    } catch (caught: any) {
      setError(caught?.response?.data?.error || 'Unable to save your song review right now.')
    } finally {
      setReviewLoading(false)
    }
  }

  async function handleDeleteReview(reviewId: string) {
    setReviewLoading(true)
    setError(null)
    setMessage(null)

    try {
      await deleteTrackReview(reviewId)
      setReviews((current) => current.filter((review) => review.id !== reviewId))
      setReviewDraft('')
      setMessage('Deleted your song review.')
    } catch (caught: any) {
      setError(caught?.response?.data?.error || 'Unable to delete your song review right now.')
    } finally {
      setReviewLoading(false)
    }
  }

  const backdropImage = track.release?.artworkUrl

  return (
    <main className="relative overflow-hidden">
      {backdropImage ? (
        <div
          className="absolute inset-x-0 top-0 h-[26rem] bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${backdropImage})` }}
        />
      ) : null}
      <div className="absolute inset-x-0 top-0 h-[26rem] bg-[linear-gradient(180deg,rgba(7,10,14,0.55),rgba(7,10,14,0.94)_70%,rgba(7,10,14,1))]" />

      <section className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Link href={currentTrack.release ? `/releases/${currentTrack.release.id}` : '/explore'} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/72 transition hover:bg-white/[0.08] hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          {currentTrack.release ? 'Back to release' : 'Back to explore'}
        </Link>

        <div className="mt-8 grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-start">
          <div>
            <CoverArt
              title={currentTrack.release?.title || currentTrack.title}
              artworkUrl={currentTrack.release?.artworkUrl || null}
              className="aspect-square w-full overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_28px_90px_rgba(0,0,0,0.4)]"
            />
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8ecae6]">Song Profile</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">{currentTrack.title}</h1>
              <ArtistCreditLine credits={currentTrack.artistCredits} className="mt-4 block text-base text-white/72" />
              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-semibold text-white/62">
                {currentTrack.release ? (
                  <Link href={`/releases/${currentTrack.release.id}`} className="rounded-full border border-[#f4d35e]/18 bg-[#f4d35e]/10 px-3 py-1.5 text-[#ffe082] transition hover:bg-[#f4d35e]/18">
                    From {currentTrack.release.title}
                  </Link>
                ) : null}
                {currentTrack.spotifyUrl ? (
                  <a
                    href={currentTrack.spotifyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-[#1db954]/24 bg-[#1db954]/12 px-3 py-1.5 text-[#d8ffe6] transition hover:bg-[#1db954]/18"
                  >
                    Open in Spotify
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.09),rgba(255,255,255,0.04))] p-6 shadow-[0_18px_55px_rgba(0,0,0,0.18)]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f4d35e]">Song Details</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.35rem] border border-white/8 bg-[#0f141d]/74 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/42">
                    <Clock3 className="h-4 w-4 text-[#8ecae6]" />
                    Runtime
                  </div>
                <p className="mt-3 text-2xl font-semibold text-white">{currentTrack.duration ? formatDuration(currentTrack.duration) : '--:--'}</p>
                </div>
                <div className="rounded-[1.35rem] border border-white/8 bg-[#0f141d]/74 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/42">
                    <Hash className="h-4 w-4 text-[#f4d35e]" />
                    Position
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    {currentTrack.trackNumber
                      ? currentTrack.discNumber && currentTrack.discNumber > 1
                        ? `Disc ${currentTrack.discNumber} • Track ${currentTrack.trackNumber}`
                        : `Track ${currentTrack.trackNumber}`
                      : 'Unlisted'}
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-[1.35rem] border border-white/8 bg-[#0f141d]/74 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/42">
                  <Music2 className="h-4 w-4 text-[#2a9d8f]" />
                  Context
                </div>
                <p className="mt-3 text-sm leading-7 text-white/72">
                  {currentTrack.release
                    ? `${currentTrack.title} lives inside ${currentTrack.release.title}, so this page focuses on the song itself while still linking you back to the full release.`
                    : `${currentTrack.title} is currently cataloged as a standalone song with no linked release yet.`}
                </p>
              </div>
              <div className="mt-4 rounded-[1.35rem] border border-white/8 bg-[#0f141d]/74 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/42">
                      <Star className="h-4 w-4 text-[#f4d35e]" />
                      Song Rating
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-white">
                      {typeof currentTrack.averageRating === 'number' && currentTrack.ratingCount
                        ? currentTrack.averageRating.toFixed(1)
                        : 'N/A'}
                    </p>
                    <p className="mt-1 text-sm text-white/56">
                      {currentTrack.ratingCount || 0} rating{currentTrack.ratingCount === 1 ? '' : 's'} from listeners
                    </p>
                  </div>
                  {currentTrack.userRating ? (
                    <div className="rounded-full border border-[#f4d35e]/25 bg-[#f4d35e]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#f8e7a2]">
                      Your rating: {formatRatingValue(currentTrack.userRating.value)}
                    </div>
                  ) : null}
                </div>
                <div className="mt-4">
                  <RatingPicker
                    value={currentTrack.userRating?.value ?? null}
                    loadingValue={ratingLoadingValue}
                    onRate={handleRateTrack}
                    onClear={handleClearTrackRating}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8ecae6]">Song Reviews</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">What people are saying about this song</h2>
                </div>
                <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/52">
                  {reviews.length} review{reviews.length === 1 ? '' : 's'}
                </div>
              </div>

              {user ? (
                <div className="mt-6 rounded-[1.5rem] border border-white/8 bg-[#0f141d]/82 p-4">
                  <p className="text-sm font-semibold text-white">{currentUserReview ? 'Edit your song review' : 'Write a song review'}</p>
                  <textarea
                    value={reviewDraft}
                    onChange={(event) => setReviewDraft(event.target.value)}
                    placeholder="Write whatever you want about this song."
                    className="mt-4 min-h-[140px] w-full rounded-[1.25rem] border border-white/10 bg-white/8 px-4 py-3 text-sm text-black placeholder:text-black/36 outline-none transition focus:border-white/20"
                  />
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSaveReview}
                      disabled={reviewLoading || reviewDraft.trim().length === 0}
                      className="inline-flex items-center gap-2 rounded-full bg-[#f4d35e] px-5 py-2.5 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082] disabled:opacity-60"
                    >
                      {reviewLoading ? <BrandLoader className="h-4 w-auto" /> : <Send className="h-4 w-4" />}
                      {currentUserReview ? 'Update review' : 'Publish review'}
                    </button>
                    {currentUserReview ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteReview(currentUserReview.id)}
                        disabled={reviewLoading}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white/72 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-60"
                      >
                        Delete review
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="mt-6 text-white/64">Sign in to review this song.</p>
              )}

              {message ? <p className="mt-4 rounded-2xl border border-[#8ecae6]/30 bg-[#8ecae6]/10 px-4 py-3 text-sm text-[#d7f2ff]">{message}</p> : null}
              {error ? <p className="mt-4 rounded-2xl border border-[#ff7b54]/30 bg-[#ff7b54]/10 px-4 py-3 text-sm text-[#ffd6cc]">{error}</p> : null}

              <div className="mt-6 space-y-4">
                {reviews.length ? (
                  reviews.map((review) => (
                    <TrackReviewCard key={review.id} review={review} onDelete={handleDeleteReview} />
                  ))
                ) : (
                  <p className="rounded-[1.5rem] border border-white/8 bg-[#0f141d]/74 px-5 py-6 text-sm text-white/60">
                    No one has reviewed this song yet. Start the conversation.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
