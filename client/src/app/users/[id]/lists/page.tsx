'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { BrandLoader } from '@/components/brand/brand-logo'
import { ListCard } from '@/components/lists/list-card'
import { ListLikeButton } from '@/components/lists/list-like-button'
import { getUserLists, getUserProfile } from '@/lib/auth-api'
import type { List, Profile } from '@/types'

export default function PublicUserListsPage() {
  const params = useParams<{ id: string }>()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [lists, setLists] = useState<List[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadLists() {
      if (!params?.id) {
        return
      }

      setLoading(true)
      try {
        const [profileData, listData] = await Promise.all([
          getUserProfile(params.id),
          getUserLists(params.id, 50),
        ])
        setProfile(profileData)
        setLists(listData.data)
      } catch {
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    loadLists()
  }, [params?.id])

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 py-10 text-white/70">
        <BrandLoader className="h-5 w-auto" />
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-white">
          <h1 className="text-3xl font-semibold">User not found</h1>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <Link href={`/users/${profile.id}`} className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white">
        <ArrowLeft className="h-4 w-4" />Back to profile
      </Link>
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8ecae6]">Public Lists</p>
        <h1 className="mt-4 text-4xl font-semibold text-white">{profile.displayName || profile.username}</h1>
        <p className="mt-3 max-w-3xl text-white/64">Browse every public collection this listener has shared with the community.</p>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        {lists.length ? (
          lists.map((list) => (
            <ListCard
              key={list.id}
              list={list}
              action={<ListLikeButton listId={list.id} ownerId={list.user.id} initialLikesCount={list.likesCount} initialIsLiked={list.isLiked} />}
            />
          ))
        ) : (
          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 text-white/60">No public lists yet.</div>
        )}
      </section>
    </main>
  )
}
