'use client'

import { useMemo, useState } from 'react'
import { PencilLine } from 'lucide-react'
import { BrandLoader } from '@/components/brand/brand-logo'
import type { Release, Review, User } from '@/types'
import { createReview, updateReview } from '@/lib/auth-api'

interface ReviewComposerProps {
  release: Release
  reviews: Review[]
  user: User | null
  onReviewsChange: (reviews: Review[]) => void
}

export function ReviewComposer({ release, reviews, user, onReviewsChange }: ReviewComposerProps) {
  const existingReview = useMemo(() => reviews.find((review) => review.user.id === user?.id) || null, [reviews, user?.id])
  const [content, setContent] = useState(existingReview?.content || '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!user) {
    return (
      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 text-white/64">
        Sign in to write or edit your review for this release.
      </div>
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const nextReview = existingReview
        ? await updateReview(existingReview.id, { content })
        : await createReview({ releaseId: release.id, content })

      const nextReviews = existingReview
        ? reviews.map((review) => (review.id === nextReview.id ? nextReview : review))
        : [nextReview, ...reviews]

      onReviewsChange(nextReviews)
      setMessage(existingReview ? 'Review updated.' : 'Review published.')
    } catch (caught: any) {
      setError(caught?.response?.data?.error || 'Unable to save your review right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8ecae6]">Your Review</p>
        <h3 className="mt-2 text-2xl font-semibold text-white">Write directly on the release page</h3>
      </div>
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Write whatever you want about this release"
        className="min-h-[170px] w-full rounded-[1.25rem] border border-white/10 bg-white/8 px-4 py-3 text-sm text-black placeholder:text-black/36 outline-none"
      />
      {error ? <p className="rounded-2xl border border-[#ff7b54]/30 bg-[#ff7b54]/10 px-4 py-3 text-sm text-[#ffd6cc]">{error}</p> : null}
      {message ? <p className="rounded-2xl border border-[#2a9d8f]/30 bg-[#2a9d8f]/10 px-4 py-3 text-sm text-[#d1fff3]">{message}</p> : null}
      <button
        type="submit"
        disabled={loading || !content.trim()}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#f4d35e] px-5 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? <BrandLoader className="h-4 w-auto" /> : <PencilLine className="h-4 w-4" />}
        {existingReview ? 'Update review' : 'Publish review'}
      </button>
    </form>
  )
}
