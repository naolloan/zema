'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { BrandLoader } from '@/components/brand/brand-logo'
import { Input } from '@/components/ui/input'
import { searchMusic } from '@/lib/music-api'
import { ReleaseCard } from '@/components/music/release-card'
import type { Release } from '@/types'

type ReleaseTypeFilter = 'ALL' | 'ALBUM' | 'SINGLE' | 'EP' | 'MIXTAPE'
type YearFilter = 'ALL' | '2020s' | '2010s' | '2000s' | '1990s'
type RatingFilter = 'ALL' | '4+' | '3+' | '2+'
type PopularityFilter = 'ALL_TIME' | 'THIS_YEAR' | 'THIS_MONTH' | 'THIS_WEEK'
type GenreFilter = 'ALL'

interface ReleaseBrowserProps {
  seedReleases: Release[]
}

function matchesYearFilter(release: Release, yearFilter: YearFilter) {
  if (yearFilter === 'ALL') {
    return true
  }

  if (!release.releaseDate) {
    return false
  }

  const year = new Date(release.releaseDate).getFullYear()

  if (yearFilter === '2020s') return year >= 2020
  if (yearFilter === '2010s') return year >= 2010 && year <= 2019
  if (yearFilter === '2000s') return year >= 2000 && year <= 2009
  return year >= 1990 && year <= 1999
}

function matchesPopularityFilter(release: Release, popularity: PopularityFilter) {
  if (popularity === 'ALL_TIME') {
    return true
  }

  if (!release.releaseDate) {
    return false
  }

  const releaseDate = new Date(release.releaseDate)
  const now = new Date()

  if (popularity === 'THIS_YEAR') {
    return releaseDate.getFullYear() === now.getFullYear()
  }

  const diffMs = now.getTime() - releaseDate.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return popularity === 'THIS_MONTH' ? diffDays <= 31 : diffDays <= 7
}

function dedupeReleases(releases: Release[]) {
  const seen = new Set<string>()
  return releases.filter((release) => {
    if (seen.has(release.id)) {
      return false
    }

    seen.add(release.id)
    return true
  })
}

export function ReleaseBrowser({ seedReleases }: ReleaseBrowserProps) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState<ReleaseTypeFilter>('ALL')
  const [year, setYear] = useState<YearFilter>('ALL')
  const [genre, setGenre] = useState<GenreFilter>('ALL')
  const [rating, setRating] = useState<RatingFilter>('ALL')
  const [popularity, setPopularity] = useState<PopularityFilter>('ALL_TIME')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<Release[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  const displayedReleases = useMemo(() => {
    const base = dedupeReleases(hasSearched ? results : seedReleases)

    return base
      .filter((release) => (type === 'ALL' ? true : release.type === type))
      .filter((release) => matchesYearFilter(release, year))
      .filter((release) => matchesPopularityFilter(release, popularity))
      .filter((release) => {
        if (rating === 'ALL') return true
        const threshold = Number(rating.replace('+', ''))
        return (release.averageRating || 0) >= threshold
      })
      .sort((a, b) => {
        const ratingCountDiff = (b.ratingCount || 0) - (a.ratingCount || 0)
        if (ratingCountDiff !== 0) {
          return ratingCountDiff
        }

        const avgDiff = (b.averageRating || 0) - (a.averageRating || 0)
        if (avgDiff !== 0) {
          return avgDiff
        }

        return a.title.localeCompare(b.title)
      })
  }, [hasSearched, popularity, rating, results, seedReleases, type, year])

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSearching(true)
    setHasSearched(true)

    try {
      const response = query.trim() ? await searchMusic(query.trim(), 'release') : null
      setResults(response?.releases || [])
    } finally {
      setSearching(false)
    }
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8ecae6]">Browse By</p>
        <h2 className="mt-2 text-4xl font-semibold text-white">Search releases with dropdown filters.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/64">
          Use the filters together while searching. Genre is visible here too, but it will become active once genre metadata is wired into release search.
        </p>
      </div>

      <form onSubmit={handleSearch} className="grid gap-3 lg:grid-cols-[1.6fr_repeat(5,minmax(0,1fr))_auto]">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search releases"
          className="h-12 rounded-full border-white/12 bg-white/10 px-5 text-white placeholder:text-white/40"
        />
        <select value={type} onChange={(event) => setType(event.target.value as ReleaseTypeFilter)} className="h-12 rounded-full border border-white/12 bg-white/10 px-4 text-sm text-white outline-none">
          <option value="ALL">Type</option>
          <option value="ALL">All types</option>
          <option value="ALBUM">Albums</option>
          <option value="SINGLE">Songs</option>
          <option value="EP">EPs</option>
          <option value="MIXTAPE">Mixtapes</option>
        </select>
        <select value={year} onChange={(event) => setYear(event.target.value as YearFilter)} className="h-12 rounded-full border border-white/12 bg-white/10 px-4 text-sm text-white outline-none">
          <option value="ALL">Year</option>
          <option value="ALL">All years</option>
          <option value="2020s">2020s</option>
          <option value="2010s">2010s</option>
          <option value="2000s">2000s</option>
          <option value="1990s">1990s</option>
        </select>
        <select value={genre} onChange={(event) => setGenre(event.target.value as GenreFilter)} disabled className="h-12 rounded-full border border-white/12 bg-white/10 px-4 text-sm text-white/50 outline-none disabled:cursor-not-allowed">
          <option value="ALL">Genre</option>
          <option value="ALL">All genres</option>
        </select>
        <select value={rating} onChange={(event) => setRating(event.target.value as RatingFilter)} className="h-12 rounded-full border border-white/12 bg-white/10 px-4 text-sm text-white outline-none">
          <option value="ALL">Rating</option>
          <option value="ALL">All ratings</option>
          <option value="4+">4.0+</option>
          <option value="3+">3.0+</option>
          <option value="2+">2.0+</option>
        </select>
        <select value={popularity} onChange={(event) => setPopularity(event.target.value as PopularityFilter)} className="h-12 rounded-full border border-white/12 bg-white/10 px-4 text-sm text-white outline-none">
          <option value="ALL_TIME">Popular</option>
          <option value="ALL_TIME">All time</option>
          <option value="THIS_YEAR">This year</option>
          <option value="THIS_MONTH">This month</option>
          <option value="THIS_WEEK">This week</option>
        </select>
        <button
          type="submit"
          disabled={searching}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#f4d35e] px-6 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {searching ? <BrandLoader className="h-4 w-auto" /> : <Search className="h-4 w-4" />}
          Search
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-sm text-white/60">
          {hasSearched
            ? `${displayedReleases.length} filtered result${displayedReleases.length === 1 ? '' : 's'}`
            : 'Showing a curated starting set until you search.'}
        </p>
      </div>

      {displayedReleases.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {displayedReleases.map((release) => (
            <ReleaseCard key={`browse-${release.id}`} release={release} />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-[#111318]/72 p-6 text-white/60">
          No releases matched this search and filter combination.
        </div>
      )}
    </section>
  )
}
