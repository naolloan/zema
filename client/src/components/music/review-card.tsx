'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Heart, MessageCircle, Send, Trash2 } from 'lucide-react'
import { BrandLoader } from '@/components/brand/brand-logo'
import { addReviewComment, deleteReviewComment, toggleReviewLike } from '@/lib/auth-api'
import { UserAvatar } from '@/components/profile/user-avatar'
import { formatDate, truncateText } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import type { Review } from '@/types'

interface ReviewCardProps {
  review: Review
  onReviewChange?: (review: Review) => void
}

export function ReviewCard({ review, onReviewChange }: ReviewCardProps) {
  const { user, hydrated, hydrate } = useAuthStore((state) => ({
    user: state.user,
    hydrated: state.hydrated,
    hydrate: state.hydrate,
  }))
  const [pending, setPending] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentValue, setCommentValue] = useState('')
  const [commentPending, setCommentPending] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)
  const [localReview, setLocalReview] = useState(review)
  const canLike = useMemo(() => Boolean(user && user.id !== localReview.user.id), [localReview.user.id, user])
  const canComment = useMemo(() => Boolean(user), [user])

  function getErrorMessage(caught: any) {
    return caught?.response?.data?.error || caught?.response?.data?.error?.message || 'Unable to complete that action right now.'
  }

  useEffect(() => {
    if (!hydrated) {
      hydrate()
    }
  }, [hydrate, hydrated])

  useEffect(() => {
    setLocalReview(review)
  }, [review])

  async function handleToggleLike() {
    if (!canLike || pending) {
      return
    }

    setPending(true)
    const previousReview = localReview
    const optimisticIsLiked = !Boolean(localReview.isLiked)
    const optimisticReview = {
      ...localReview,
      isLiked: optimisticIsLiked,
      likesCount: Math.max(0, localReview.likesCount + (optimisticIsLiked ? 1 : -1)),
    }
    setLocalReview(optimisticReview)
    onReviewChange?.(optimisticReview)

    try {
      const result = await toggleReviewLike(localReview.id)
      const nextReview = {
        ...optimisticReview,
        isLiked: result.isLiked,
        likesCount: Math.max(0, previousReview.likesCount + (result.isLiked ? 1 : 0) - (previousReview.isLiked ? 1 : 0)),
      }
      setLocalReview(nextReview)
      onReviewChange?.(nextReview)
    } catch {
      setLocalReview(previousReview)
      onReviewChange?.(previousReview)
    } finally {
      setPending(false)
    }
  }

  async function handleAddComment() {
    if (!canComment || !commentValue.trim() || commentPending) {
      return
    }

    setCommentPending(true)
    setCommentError(null)

    try {
      const comment = await addReviewComment(localReview.id, { content: commentValue.trim() })
      const nextReview = {
        ...localReview,
        comments: [...localReview.comments, comment],
      }
      setLocalReview(nextReview)
      onReviewChange?.(nextReview)
      setCommentValue('')
    } catch (caught: any) {
      setCommentError(getErrorMessage(caught))
    } finally {
      setCommentPending(false)
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!user || commentPending) {
      return
    }

    setCommentPending(true)
    setCommentError(null)

    try {
      await deleteReviewComment(localReview.id, commentId)
      const nextReview = {
        ...localReview,
        comments: localReview.comments.filter((comment) => comment.id !== commentId),
      }
      setLocalReview(nextReview)
      onReviewChange?.(nextReview)
    } catch (caught: any) {
      setCommentError(getErrorMessage(caught))
    } finally {
      setCommentPending(false)
    }
  }

  return (
    <article className="rounded-[1.75rem] border border-[#ff7b54]/14 bg-[radial-gradient(circle_at_top_left,_rgba(255,123,84,0.12),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.08),_rgba(255,255,255,0.04))] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.16)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href={`/users/${localReview.user.id}`} className="text-sm font-semibold text-white transition hover:text-[#ffe082]">
            {localReview.user.displayName || localReview.user.username}
          </Link>
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">{formatDate(localReview.createdAt)}</p>
        </div>
        {canLike ? (
          <button
            type="button"
            onClick={handleToggleLike}
            disabled={pending}
            className={localReview.isLiked ? 'inline-flex items-center gap-1 rounded-full bg-[#ff7b54]/24 px-2.5 py-1 text-xs text-[#ffe2d8] transition hover:bg-[#ff7b54]/32 disabled:opacity-60' : 'inline-flex items-center gap-1 rounded-full bg-white/8 px-2.5 py-1 text-xs text-white/72 transition hover:bg-white/12 disabled:opacity-60'}
          >
            <Heart className={localReview.isLiked ? 'h-3.5 w-3.5 fill-current' : 'h-3.5 w-3.5'} />
            {localReview.likesCount}
          </button>
        ) : (
          <div className="inline-flex items-center gap-1 rounded-full bg-white/8 px-2.5 py-1 text-xs text-white/72">
            <Heart className="h-3.5 w-3.5" />
            {localReview.likesCount}
          </div>
        )}
      </div>
      <p className="mt-4 text-sm leading-7 text-white/80">{truncateText(localReview.content, 280)}</p>
      <Link href={`/releases/${localReview.release.id}`} className="mt-4 inline-flex rounded-full bg-[#111318]/74 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#8ecae6] transition hover:text-[#d0effa]">
        {localReview.release.title}
      </Link>
      <div className="mt-5 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={() => setCommentsOpen((current) => !current)}
          className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/72 transition hover:bg-white/12"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {localReview.comments.length}
        </button>
        {commentsOpen ? (
          <>
            <div className="mt-3 space-y-3">
              {localReview.comments.map((comment) => (
                <div key={comment.id} className="rounded-2xl border border-white/8 bg-[#0f141d]/88 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <UserAvatar user={comment.user} className="h-10 w-10" textClassName="text-sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">{comment.user.displayName || comment.user.username}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-white/40">{formatDate(comment.createdAt)}</p>
                      </div>
                    </div>
                    {user?.id === comment.user.id ? (
                      <button type="button" onClick={() => handleDeleteComment(comment.id)} className="text-white/45 transition hover:text-[#ffb4a2]">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/76">{comment.content}</p>
                </div>
              ))}
            </div>
            {canComment ? (
              <div className="mt-4">
                <div className="flex gap-2">
                  <input
                    value={commentValue}
                    onChange={(event) => setCommentValue(event.target.value)}
                    placeholder="Write a comment"
                    className="h-11 flex-1 rounded-full border border-white/10 bg-white/8 px-4 text-sm text-black placeholder:text-white/38 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddComment}
                    disabled={commentPending || commentValue.trim().length < 2}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#f4d35e] px-4 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082] disabled:opacity-60"
                  >
                    {commentPending ? <BrandLoader className="h-4 w-auto" /> : <Send className="h-4 w-4" />}
                    Reply
                  </button>
                </div>
                {commentError ? <p className="mt-2 text-sm text-[#ffb4a2]">{commentError}</p> : null}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </article>
  )
}
