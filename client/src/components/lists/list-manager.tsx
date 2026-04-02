'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Trash2 } from 'lucide-react'
import { BrandLoader } from '@/components/brand/brand-logo'
import { ReleaseQuickMenu } from '@/components/music/release-quick-menu'
import type { List, Release } from '@/types'
import { addListItem, createList, deleteList, getMyLists } from '@/lib/auth-api'
import { searchMusic } from '@/lib/music-api'

const listCategoryOptions = [
  { value: 'MIXED', label: 'Mixed' },
  { value: 'ALBUMS', label: 'Albums' },
  { value: 'SINGLES', label: 'Singles' },
  { value: 'EPS', label: 'EPs' },
  { value: 'MIXTAPES', label: 'Mixtapes' },
] as const

function formatListCategory(category: (typeof listCategoryOptions)[number]['value']) {
  return listCategoryOptions.find((option) => option.value === category)?.label || 'Mixed'
}

function formatReleaseType(type: Release['type']) {
  return {
    ALBUM: 'Album',
    SINGLE: 'Single',
    EP: 'EP',
    MIXTAPE: 'Mixtape',
  }[type]
}

function filterResultsForCategory(releases: Release[], category: List['category'] | undefined) {
  if (!category || category === 'MIXED') {
    return releases
  }

  const categoryReleaseMap: Record<Exclude<List['category'], 'MIXED'>, Release['type']> = {
    ALBUMS: 'ALBUM',
    SINGLES: 'SINGLE',
    EPS: 'EP',
    MIXTAPES: 'MIXTAPE',
  }

  return releases.filter((release) => release.type === categoryReleaseMap[category as Exclude<List['category'], 'MIXED'>])
}

interface ListManagerProps {
  userId: string
  lists: List[]
  onListsChange: (lists: List[]) => void
}

export function ListManager({ userId, lists, onListsChange }: ListManagerProps) {
  const [form, setForm] = useState({ title: '', description: '', category: 'MIXED' as const, isPublic: true })
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Release[]>([])
  const [selectedListId, setSelectedListId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [mutatingId, setMutatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const orderedLists = useMemo(() => [...lists].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [lists])
  const selectedList = orderedLists.find((list) => list.id === selectedListId) || null

  function getErrorMessage(caught: any, fallback: string) {
    return caught?.response?.data?.error || caught?.response?.data?.error?.message || fallback
  }

  async function refreshLists() {
    const fresh = await getMyLists(userId)
    onListsChange(fresh)
    if (fresh.length && !fresh.some((list) => list.id === selectedListId)) {
      setSelectedListId(fresh[0].id)
    }
  }

  async function handleCreateList(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const created = await createList(form)
      await refreshLists()
      setSelectedListId(created.id)
      setForm({ title: '', description: '', category: 'MIXED', isPublic: true })
    } catch (caught: any) {
      setError(getErrorMessage(caught, 'Unable to create list right now.'))
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSearching(true)
    setError(null)
    try {
      const data = await searchMusic(query, 'release')
      setResults(filterResultsForCategory(data?.releases || [], selectedList?.category))
    } catch {
      setError('Unable to search releases right now.')
    } finally {
      setSearching(false)
    }
  }

  async function handleAdd(releaseId: string) {
    if (!selectedListId) return
    setMutatingId(releaseId)
    setError(null)
    try {
      await addListItem(selectedListId, { releaseId })
      await refreshLists()
    } catch (caught: any) {
      setError(getErrorMessage(caught, 'Unable to add that release right now.'))
    } finally {
      setMutatingId(null)
    }
  }

  async function handleDeleteList(listId: string) {
    setMutatingId(listId)
    setError(null)
    try {
      await deleteList(listId)
      await refreshLists()
      if (selectedListId === listId) {
        setSelectedListId('')
      }
    } catch (caught: any) {
      setError(getErrorMessage(caught, 'Unable to delete this list right now.'))
    } finally {
      setMutatingId(null)
    }
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-4 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f4d35e]">Create List</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Start a new collection</h3>
        </div>
        <form onSubmit={handleCreateList} className="space-y-3">
          <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="List title" className="h-11 w-full rounded-2xl border border-white/10 bg-white/8 px-4 text-sm text-black placeholder:text-black/36 outline-none" />
          <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description" className="min-h-[120px] w-full rounded-[1.25rem] border border-white/10 bg-white/8 px-4 py-3 text-sm text-black placeholder:text-black/36 outline-none" />
          <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as typeof form.category }))} className="h-11 w-full rounded-2xl border border-white/10 bg-white/8 px-4 text-sm text-black outline-none">
            {listCategoryOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <label className="flex items-center gap-3 text-sm text-white/72"><input type="checkbox" checked={form.isPublic} onChange={(event) => setForm((current) => ({ ...current, isPublic: event.target.checked }))} /> Public list</label>
          <button type="submit" disabled={loading || !form.title.trim()} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#f4d35e] px-5 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082] disabled:cursor-not-allowed disabled:opacity-70">{loading ? <BrandLoader className="h-4 w-auto" /> : <Plus className="h-4 w-4" />}Create list</button>
        </form>

        <div className="space-y-3 pt-2">
          {orderedLists.map((list) => (
            <div
              key={list.id}
              onClick={() => setSelectedListId(list.id)}
              className={selectedListId === list.id ? 'flex cursor-pointer items-center justify-between rounded-2xl border border-[#f4d35e]/30 bg-[#f4d35e]/10 px-4 py-3 transition hover:border-[#f4d35e]/45' : 'flex cursor-pointer items-center justify-between rounded-2xl border border-white/8 bg-[#111318]/70 px-4 py-3 transition hover:border-white/16 hover:bg-[#161c25]/78'}
            >
              <div className="text-left">
                <p className="font-medium text-white">{list.title}</p>
                <p className="text-sm text-white/54">{formatListCategory(list.category)} · {list.itemsCount} items</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/lists/${list.id}`}
                  onClick={(event) => event.stopPropagation()}
                  className="rounded-full border border-white/12 px-3 py-2 text-xs font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.06]"
                >
                  Open
                </Link>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    handleDeleteList(list.id)
                  }}
                  className="rounded-full border border-white/12 px-3 py-2 text-xs font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.06]"
                >
                  {mutatingId === list.id ? <BrandLoader className="h-4 w-auto" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}
          {!orderedLists.length ? (
            <div className="rounded-[1.35rem] border border-dashed border-white/10 bg-[#111318]/42 px-4 py-5">
              <p className="text-sm font-semibold text-white">No lists yet</p>
              <p className="mt-2 text-sm leading-6 text-white/58">
                Start with one public or private list, then come back here to fill it from search.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8ecae6]">Add Releases</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Fill a list from search</h3>
          <p className="mt-2 text-sm text-white/58">
            {selectedList ? `Currently adding to ${selectedList.title} · ${formatListCategory(selectedList.category)}` : 'Select a list first to start adding releases.'}
          </p>
        </div>
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search releases" className="h-11 flex-1 rounded-full border border-white/10 bg-white/8 px-4 text-sm text-black placeholder:text-black/36 outline-none" />
          <button type="submit" disabled={searching} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#f4d35e] px-5 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082] disabled:cursor-not-allowed disabled:opacity-70">{searching ? <BrandLoader className="h-4 w-auto" /> : <Search className="h-4 w-4" />}Search</button>
        </form>
        {error ? <p className="rounded-2xl border border-[#ff7b54]/30 bg-[#ff7b54]/10 px-4 py-3 text-sm text-[#ffd6cc]">{error}</p> : null}
        <div className="space-y-3">
          {results.slice(0, 8).map((release) => (
            <div key={release.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-[#111318]/70 px-4 py-3">
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
                <ReleaseQuickMenu release={release} />
                <button type="button" disabled={!selectedListId || mutatingId === release.id} onClick={() => handleAdd(release.id)} className="rounded-full bg-[#f4d35e] px-4 py-2 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082] disabled:cursor-not-allowed disabled:opacity-60">{mutatingId === release.id ? <BrandLoader className="h-4 w-auto" /> : 'Add'}</button>
              </div>
            </div>
          ))}
          {query.trim() && !searching && results.length === 0 ? (
            <p className="rounded-2xl border border-white/8 bg-[#111318]/70 px-4 py-3 text-sm text-white/60">
              {selectedList?.category && selectedList.category !== 'MIXED'
                ? `No ${formatListCategory(selectedList.category).toLowerCase()} matched that search.`
                : 'No releases matched that search.'}
            </p>
          ) : null}
          {!query.trim() && !results.length ? (
            <div className="rounded-[1.35rem] border border-dashed border-white/10 bg-[#111318]/42 px-4 py-5">
              <p className="text-sm font-semibold text-white">Search to add releases</p>
              <p className="mt-2 text-sm leading-6 text-white/58">
                Pick a list, search a title or artist, then use the shared release menu or the add button to build it out.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
