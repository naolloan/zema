'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BrandLoader } from '@/components/brand/brand-logo'
import { FollowButton } from '@/components/profile/follow-button'
import { UserAvatar } from '@/components/profile/user-avatar'
import { getFollowers, getFollowing, getUserProfile } from '@/lib/auth-api'
import { useAuthStore } from '@/store/auth-store'
import type { Profile, User } from '@/types'

interface RelationshipListViewProps {
  userId: string
  mode: 'followers' | 'following'
}

export function RelationshipListView({ userId, mode }: RelationshipListViewProps) {
  const { user, hydrated, hydrate } = useAuthStore((state) => ({
    user: state.user,
    hydrated: state.hydrated,
    hydrate: state.hydrate,
  }))
  const [profile, setProfile] = useState<Profile | null>(null)
  const [people, setPeople] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!hydrated) {
      hydrate()
    }
  }, [hydrate, hydrated])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [profileData, relationshipData] = await Promise.all([
          getUserProfile(userId),
          mode === 'followers' ? getFollowers(userId) : getFollowing(userId),
        ])
        setProfile(profileData)
        setPeople(relationshipData.data)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [mode, userId])

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-4 py-10 text-white/70">
        <BrandLoader className="h-5 w-auto" />
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-white">
          <h1 className="text-3xl font-semibold">Profile not found</h1>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,_rgba(255,255,255,0.08),_rgba(255,255,255,0.03))] p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8ecae6]">{mode === 'followers' ? 'Followers' : 'Following'}</p>
        <h1 className="mt-3 text-4xl font-semibold text-white">{profile.displayName || profile.username}</h1>
        <p className="mt-2 text-white/58">@{profile.username}</p>
        <div className="mt-6 space-y-4">
          {people.length ? (
            people.map((person) => (
              <div key={person.id} className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-white/10 bg-[#111318]/72 p-4">
                <Link href={`/users/${person.id}`} className="flex min-w-0 items-center gap-4">
                  <UserAvatar user={person} className="h-14 w-14" textClassName="text-lg" />
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-white">{person.displayName || person.username}</p>
                    <p className="truncate text-sm text-white/56">@{person.username}</p>
                    {person.bio ? <p className="mt-1 truncate text-sm text-white/48">{person.bio}</p> : null}
                  </div>
                </Link>
                {user && user.id !== person.id ? (
                  <FollowButton
                    userId={person.id}
                    initialIsFollowing={Boolean(person.isFollowing)}
                    onRelationshipChange={(next) => {
                      setPeople((current) =>
                        current.map((entry) => (entry.id === person.id ? { ...entry, ...next } : entry))
                      )
                    }}
                  />
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6 text-white/60">
              {mode === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
