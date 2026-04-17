'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity } from 'lucide-react'
import { BrandLoader } from '@/components/brand/brand-logo'
import { getMyDiary } from '@/lib/auth-api'
import { formatDate } from '@/lib/utils'
import type { DiaryEntry } from '@/types'
import { useAuthStore } from '@/store/auth-store'
import { ArtistCreditLine } from '@/components/music/artist-credit-line'
import { CoverArt } from '@/components/music/cover-art'

export default function DiaryPage() {
  const { user, hydrated, hydrate, clearSession } = useAuthStore((state) => ({
    user: state.user,
    hydrated: state.hydrated,
    hydrate: state.hydrate,
    clearSession: state.clearSession,
  }))
  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    async function loadDiary() {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const response = await getMyDiary(20, 0)
        setEntries(response.data)
        setTotal(response.pagination.total)
      } catch {
        clearSession()
      } finally {
        setLoading(false)
      }
    }

    if (hydrated) {
      loadDiary()
    }
  }, [clearSession, hydrated, user])

  async function handleLoadMore() {
    setLoadingMore(true)
    try {
      const response = await getMyDiary(20, entries.length)
      setEntries((current) => [...current, ...response.data])
      setTotal(response.pagination.total)
    } catch {
      clearSession()
    } finally {
      setLoadingMore(false)
    }
  }

  if (!hydrated || loading) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 py-10 text-white/70">
        <BrandLoader className="h-5 w-auto" />
      </main>
    )
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-white">
          <h1 className="text-3xl font-semibold">Sign in to open your diary</h1>
          <p className="mt-3 text-white/64">Your diary becomes the timeline of what you listened to, when you heard it, and what you thought about it.</p>
          <div className="mt-6 flex gap-3">
            <Link href="/auth/login" className="rounded-full bg-[#f4d35e] px-5 py-3 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082]">Sign In</Link>
            <Link href="/auth/register" className="rounded-full border border-white/12 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.08]">Create Account</Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f4d35e]">Listening Diary</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight text-white">Your listening timeline</h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-white/66">
          Each entry marks a listening session. When you add review text, that review becomes part of the conversation around the release too.
        </p>
      </section>

      {entries.length ? (
        <section className="space-y-4">
          {entries.map((entry) => (
            <article key={entry.id} className="grid gap-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:grid-cols-[140px_1fr]">
              <CoverArt title={entry.release.title} artworkUrl={entry.release.artworkUrl} className="max-w-[140px]" />
              <div>
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-white/45">
                  <span>{formatDate(entry.listenedAt)}</span>
                  <span>{entry.release.type}</span>
                </div>
                <Link href={`/releases/${entry.release.id}`} className="mt-3 block text-2xl font-semibold text-white transition hover:text-[#f4d35e]">
                  {entry.release.title}
                </Link>
                <ArtistCreditLine credits={entry.release.artistCredits} className="mt-2 block text-sm text-white/60" />
                {entry.notes ? <p className="mt-4 text-sm leading-7 text-white/72">{entry.notes}</p> : null}
                {entry.review ? (
                  <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-[#111318]/70 p-4 text-sm text-white/72">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8ecae6]">Attached Review</p>
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
              Load more diary entries
            </button>
          ) : null}
        </section>
      ) : (
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-white/60">
          You have not logged any listening yet. Once you start using the diary, entries will appear here in chronological order.
        </div>
      )}
    </main>
  )
}
