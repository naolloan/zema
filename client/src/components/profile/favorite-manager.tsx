'use client'

import { useMemo, useState } from 'react'
import { Heart, Mic2, Search, UserRound } from 'lucide-react'
import { BrandLoader } from '@/components/brand/brand-logo'
import type { Artist, FavoriteArtist, Profile, Release } from '@/types'
import {
  addFavoriteArtist,
  addFavoriteRelease,
  getMyProfile,
  removeFavoriteArtist,
  removeFavoriteRelease,
} from '@/lib/auth-api'
import { searchMusic } from '@/lib/music-api'
import { ReleaseQuickMenu } from '@/components/music/release-quick-menu'

interface FavoriteManagerProps {
  profile: Profile
  onProfileChange: (profile: Profile) => void
}

type FavoriteShelf = 'albums' | 'songs' | 'artists'

const shelfMeta: Record<FavoriteShelf, { label: string; description: string; empty: string; icon: typeof Heart }> = {
  albums: {
    label: 'Favorite Albums',
    description: 'Pick the four projects that define your long-form taste.',
    empty: 'No favorite albums selected yet.',
    icon: Heart,
  },
  songs: {
    label: 'Favorite Songs',
    description: 'Pick the four songs that stay closest to your identity.',
    empty: 'No favorite songs selected yet.',
    icon: Mic2,
  },
  artists: {
    label: 'Favorite Artists',
    description: 'Pick the four artists that sit at the center of your world.',
    empty: 'No favorite artists selected yet.',
    icon: UserRound,
  },
}

function formatReleaseType(type: Release['type']) {
  return {
    ALBUM: 'Album',
    SINGLE: 'Song',
    EP: 'EP',
    MIXTAPE: 'Mixtape',
  }[type]
}

export function FavoriteManager({ profile, onProfileChange }: FavoriteManagerProps) {
  const [activeShelf, setActiveShelf] = useState<FavoriteShelf>('albums')
  const [query, setQuery] = useState('')
  const [releaseResults, setReleaseResults] = useState<Release[]>([])
  const [artistResults, setArtistResults] = useState<Artist[]>([])
  const [searching, setSearching] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const currentShelf = shelfMeta[activeShelf]
  const currentFavorites = useMemo(() => {
    if (activeShelf === 'albums') return profile.favoriteAlbums
    if (activeShelf === 'songs') return profile.favoriteSongs
    return profile.favoriteArtists
  }, [activeShelf, profile.favoriteAlbums, profile.favoriteArtists, profile.favoriteSongs])

  async function refreshProfile() {
    const fresh = await getMyProfile()
    onProfileChange(fresh)
  }

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSearching(true)
    setError(null)

    try {
      if (activeShelf === 'artists') {
        const data = await searchMusic(query, 'artist')
        setArtistResults(data?.artists || [])
        setReleaseResults([])
      } else {
        const data = await searchMusic(query, 'release')
        const releases = (data?.releases || []).filter((release) =>
          activeShelf === 'albums' ? release.type !== 'SINGLE' : release.type === 'SINGLE',
        )
        setReleaseResults(releases)
        setArtistResults([])
      }
    } catch {
      setError(`Unable to search ${activeShelf} right now.`)
    } finally {
      setSearching(false)
    }
  }

  async function handleAddRelease(releaseId: string) {
    setLoadingId(releaseId)
    setError(null)
    try {
      await addFavoriteRelease(releaseId, activeShelf === 'songs' ? 'SONGS' : 'ALBUMS')
      await refreshProfile()
    } catch (caught: any) {
      setError(caught?.response?.data?.error || 'Unable to add this favorite right now.')
    } finally {
      setLoadingId(null)
    }
  }

  async function handleRemoveRelease(releaseId: string) {
    setLoadingId(releaseId)
    setError(null)
    try {
      await removeFavoriteRelease(releaseId)
      await refreshProfile()
    } catch (caught: any) {
      setError(caught?.response?.data?.error || 'Unable to remove this favorite right now.')
    } finally {
      setLoadingId(null)
    }
  }

  async function handleAddArtist(artistId: string) {
    setLoadingId(artistId)
    setError(null)
    try {
      await addFavoriteArtist(artistId)
      await refreshProfile()
    } catch (caught: any) {
      setError(caught?.response?.data?.error || 'Unable to add this artist right now.')
    } finally {
      setLoadingId(null)
    }
  }

  async function handleRemoveArtist(artistId: string) {
    setLoadingId(artistId)
    setError(null)
    try {
      await removeFavoriteArtist(artistId)
      await refreshProfile()
    } catch (caught: any) {
      setError(caught?.response?.data?.error || 'Unable to remove this artist right now.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-4 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8ecae6]">Curated Favorites</p>
        <h3 className="mt-2 text-2xl font-semibold text-white">Shape your public taste shelves</h3>
        <p className="mt-3 text-sm leading-7 text-white/62">
          Likes are now separate from favorites. These shelves are for the releases and artists you want sitting at the center of your profile.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['albums', 'songs', 'artists'] as FavoriteShelf[]).map((shelf) => (
          <button
            key={shelf}
            type="button"
            onClick={() => {
              setActiveShelf(shelf)
              setError(null)
              setReleaseResults([])
              setArtistResults([])
            }}
            className={activeShelf === shelf
              ? 'rounded-full bg-[#f4d35e] px-4 py-2 text-sm font-semibold text-[#111318]'
              : 'rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/70 transition hover:border-white/18 hover:bg-white/[0.07] hover:text-white'}
          >
            {shelfMeta[shelf].label}
          </button>
        ))}
      </div>

      <div className="rounded-[1.35rem] border border-white/10 bg-[#111318]/58 p-4">
        <p className="text-sm font-semibold text-white">{currentShelf.label}</p>
        <p className="mt-2 text-sm leading-6 text-white/60">{currentShelf.description}</p>
        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/42">{Math.max(0, 4 - currentFavorites.length)} slot(s) open</p>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${activeShelf} to feature`}
          className="h-11 flex-1 rounded-full border border-white/10 bg-white/8 px-4 text-sm text-black placeholder:text-black/36 outline-none"
        />
        <button
          type="submit"
          disabled={searching}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#f4d35e] px-5 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {searching ? <BrandLoader className="h-4 w-auto" /> : <Search className="h-4 w-4" />}
          Search
        </button>
      </form>

      {error ? <p className="rounded-2xl border border-[#ff7b54]/30 bg-[#ff7b54]/10 px-4 py-3 text-sm text-[#ffd6cc]">{error}</p> : null}

      <div className="space-y-3">
        {activeShelf === 'artists'
          ? (currentFavorites as FavoriteArtist[]).map((favoriteArtist) => (
              <div key={favoriteArtist.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-[#111318]/70 px-4 py-3">
                <div>
                  <p className="font-medium text-white">{favoriteArtist.artist.name}</p>
                  <p className="text-sm text-white/54">Slot #{favoriteArtist.position}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveArtist(favoriteArtist.artist.id)}
                  disabled={loadingId === favoriteArtist.artist.id}
                  className="rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.06]"
                >
                  {loadingId === favoriteArtist.artist.id ? 'Working...' : 'Remove'}
                </button>
              </div>
            ))
          : (currentFavorites as Profile['favoriteAlbums']).map((favorite) => (
              <div key={favorite.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-[#111318]/70 px-4 py-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-white">{favorite.release.title}</p>
                    <span className="rounded-full border border-white/12 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8ecae6]">
                      {formatReleaseType(favorite.release.type)}
                    </span>
                  </div>
                  <p className="text-sm text-white/54">Slot #{favorite.position}</p>
                </div>
                <div className="flex items-center gap-3">
                  <ReleaseQuickMenu release={favorite.release} buttonClassName="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#8ecae6]/25 bg-[#264653] text-[#d8eff8] transition hover:border-[#8ecae6]/45 hover:bg-[#2b5b63] hover:text-white" />
                  <button
                    type="button"
                    onClick={() => handleRemoveRelease(favorite.release.id)}
                    disabled={loadingId === favorite.release.id}
                    className="rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.06]"
                  >
                    {loadingId === favorite.release.id ? 'Working...' : 'Remove'}
                  </button>
                </div>
              </div>
            ))}
        {!currentFavorites.length ? (
          <div className="rounded-[1.35rem] border border-dashed border-white/10 bg-[#111318]/42 px-4 py-5">
            <p className="text-sm font-semibold text-white">{currentShelf.label} are still empty</p>
            <p className="mt-2 text-sm leading-6 text-white/58">{currentShelf.empty} Search below and start pinning the four that best represent you.</p>
          </div>
        ) : null}
      </div>

      {activeShelf === 'artists' ? (
        artistResults.length ? (
          <div className="space-y-3">
            {artistResults.slice(0, 6).map((artist) => {
              const alreadyAdded = profile.favoriteArtists.some((favoriteArtist) => favoriteArtist.artist.id === artist.id)
              return (
                <div key={artist.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <div>
                    <p className="font-medium text-white">{artist.name}</p>
                    <p className="text-sm text-white/54">{artist.type}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddArtist(artist.id)}
                    disabled={loadingId === artist.id || alreadyAdded}
                    className={alreadyAdded ? 'rounded-full bg-[#2a9d8f] px-4 py-2 text-sm font-semibold text-white' : 'rounded-full bg-[#f4d35e] px-4 py-2 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082]'}
                  >
                    {loadingId === artist.id ? <BrandLoader className="h-4 w-auto" /> : alreadyAdded ? 'Added' : 'Add'}
                  </button>
                </div>
              )
            })}
          </div>
        ) : null
      ) : releaseResults.length ? (
        <div className="space-y-3">
          {releaseResults.slice(0, 6).map((release) => {
            const favoriteSet = activeShelf === 'albums' ? profile.favoriteAlbums : profile.favoriteSongs
            const alreadyAdded = favoriteSet.some((favorite) => favorite.release.id === release.id)

            return (
              <div key={release.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-white">{release.title}</p>
                    <span className="rounded-full border border-white/12 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8ecae6]">
                      {formatReleaseType(release.type)}
                    </span>
                  </div>
                  <p className="text-sm text-white/54">{release.artistCredits.map((credit) => credit.artist.name).join(', ')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <ReleaseQuickMenu release={release} buttonClassName="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#8ecae6]/25 bg-[#264653] text-[#d8eff8] transition hover:border-[#8ecae6]/45 hover:bg-[#2b5b63] hover:text-white" />
                  <button
                    type="button"
                    onClick={() => handleAddRelease(release.id)}
                    disabled={loadingId === release.id || alreadyAdded}
                    className={alreadyAdded ? 'rounded-full bg-[#2a9d8f] px-4 py-2 text-sm font-semibold text-white' : 'rounded-full bg-[#f4d35e] px-4 py-2 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082]'}
                  >
                    {loadingId === release.id ? <BrandLoader className="h-4 w-auto" /> : alreadyAdded ? 'Added' : 'Add'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {!query.trim() && !releaseResults.length && !artistResults.length ? (
        <div className="rounded-[1.35rem] border border-dashed border-white/10 bg-[#111318]/42 px-4 py-5">
          <p className="text-sm font-semibold text-white">Search to feature favorites</p>
          <p className="mt-2 text-sm leading-6 text-white/58">
            Use search to find the albums, songs, or artists you want anchored on your profile. Likes stay separate, so this space is only for the names you want front and center.
          </p>
        </div>
      ) : null}
    </div>
  )
}
