'use client'

import { UserCircle2 } from 'lucide-react'
import type { User } from '@/types'

interface UserAvatarProps {
  user: Pick<User, 'username' | 'displayName' | 'avatarUrl'>
  className?: string
  textClassName?: string
}

export function UserAvatar({ user, className = 'h-16 w-16', textClassName = 'text-xl' }: UserAvatarProps) {
  const label = user.displayName || user.username

  if (user.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt={label}
        className={`${className} rounded-full border border-white/12 object-cover shadow-[0_12px_36px_rgba(0,0,0,0.28)]`}
      />
    )
  }

  return (
    <div className={`${className} flex items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-white/48 shadow-[0_12px_36px_rgba(0,0,0,0.28)]`}>
      <UserCircle2 className={`h-[68%] w-[68%] ${textClassName}`} />
    </div>
  )
}
