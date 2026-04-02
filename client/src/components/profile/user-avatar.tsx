'use client'

import type { User } from '@/types'

interface UserAvatarProps {
  user: Pick<User, 'username' | 'displayName' | 'avatarUrl'>
  className?: string
  textClassName?: string
}

export function UserAvatar({ user, className = 'h-16 w-16', textClassName = 'text-xl' }: UserAvatarProps) {
  const label = user.displayName || user.username
  const initials = label
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || user.username.slice(0, 2).toUpperCase()

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
    <div className={`${className} flex items-center justify-center rounded-full border border-white/12 bg-gradient-to-br from-[#ff7b54] via-[#f4d35e] to-[#2a9d8f] text-[#111318] shadow-[0_12px_36px_rgba(0,0,0,0.28)]`}>
      <span className={`font-semibold uppercase ${textClassName}`}>{initials}</span>
    </div>
  )
}
