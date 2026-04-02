'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth-store'

export function HomeHeroActions({ centered = false }: { centered?: boolean }) {
  const { user, hydrated, hydrate } = useAuthStore((state) => ({
    user: state.user,
    hydrated: state.hydrated,
    hydrate: state.hydrate,
  }))

  const wrapperClassName = centered
    ? 'mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center'
    : 'mt-8 flex flex-col gap-3 sm:flex-row'

  useEffect(() => {
    hydrate()
  }, [hydrate])

  if (!hydrated) {
    return (
      <div className={wrapperClassName}>
        <div className="h-12 w-44 rounded-full bg-white/8" />
        <div className="h-12 w-40 rounded-full bg-white/8" />
      </div>
    )
  }

  if (user) {
    return (
      <div className={wrapperClassName}>
        <Link
          href="/explore"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#48c774] px-7 py-3 text-sm font-semibold text-[#09110d] transition hover:bg-[#64da89]"
        >
          Continue Exploring
        </Link>
        <Link
          href="/diary"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-7 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.08]"
        >
          Open Your Diary
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className={wrapperClassName}>
      <Link
        href="/auth/register"
        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#48c774] px-7 py-3 text-sm font-semibold text-[#09110d] transition hover:bg-[#64da89]"
      >
        Create Your Account
      </Link>
      <Link
        href="/explore"
        className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-7 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.08]"
      >
        Browse Music
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}

export function HomeSidebarActions() {
  const { user, hydrated, hydrate } = useAuthStore((state) => ({
    user: state.user,
    hydrated: state.hydrated,
    hydrate: state.hydrate,
  }))

  useEffect(() => {
    hydrate()
  }, [hydrate])

  if (!hydrated) {
    return (
      <div className="mt-5 flex flex-col gap-3">
        <div className="h-11 rounded-full bg-white/8" />
        <div className="h-11 rounded-full bg-white/8" />
      </div>
    )
  }

  if (user) {
    return (
      <>
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[#8ecae6]">Welcome Back</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Pick up where you left off.</h2>
        <p className="mt-3 text-sm leading-7 text-white/70">
          Jump back into your diary, profile, and ongoing discovery without the sign-up prompts.
        </p>
        <div className="mt-5 flex flex-col gap-3">
          <Link
            href="/profile"
            className="inline-flex items-center justify-center rounded-full bg-[#f4d35e] px-5 py-3 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082]"
          >
            Open profile
          </Link>
          <Link
            href="/lists"
            className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.08]"
          >
            Browse lists
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[#8ecae6]">Join Zeማa</p>
      <h2 className="mt-2 text-2xl font-semibold text-white">Start logging your music life.</h2>
      <p className="mt-3 text-sm leading-7 text-white/70">
        Everything already built into the app is here for you: reviews, likes, curated favorites, lists, follows, artist pages, release pages, and official lists.
      </p>
      <div className="mt-5 flex flex-col gap-3">
        <Link
          href="/auth/register"
          className="inline-flex items-center justify-center rounded-full bg-[#f4d35e] px-5 py-3 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082]"
        >
          Join now
        </Link>
        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.08]"
        >
          Sign in
        </Link>
      </div>
    </>
  )
}
