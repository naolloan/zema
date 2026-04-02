'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity } from 'lucide-react'
import { BrandLoader } from '@/components/brand/brand-logo'
import { ArtistCreditLine } from '@/components/music/artist-credit-line'
import { CoverArt } from '@/components/music/cover-art'
import { getRecentDiaryEntries } from '@/lib/music-api'
import { formatDate } from '@/lib/utils'
import type { DiaryEntry } from '@/types'

export default function ActivityPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    async function loadInitial() {
      setLoading(true)
      const response = await getRecentDiaryEntries(12, 0)
      setEntries(response?.data || [])
      setTotal(response?.pagination.total || 0)
      setLoading(false)
    }

    loadInitial()
  }, [])

  async function handleLoadMore() {
    setLoadingMore(true)
    const response = await getRecentDiaryEntries(12, entries.length)
    if (response?.data?.length) {
      setEntries((current) => [...current, ...response.data])
      setTotal(response.pagination.total)
    }
    setLoadingMore(false)
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(42,157,143,0.18),_transparent_32%),linear-gradient(145deg,_rgba(255,255,255,0.08),_rgba(255,255,255,0.03))] p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#2a9d8f]">Community Activity</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight text-white">A rolling feed of what people are listening to</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-white/68">
          See what listeners logged most recently, then jump into the release page or the person behind the entry to follow the thread further.
        </p>
      </section>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center text-white/70"><BrandLoader className="h-5 w-auto" /></div>
      ) : entries.length ? (
        <section className="space-y-4">
          {entries.map((entry) => (
            <article key={entry.id} className="grid gap-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:grid-cols-[140px_1fr]">
              <CoverArt title={entry.release.title} artworkUrl={entry.release.artworkUrl} className="max-w-[140px]" />
              <div>
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-white/45">
                  <span>{formatDate(entry.listenedAt)}</span>
                  <span>{entry.release.type}</span>
                  {entry.user ? <Link href={`/users/${entry.user.id}`} className="text-[#8ecae6] transition hover:text-[#b9e4f4]">{entry.user.displayName || entry.user.username}</Link> : null}
                </div>
                <Link href={`/releases/${entry.release.id}`} className="mt-3 block text-2xl font-semibold text-white transition hover:text-[#f4d35e]">
                  {entry.release.title}
                </Link>
                <ArtistCreditLine credits={entry.release.artistCredits} className="mt-2 block text-sm text-white/60" />
                {entry.notes ? <p className="mt-4 text-sm leading-7 text-white/72">{entry.notes}</p> : null}
                {entry.review ? (
                  <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-[#111318]/70 p-4 text-sm text-white/72">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8ecae6]">Linked Review</p>
                    <p className="mt-2 leading-7">{entry.review.content}</p>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
          {entries.length < total ? (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 rounded-full bg-[#f4d35e] px-5 py-3 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082] disabled:opacity-70"
            >
              {loadingMore ? <BrandLoader className="h-4 w-auto" /> : <Activity className="h-4 w-4" />}
              Load more activity
            </button>
          ) : null}
        </section>
      ) : (
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-white/60">No listening activity yet.</div>
      )}
    </main>
  )
}
