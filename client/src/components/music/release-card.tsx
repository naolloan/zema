'use client'

import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import { Crown, Heart, LibraryBig, Radio, Star } from 'lucide-react'
import type { Release } from '@/types'
import { ArtistCreditLine } from './artist-credit-line'
import { CoverArt } from './cover-art'
import { ReleaseQuickMenu } from './release-quick-menu'

interface ReleaseCardProps {
  release: Release
  eyebrow?: string
}

function formatCompactCount(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value)
}

function StatPill({
  label,
  value,
  icon,
  href,
}: {
  label: string
  value: string | number
  icon: ReactNode
  href?: string
}) {
  const tooltip = (
    <div className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-[#0f141d] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white opacity-0 shadow-[0_14px_40px_rgba(0,0,0,0.35)] transition group-hover/stat:opacity-100">
      {label}
    </div>
  )
  const content = (
    <>
      <span>{icon}</span>
      <span>{value}</span>
      {tooltip}
    </>
  )

  if (href) {
    return (
      <Link href={href} className="group/stat relative inline-flex items-center gap-1.5 text-white/78 transition hover:text-white">
        {content}
      </Link>
    )
  }

  return <div className="group/stat relative inline-flex items-center gap-1.5 text-white/78">{content}</div>
}

export function ReleaseCard({ release, eyebrow }: ReleaseCardProps) {
  const [localRelease, setLocalRelease] = useState(release)

  useEffect(() => {
    setLocalRelease(release)
  }, [release])

  const chartLabel = localRelease.ranking ? `#${localRelease.ranking.rank}` : eyebrow?.startsWith('#') ? eyebrow : null

  return (
    <div className="group relative overflow-visible rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(244,211,94,0.16),_transparent_26%),linear-gradient(180deg,_rgba(255,255,255,0.08),_rgba(255,255,255,0.04))] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] transition hover:-translate-y-1 hover:border-[#f4d35e]/28 hover:shadow-[0_24px_70px_rgba(0,0,0,0.26)]">
      <div className="absolute right-4 top-4 z-20">
        <ReleaseQuickMenu release={localRelease} onReleaseChange={setLocalRelease} />
      </div>

      <div className="space-y-4">
        <Link href={`/releases/${localRelease.id}`} className="block">
          <CoverArt title={localRelease.title} artworkUrl={localRelease.artworkUrl} />
        </Link>
        <div className="space-y-2">
          {eyebrow ? (
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#f4d35e]">{eyebrow}</p>
          ) : null}
          <div>
            <Link href={`/releases/${localRelease.id}`} className="block">
              <h3 className="text-lg font-semibold text-white transition group-hover:text-[#ffe082]">{localRelease.title}</h3>
            </Link>
            <ArtistCreditLine credits={localRelease.artistCredits} />
          </div>
          <div className="flex items-center justify-between text-sm text-white/60">
            <span className="rounded-full bg-[#111318]/75 px-3 py-1 text-[0.72rem] uppercase tracking-[0.18em] text-[#8ecae6]">{localRelease.type}</span>
            {typeof localRelease.averageRating === 'number' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f4d35e]/16 px-2.5 py-1 text-white">
                <Star className="h-3.5 w-3.5 fill-current text-[#f4d35e]" />
                {localRelease.averageRating.toFixed(1)}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-[1rem] border border-white/8 bg-[#0f141d]/78 px-3 py-2 text-xs font-semibold">
            <StatPill label="Logs" value={formatCompactCount(localRelease.counts?.logs || 0)} icon={<Radio className="h-3.5 w-3.5 text-[#48c774]" />} href={`/releases/${localRelease.id}?panel=logs&view=details`} />
            <StatPill label="Lists" value={formatCompactCount(localRelease.counts?.lists || 0)} icon={<LibraryBig className="h-3.5 w-3.5 text-[#7cc6ff]" />} href={`/releases/${localRelease.id}?panel=lists&view=details`} />
            <StatPill label="Likes" value={formatCompactCount(localRelease.counts?.likes || 0)} icon={<Heart className="h-3.5 w-3.5 fill-current text-[#ff7b54]" />} href={`/releases/${localRelease.id}?panel=likes&view=details`} />
            {chartLabel ? <StatPill label="Top 250 Rank" value={chartLabel} icon={<Crown className="h-3.5 w-3.5 text-[#f4d35e]" />} href={`/releases/${localRelease.id}`} /> : null}
          </div>
        </div>
      </div>
    </div>
  )
}
