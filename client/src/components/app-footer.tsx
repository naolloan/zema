'use client'

import Link from 'next/link'
import { BrandMark, BrandWordmark } from '@/components/brand/brand-logo'
import { useAuthStore } from '@/store/auth-store'

const primaryLinks = [
  { href: '/explore', label: 'Explore' },
  { href: '/releases', label: 'Releases' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/lists', label: 'Lists' },
  { href: '/activity', label: 'Activity' },
]

const guestLinks = [
  { href: '/auth/login', label: 'Sign In' },
  { href: '/auth/register', label: 'Create Account' },
]

const memberLinks = [
  { href: '/profile', label: 'Profile' },
  { href: '/notifications', label: 'Notifications' },
]

export function AppFooter() {
  const user = useAuthStore((state) => state.user)
  const secondaryLinks = user ? memberLinks : guestLinks

  return (
    <footer className="relative z-10 mt-20 px-4 pb-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[1.75rem] border border-white/8 bg-[linear-gradient(180deg,rgba(11,13,18,0.72),rgba(11,13,18,0.92))] px-6 py-8 backdrop-blur-xl sm:px-8 sm:py-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <div className="flex items-center gap-3">
                <BrandMark className="h-8 w-auto shrink-0" />
                <BrandWordmark className="text-xl font-bold tracking-[0.14em] text-white" />
              </div>
              <p className="mt-4 text-sm leading-7 text-white/54">
                A social music platform for discovery, reviews, lists, listening history, and the people shaping your next play.
              </p>
            </div>

            <div className="flex flex-col gap-5 lg:items-end">
              <nav className="flex flex-wrap gap-x-5 gap-y-3">
                {primaryLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm font-medium text-white/62 transition hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="flex flex-wrap gap-x-5 gap-y-3">
                {secondaryLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm font-medium text-white/42 transition hover:text-white/72"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-white/8 pt-5 text-xs uppercase tracking-[0.18em] text-white/32 sm:flex-row sm:items-center sm:justify-between">
            <p>Built for music discovery and conversation</p>
            <p>{new Date().getFullYear()} Zeማa</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
