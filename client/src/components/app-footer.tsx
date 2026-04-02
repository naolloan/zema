'use client'

import Link from 'next/link'

const footerLinks = [
  { href: '/explore', label: 'Explore' },
  { href: '/releases', label: 'Releases' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/lists', label: 'Lists' },
  { href: '/activity', label: 'Activity' },
]

export function AppFooter() {
  return (
    <footer className="relative z-10 mt-16 border-t border-white/10 bg-[linear-gradient(180deg,rgba(10,12,18,0.2),rgba(10,12,18,0.75))]">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <p className="text-lg font-semibold tracking-[0.18em] text-white">Zeማa</p>
            <p className="mt-3 text-sm leading-7 text-white/62">
              A social music platform for discovery, ratings, reviews, lists, listening history, and the people shaping your next play.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-white/68 transition hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/8 pt-5 text-xs uppercase tracking-[0.18em] text-white/38 sm:flex-row sm:items-center sm:justify-between">
          <p>Built for music discovery and conversation</p>
          <p>{new Date().getFullYear()} Zeማa</p>
        </div>
      </div>
    </footer>
  )
}
