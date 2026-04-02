'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { BrandLoader } from '@/components/brand/brand-logo'
import { OfficialListCard } from '@/components/lists/official-list-card'
import { getDiscoverLists } from '@/lib/auth-api'
import { ListCard } from '@/components/lists/list-card'
import { ListLikeButton } from '@/components/lists/list-like-button'
import { getDynamicListDefinitions, getOfficialListData } from '@/lib/music-api'
import type { List, Release } from '@/types'

export default function ListsPage() {
  const officialLists = getDynamicListDefinitions()
  const liveOfficialLists = officialLists.filter((list) => list.status === 'live')
  const featuredLists = liveOfficialLists.filter((list) => ['top-250-community-canon', 'top-250-albums', 'top-250-songs'].includes(list.slug))
  const [popularLists, setPopularLists] = useState<List[]>([])
  const [recentLists, setRecentLists] = useState<List[]>([])
  const [officialPreviews, setOfficialPreviews] = useState<Record<string, Release[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDiscoverSections() {
      setLoading(true)
      try {
        const [weeklyResponse, recentResponse] = await Promise.all([
          getDiscoverLists('weekly', 6, 0),
          getDiscoverLists('liked', 6, 0),
        ])
        setPopularLists(weeklyResponse.data)
        setRecentLists(recentResponse.data)
      } finally {
        setLoading(false)
      }
    }

    loadDiscoverSections()
  }, [])

  useEffect(() => {
    async function loadOfficialPreviews() {
      const previews = await Promise.all(
        featuredLists.map(async (definition) => ({
          slug: definition.slug,
          releases: (await getOfficialListData(definition, 4))?.items.map((item) => item.release) || [],
        })),
      )

      setOfficialPreviews(
        previews.reduce<Record<string, Release[]>>((acc, entry) => {
          acc[entry.slug] = entry.releases
          return acc
        }, {}),
      )
    }

    void loadOfficialPreviews()
  }, [])

  function renderOfficialCards(items: typeof officialLists) {
    return (
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((list) => (
          <OfficialListCard
            key={list.slug}
            definition={list}
            previewReleases={officialPreviews[list.slug] || []}
          />
        ))}
      </div>
    )
  }

  function renderCommunityLists(items: List[], emptyMessage: string) {
    if (loading) {
      return (
        <div className="mt-8 flex min-h-[120px] items-center justify-center rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(20,26,36,0.78),rgba(10,14,21,0.64))] text-white/70">
          <BrandLoader className="h-5 w-auto" />
        </div>
      )
    }

    if (!items.length) {
      return (
        <div className="mt-8 rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(20,26,36,0.78),rgba(10,14,21,0.64))] p-6 text-sm text-white/60">
          {emptyMessage}
        </div>
      )
    }

    return (
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((list) => (
          <ListCard
            key={list.id}
            list={list}
            action={<ListLikeButton listId={list.id} ownerId={list.user.id} initialLikesCount={list.likesCount} initialIsLiked={list.isLiked} />}
          />
        ))}
      </div>
    )
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-[2.1rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(255,123,84,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(142,202,230,0.14),_transparent_24%),linear-gradient(145deg,_rgba(20,26,36,0.92),_rgba(10,14,21,0.76))] p-8 text-white shadow-[0_22px_70px_rgba(0,0,0,0.26)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#8ecae6]">
              <Sparkles className="h-4 w-4" />
              Official Lists
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Start with platform-run lists, then build your own alongside them.</h1>
            <p className="mt-4 text-base leading-7 text-white/68">
              Official lists are meant to sit beside user lists, not replace them. They just happen to update themselves as the site changes.
            </p>
          </div>
          <Link
            href="/lists/official"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f4d35e] px-5 py-3 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082]"
          >
            View All Official Lists
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f4d35e]">Featured Lists</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Core official lists to start from.</h2>
          </div>
          <Link href="/lists/official" className="text-sm font-semibold text-[#8ecae6] transition hover:text-white">
            View all official lists
          </Link>
        </div>
        {renderOfficialCards(featuredLists)}
      </section>

      <section>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8ecae6]">Popular This Week</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">Public lists getting the most activity this week.</h2>
        </div>
        {renderCommunityLists(popularLists, 'No public lists picked up enough momentum this week yet.')}
      </section>

      <section>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f4d35e]">Recently Liked</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">Public lists that were genuinely liked most recently.</h2>
        </div>
        {renderCommunityLists(
          recentLists,
          'No public lists have been liked yet.',
        )}
      </section>
    </main>
  )
}
