'use client'

import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { UserAvatar } from '@/components/profile/user-avatar'
import { formatDate } from '@/lib/utils'
import type { TrackReview } from '@/types'
import { useAuthStore } from '@/store/auth-store'

interface TrackReviewCardProps {
  review: TrackReview
  onDelete?: (reviewId: string) => void
}

export function TrackReviewCard({ review, onDelete }: TrackReviewCardProps) {
  const user = useAuthStore((state) => state.user)
  const canDelete = user?.id === review.user.id

  return (
    <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.16)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <UserAvatar user={review.user} className="h-11 w-11" textClassName="text-sm" />
          <div>
            <Link href={`/users/${review.user.id}`} className="text-sm font-semibold text-white transition hover:text-[#ffe082]">
              {review.user.displayName || review.user.username}
            </Link>
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">{formatDate(review.createdAt)}</p>
          </div>
        </div>
        {canDelete && onDelete ? (
          <button
            type="button"
            onClick={() => onDelete(review.id)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/55 transition hover:border-[#ff7b54]/30 hover:bg-[#ff7b54]/10 hover:text-[#ffb4a2]"
            aria-label="Delete track review"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <p className="mt-4 text-sm leading-7 text-white/80">{review.content}</p>
    </article>
  )
}
