'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageSquare } from 'lucide-react'
import { BrandLoader } from '@/components/brand/brand-logo'
import { ReviewCard } from '@/components/music/review-card'
import { getRecentReviews } from '@/lib/music-api'
import type { Review } from '@/types'

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    async function loadInitial() {
      setLoading(true)
      const response = await getRecentReviews(12, 0)
      setReviews(response?.data || [])
      setTotal(response?.pagination.total || 0)
      setLoading(false)
    }

    loadInitial()
  }, [])

  async function handleLoadMore() {
    setLoadingMore(true)
    const response = await getRecentReviews(12, reviews.length)
    if (response?.data?.length) {
      setReviews((current) => [...current, ...response.data])
      setTotal(response.pagination.total)
    }
    setLoadingMore(false)
  }

  function handleReviewChange(nextReview: Review) {
    setReviews((current) => current.map((review) => (review.id === nextReview.id ? nextReview : review)))
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(255,123,84,0.22),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(142,202,230,0.14),_transparent_24%),linear-gradient(145deg,_rgba(20,26,36,0.92),_rgba(10,14,21,0.76))] p-8 shadow-[0_22px_70px_rgba(0,0,0,0.26)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#ff7b54]">Community Reviews</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight text-white">Recent writing from across Zeማa</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-white/68">
          Drop into what listeners are saying right now, then jump from the writing into profiles, releases, and the wider conversation.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/activity" className="rounded-full border border-white/12 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.08]">
            Browse community activity
          </Link>
          <Link href="/explore" className="rounded-full border border-white/12 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.08]">
            Explore releases
          </Link>
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center text-white/70"><BrandLoader className="h-5 w-auto" /></div>
      ) : reviews.length ? (
        <section className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} onReviewChange={handleReviewChange} />
          ))}
          {reviews.length < total ? (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 rounded-full bg-[#f4d35e] px-5 py-3 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082] disabled:opacity-70"
            >
              {loadingMore ? <BrandLoader className="h-4 w-auto" /> : <MessageSquare className="h-4 w-4" />}
              Load more reviews
            </button>
          ) : null}
        </section>
      ) : (
        <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(20,26,36,0.78),rgba(10,14,21,0.64))] p-8 text-white/60">No community reviews yet.</div>
      )}
    </main>
  )
}
