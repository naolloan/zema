'use client'

import { useState } from 'react'
import { UserPlus, UserRoundCheck } from 'lucide-react'
import { BrandLoader } from '@/components/brand/brand-logo'
import { followUser, unfollowUser } from '@/lib/auth-api'

interface FollowButtonProps {
  userId: string
  initialIsFollowing: boolean
  onRelationshipChange?: (state: { isFollowing: boolean; isFollowedBy: boolean; isFriend: boolean }) => void
}

export function FollowButton({ userId, initialIsFollowing, onRelationshipChange }: FollowButtonProps) {
  const [pending, setPending] = useState(false)
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)

  async function handleClick() {
    if (pending) return

    setPending(true)
    try {
      const next = isFollowing ? await unfollowUser(userId) : await followUser(userId)
      setIsFollowing(next.isFollowing)
      onRelationshipChange?.(next)
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={isFollowing
        ? 'inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:opacity-70'
        : 'inline-flex items-center gap-2 rounded-full bg-[#f4d35e] px-5 py-3 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082] disabled:opacity-70'}
    >
      {pending ? <BrandLoader className="h-4 w-auto" /> : isFollowing ? <UserRoundCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
      {isFollowing ? 'Following' : 'Follow'}
    </button>
  )
}
