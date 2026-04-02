'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, ExternalLink, Library } from 'lucide-react'
import { BrandLoader } from '@/components/brand/brand-logo'
import { BrandMark } from '@/components/brand/brand-logo'
import { getArtist } from '@/lib/music-api'
import type { ArtistDetail } from '@/types'
import { ReleaseCard } from '@/components/music/release-card'

export default function ArtistPage() {
  const params = useParams<{ id: string }>()
  const [artist, setArtist] = useState<ArtistDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadArtist() {
      if (!params?.id) return
      setLoading(true)
      const data = await getArtist(params.id)
      setArtist(data)
      setLoading(false)
    }

    loadArtist()
  }, [params?.id])

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 py-10 text-white/70">
        <BrandLoader className="h-5 w-auto" />
      </main>
    )
  }

  if (!artist) {
    return (
      <main className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-12 sm:px-6 lg:px-8">
        <Link href="/explore" className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to explore
        </Link>
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-white">
          <h1 className="text-3xl font-semibold">Artist not found</h1>
          <p className="mt-3 text-white/64">This artist may not be in the local catalog yet. Try searching again from the explore page.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/explore" className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white">
        <ArrowLeft className="h-4 w-4" />
        Back to explore
      </Link>

      <section className="grid gap-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(42,157,143,0.18),_transparent_30%),linear-gradient(145deg,_rgba(255,255,255,0.08),_rgba(255,255,255,0.03))] p-8 lg:grid-cols-[1fr_0.72fr] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8ecae6]">Artist Profile</p>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight text-white">{artist.name}</h1>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/62">
            <span className="rounded-full bg-white/10 px-3 py-1.5">{artist.type}</span>
            {artist.disambiguation ? <span className="rounded-full bg-white/10 px-3 py-1.5">{artist.disambiguation}</span> : null}
            <span className="rounded-full bg-white/10 px-3 py-1.5">{artist.releaseCount} releases linked</span>
          </div>
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/70">
            {artist.bio || `${artist.name} is now part of the community catalog. Browse linked releases, credits, and ratings below.`}
          </p>
          {artist.spotifyUrl ? (
            <a
              href={artist.spotifyUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#1DB954]/35 bg-[#1DB954]/15 px-4 py-2 text-sm font-semibold text-[#d8ffe8] transition hover:bg-[#1DB954]/22"
            >
              Open In Spotify
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[1.75rem] bg-[#111318]/72 p-5">
            <div className="flex items-center gap-3 text-[#f4d35e]"><BrandMark className="h-5 w-auto" /><span className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">Linked Releases</span></div>
            <p className="mt-4 text-4xl font-semibold text-white">{artist.releaseCount}</p>
          </div>
          <div className="rounded-[1.75rem] bg-[#111318]/72 p-5">
            <div className="flex items-center gap-3 text-[#8ecae6]"><Library className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">Catalog State</span></div>
            <p className="mt-4 text-lg font-semibold text-white">Collaborative credits ready</p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f4d35e]">Discography</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Releases in the local catalog</h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {artist.releases.map((release) => (
            <ReleaseCard key={release.id} release={release} />
          ))}
        </div>
      </section>
    </main>
  )
}
