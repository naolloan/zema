'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { BookOpen } from 'lucide-react'
import { CoverArt } from '@/components/music/cover-art'
import { UserAvatar } from '@/components/profile/user-avatar'
import type { List } from '@/types'

function formatListCategory(category: List['category']) {
  return {
    MIXED: 'Mixed',
    ALBUMS: 'Albums',
    SINGLES: 'Singles',
    EPS: 'EPs',
    MIXTAPES: 'Mixtapes',
  }[category]
}

function ListPreviewCollage({ list }: { list: List }) {
  const previews = list.previewReleases?.slice(0, 4) || []

  if (!previews.length) {
    return (
      <div className="flex aspect-[1.6/1] items-center justify-center rounded-[1.3rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] text-white/62">
        <BookOpen className="h-7 w-7 text-[#f4d35e]" />
      </div>
    )
  }

  return (
    <div className="grid aspect-[1.6/1] grid-cols-2 gap-1.5 overflow-hidden rounded-[1.3rem] border border-white/10 bg-[#0d121a] p-1.5">
      {Array.from({ length: 4 }, (_, index) => previews[index] || null).map((release, index) => (
        <div key={release?.id || `empty-${index}`} className="overflow-hidden rounded-[0.85rem] bg-white/[0.04]">
          {release ? (
            <CoverArt title={release.title} artworkUrl={release.artworkUrl} className="h-full rounded-[0.85rem]" />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]" />
          )}
        </div>
      ))}
    </div>
  )
}

interface ListCardProps {
  list: List
  action?: ReactNode
  compact?: boolean
}

export function ListCard({ list, action, compact = false }: ListCardProps) {
  return (
    <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,24,34,0.88),rgba(10,14,21,0.72))] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] transition hover:-translate-y-1 hover:border-white/18">
      <Link href={`/lists/${list.id}`} className="block">
        <ListPreviewCollage list={list} />
      </Link>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8ecae6]">
            {formatListCategory(list.category)} · {list.itemsCount} releases
          </p>
          <Link href={`/lists/${list.id}`} className="mt-2 block truncate text-xl font-semibold text-white transition hover:text-[#f4d35e]">
            {list.title}
          </Link>
          {!compact ? (
            <p className="mt-3 text-sm leading-6 text-white/66">
              {list.description || 'Public community list.'}
            </p>
          ) : null}
        </div>
        {action ? <div onClick={(event) => event.stopPropagation()}>{action}</div> : null}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <UserAvatar user={list.user} className="h-10 w-10" textClassName="text-sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{list.user.displayName || list.user.username}</p>
          <p className="truncate text-xs uppercase tracking-[0.18em] text-white/42">@{list.user.username}</p>
        </div>
      </div>
    </article>
  )
}
