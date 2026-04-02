'use client'

import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { BrandLoader } from '@/components/brand/brand-logo'
import { likeList, unlikeList } from '@/lib/auth-api'
import { useAuthStore } from '@/store/auth-store'

interface ListLikeButtonProps {
  listId: string
  ownerId: string
  initialLikesCount?: number
  initialIsLiked?: boolean
}

export function ListLikeButton({ listId, ownerId, initialLikesCount = 0, initialIsLiked = false }: ListLikeButtonProps) {
  const { user, hydrated, hydrate } = useAuthStore((state) => ({
    user: state.user,
    hydrated: state.hydrated,
    hydrate: state.hydrate,
  }))
  const [pending, setPending] = useState(false)
  const [likesCount, setLikesCount] = useState(initialLikesCount)
  const [isLiked, setIsLiked] = useState(initialIsLiked)

  useEffect(() => {
    if (!hydrated) {
      hydrate()
    }
  }, [hydrate, hydrated])

  useEffect(() => {
    setLikesCount(initialLikesCount)
    setIsLiked(initialIsLiked)
  }, [initialIsLiked, initialLikesCount])

  const canLike = Boolean(user && user.id !== ownerId)

  async function handleToggle() {
    if (!canLike || pending) {
      return
    }

    setPending(true)
    const previous = { likesCount, isLiked }
    const optimistic = !isLiked
    setIsLiked(optimistic)
    setLikesCount(Math.max(0, likesCount + (optimistic ? 1 : -1)))

    try {
      const result = optimistic ? await likeList(listId) : await unlikeList(listId)
      setIsLiked(result.isLiked)
      setLikesCount(result.likesCount)
    } catch {
      setLikesCount(previous.likesCount)
      setIsLiked(previous.isLiked)
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        handleToggle()
      }}
      disabled={!canLike || pending}
      className={isLiked
        ? 'inline-flex items-center gap-2 rounded-full bg-[#ff7b54]/18 px-3 py-2 text-sm font-semibold text-[#ffe2d8] transition hover:bg-[#ff7b54]/24 disabled:cursor-not-allowed disabled:opacity-60'
        : 'inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60'}
    >
      {pending ? <BrandLoader className="h-4 w-auto" /> : <Heart className={isLiked ? 'h-4 w-4 fill-current' : 'h-4 w-4'} />}
      {likesCount}
    </button>
  )
}
