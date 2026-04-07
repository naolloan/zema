'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, ExternalLink, Music2, Star } from 'lucide-react'
import { BrandLoader } from '@/components/brand/brand-logo'
import { ArtistCreditLine } from '@/components/music/artist-credit-line'
import { CoverArt } from '@/components/music/cover-art'
import { RatingPicker } from '@/components/music/rating-picker'
import { getTrack } from '@/lib/music-api'
import { removeTrackRating, rateTrack } from '@/lib/auth-api'
import { formatDuration, formatRatingValue } from '@/lib/utils'
import type { Track } from '@/types'
import { useAuthStore } from '@/store/auth-store'

function renderStarRow(average: number) {
  const fullStars = Math.round(average)
  return Array.from({ length: 5 }, (_, index) => (
    <Star
      key={index}
      className={index < fullStars ? 'h-4 w-4 fill-current text-[#48c774]' : 'h-4 w-4 text-white/20'}
    />
  ))
}

function applyOptimisticTrackRatingChange(current: Track, nextRating: { id: string; value: number } | null): Track {
  const previousValue = current.userRating?.value ?? null
  const upcomingValue = nextRating?.value ?? null

  if (previousValue === upcomingValue) {
    return current
  }

  const currentBreakdown = current.ratingBreakdown
  if (!currentBreakdown) {
    return {
      ...current,
      userRating: nextRating,
    }
  }

  const histogram = currentBreakdown.histogram.map((bucket) => ({ ...bucket }))
  const previousIndex = previousValue === null ? -1 : histogram.findIndex((bucket) => bucket.value === previousValue)
  const nextIndex = upcomingValue === null ? -1 : histogram.findIndex((bucket) => bucket.value === upcomingValue)

  if (previousIndex >= 0) {
    histogram[previousIndex] = { ...histogram[previousIndex], count: Math.max(0, histogram[previousIndex].count - 1) }
  }

  if (nextIndex >= 0) {
    histogram[nextIndex] = { ...histogram[nextIndex], count: histogram[nextIndex].count + 1 }
  }

  const currentTotal = currentBreakdown.total || current.ratingCount || 0
  const currentAverage = currentBreakdown.average || current.averageRating || 0
  const nextTotal = currentTotal + (upcomingValue !== null ? 1 : 0) - (previousValue !== null ? 1 : 0)
  const currentSum = currentAverage * currentTotal
  const nextSum = currentSum + (upcomingValue ?? 0) - (previousValue ?? 0)
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
    userRating: nextRating,
  }
}

export default function TrackPage() {
  const params = useParams<{ id: string }>()
  const user = useAuthStore((state) => state.user)
  const [track, setTrack] = useState<Track | null>(null)
  const [loading, setLoading] = useState(true)
  const [ratingLoading, setRatingLoading] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTrack() {
      if (!params?.id) return
      setLoading(true)
      const data = await getTrack(params.id)
      setTrack(data)
      setLoading(false)
    }

    loadTrack()
  }, [params?.id])

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
        <h1 className="text-3xl font-semibold text-white">Track not found</h1>
        <p className="max-w-xl text-white/60">This track could not be loaded yet. It may not be in the catalog, or it may need to be fetched from Spotify first.</p>
        <Link href="/explore" className="rounded-full bg-[#f4d35e] px-5 py-3 text-sm font-semibold text-[#111318]">
          Back to explore
        </Link>
      </main>
    )
  }

  const currentTrack = track

  async function handleRate(value: number) {
    setError(null)
    setMessage(null)
    setRatingLoading(value)

    const previousTrack = currentTrack
    const optimisticTrack = applyOptimisticTrackRatingChange(currentTrack, {
      id: currentTrack.userRating?.id || 'local',
      value,
    })
    setTrack(optimisticTrack)

    try {
      const savedRating = await rateTrack(currentTrack.id, value)
      setTrack((current) => (current ? { ...current, userRating: savedRating } : current))
      setMessage(`Saved your ${formatRatingValue(value)}-star track rating.`)
    } catch (caught: any) {
      setTrack(previousTrack)
      setError(caught?.response?.data?.error || 'Unable to save your track rating right now.')
    } finally {
      setRatingLoading(null)
    }
  }

  async function handleClearRating() {
    if (!currentTrack.userRating) {
      return
    }

    setError(null)
    setMessage(null)
    setRatingLoading(-1)

    const previousTrack = currentTrack
    setTrack(applyOptimisticTrackRatingChange(currentTrack, null))

    try {
      await removeTrackRating(currentTrack.id)
      setMessage('Removed your track rating.')
    } catch (caught: any) {
      setTrack(previousTrack)
      setError(caught?.response?.data?.error || 'Unable to clear your track rating right now.')
    } finally {
      setRatingLoading(null)
    }
  }

  const backdropImage = currentTrack.release?.artworkUrl
  const totalRatings = currentTrack.ratingBreakdown?.total || currentTrack.ratingCount || 0

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

        <div className="mt-8 grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <CoverArt
              title={currentTrack.release?.title || currentTrack.title}
              artworkUrl={currentTrack.release?.artworkUrl || null}
              className="aspect-square w-full overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_28px_90px_rgba(0,0,0,0.4)]"
            />
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8ecae6]">Track Profile</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">{currentTrack.title}</h1>
              <ArtistCreditLine credits={currentTrack.artistCredits} className="mt-4 block text-base text-white/72" />
              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-semibold text-white/62">
                {currentTrack.trackNumber ? <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">Track {currentTrack.trackNumber}</span> : null}
                {currentTrack.duration ? <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">{formatDuration(currentTrack.duration)}</span> : null}
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

            <div className="grid gap-4 rounded-[1.75rem] border border-white/10 bg-[#0f141d]/78 p-5 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">Track Rating</p>
                <div className="mt-4 flex items-end gap-3">
                  <span className="text-5xl font-semibold tracking-tight text-white">{(currentTrack.averageRating || 0).toFixed(1)}</span>
                  <span className="pb-2 text-sm text-white/52">{totalRatings} ratings</span>
                </div>
                <div className="mt-3 flex items-center gap-1">{renderStarRow(currentTrack.averageRating || 0)}</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">Track Stats</p>
                <div className="mt-4 grid gap-3 text-sm text-white/72">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2"><Music2 className="h-4 w-4 text-[#8ecae6]" /> Ratings</span>
                    <span className="font-semibold text-white">{currentTrack.counts?.ratings || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Release</span>
                    <span className="font-semibold text-white">{currentTrack.release?.title || 'Standalone track'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Artists</span>
                    <span className="font-semibold text-white">{currentTrack.artistCredits.length}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
              {user ? (
                <RatingPicker
                  value={currentTrack.userRating?.value ?? null}
                  loadingValue={ratingLoading}
                  onRate={handleRate}
                  onClear={currentTrack.userRating ? handleClearRating : undefined}
                />
              ) : (
                <p className="text-white/64">Sign in to rate this track and add your listening opinion to the catalog.</p>
              )}
              {message ? <p className="mt-4 rounded-2xl border border-[#8ecae6]/30 bg-[#8ecae6]/10 px-4 py-3 text-sm text-[#d7f2ff]">{message}</p> : null}
              {error ? <p className="mt-4 rounded-2xl border border-[#ff7b54]/30 bg-[#ff7b54]/10 px-4 py-3 text-sm text-[#ffd6cc]">{error}</p> : null}
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f4d35e]">Track Ratings</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">How listeners are rating this song</h2>
                </div>
              </div>
              <div className="mt-6 grid gap-3">
                {(currentTrack.ratingBreakdown?.histogram || []).slice().reverse().map((bucket) => {
                  const total = currentTrack.ratingBreakdown?.total || 0
                  const percent = total > 0 ? Math.round((bucket.count / total) * 100) : 0
                  return (
                    <div key={bucket.value} className="grid grid-cols-[4rem_1fr_auto] items-center gap-4">
                      <span className="text-sm font-semibold text-white/72">{formatRatingValue(bucket.value)}</span>
                      <div className="h-3 overflow-hidden rounded-full bg-white/8" title={`${bucket.count} rating${bucket.count === 1 ? '' : 's'} • ${percent}%`}>
                        <div className="h-full rounded-full bg-[linear-gradient(90deg,#48c774,#8ecae6)]" style={{ width: `${Math.max(percent, bucket.count ? 4 : 0)}%` }} />
                      </div>
                      <span className="text-sm text-white/48">{bucket.count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
