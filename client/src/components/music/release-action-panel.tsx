'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BookmarkPlus, CalendarPlus, Heart, LibraryBig, Plus } from 'lucide-react'
import { BrandLoader } from '@/components/brand/brand-logo'
import { RatingPicker } from '@/components/music/rating-picker'
import type { Release } from '@/types'
import { addListItem, addReleaseLike, addWantToHear, createDiaryEntry, getMyDiary, getMyLists, rateRelease, removeReleaseLike, removeReleaseRating, removeWantToHear } from '@/lib/auth-api'
import { formatRatingValue } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'

interface ReleaseActionPanelProps {
  release: Release
  onReleaseChange: (release: Release) => void
  onDiaryCreated?: () => void
}

function todayValue() {
  return new Date().toISOString().slice(0, 10)
}

export function ReleaseActionPanel({ release, onReleaseChange, onDiaryCreated }: ReleaseActionPanelProps) {
  const { user } = useAuthStore((state) => ({ user: state.user }))
  const [ratingLoading, setRatingLoading] = useState<number | null>(null)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [wantToHearLoading, setWantToHearLoading] = useState(false)
  const [loggedLoading, setLoggedLoading] = useState(false)
  const [listLoading, setListLoading] = useState(false)
  const [listSaving, setListSaving] = useState(false)
  const [diaryLoading, setDiaryLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lists, setLists] = useState<Array<{ id: string; title: string; category: 'MIXED' | 'ALBUMS' | 'SINGLES' | 'EPS' | 'MIXTAPES' }>>([])
  const [selectedListId, setSelectedListId] = useState('')
  const [diaryForm, setDiaryForm] = useState({
    listenedAt: todayValue(),
    notes: '',
    reviewContent: '',
  })

  const canAttachReview = useMemo(() => diaryForm.reviewContent.trim().length > 0, [diaryForm.reviewContent])

  function getErrorMessage(caught: any, fallback: string) {
    return caught?.response?.data?.error || caught?.response?.data?.error?.message || fallback
  }

  useEffect(() => {
    async function loadLists() {
      if (!user?.id) {
        return
      }

      setListLoading(true)
      try {
        const nextLists = await getMyLists(user.id)
        setLists(nextLists.map((list) => ({ id: list.id, title: list.title, category: list.category })))
        if (nextLists.length) {
          setSelectedListId((current) => current || nextLists[0].id)
        }
      } catch {
        setLists([])
      } finally {
        setListLoading(false)
      }
    }

    loadLists()
  }, [user?.id])

  useEffect(() => {
    async function loadLoggedState() {
      if (!user?.id) {
        return
      }

      setLoggedLoading(true)
      try {
        const diaryEntries = await getMyDiary(1, 0, release.id)
        const isLogged = diaryEntries.pagination.total > 0
        const nextWantToHear = isLogged ? false : release.isWantToHear
        if (release.isLogged !== isLogged || release.isWantToHear !== nextWantToHear) {
          onReleaseChange({
            ...release,
            isLogged,
            isWantToHear: nextWantToHear,
          })
        }
      } catch {
        if (release.isLogged === undefined) {
          onReleaseChange({
            ...release,
            isLogged: false,
          })
        }
      } finally {
        setLoggedLoading(false)
      }
    }

    loadLoggedState()
  }, [onReleaseChange, release.id, release.isLogged, release.isWantToHear, user?.id])

  if (!user) {
    return (
      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 text-white/64">
        Sign in to rate this release, like it, add it to your lists, or log it to your diary.
      </div>
    )
  }

  async function handleRate(value: number) {
    setError(null)
    setMessage(null)
    setRatingLoading(value)

    try {
      await rateRelease(release.id, value)
      onReleaseChange({
        ...release,
        userRating: { id: release.userRating?.id || 'local', value },
      })
      setMessage(`Saved your ${formatRatingValue(value)}-star rating.`)
    } catch (caught: any) {
      setError(getErrorMessage(caught, 'Unable to save rating right now.'))
    } finally {
      setRatingLoading(null)
    }
  }

  async function handleClearRating() {
    if (!release.userRating) {
      return
    }

    setError(null)
    setMessage(null)
    setRatingLoading(-1)

    try {
      await removeReleaseRating(release.id)
      onReleaseChange({
        ...release,
        userRating: null,
      })
      setMessage('Removed your rating.')
    } catch (caught: any) {
      setError(getErrorMessage(caught, 'Unable to remove your rating right now.'))
    } finally {
      setRatingLoading(null)
    }
  }

  async function handleFavoriteToggle() {
    setError(null)
    setMessage(null)
    setFavoriteLoading(true)
    const previousRelease = release
    const nextIsLiked = !release.isLiked
    const nextLikesCount = Math.max(0, (release.counts?.likes || 0) + (nextIsLiked ? 1 : -1))

    onReleaseChange({
      ...release,
      isLiked: nextIsLiked,
      counts: release.counts
        ? {
            ...release.counts,
            likes: nextLikesCount,
          }
        : release.counts,
    })

    try {
      if (release.isLiked) {
        await removeReleaseLike(release.id)
        setMessage('Removed from your liked releases.')
      } else {
        await addReleaseLike(release.id)
        setMessage('Added to your liked releases.')
      }
    } catch (caught: any) {
      onReleaseChange(previousRelease)
      setError(getErrorMessage(caught, 'Unable to update likes right now.'))
    } finally {
      setFavoriteLoading(false)
    }
  }

  async function handleAddToList() {
    if (!selectedListId) {
      return
    }

    setError(null)
    setMessage(null)
    setListSaving(true)
    const previousRelease = release
    const nextListsCount = Math.max(0, (release.counts?.lists || 0) + 1)

    onReleaseChange({
      ...release,
      counts: release.counts
        ? {
            ...release.counts,
            lists: nextListsCount,
          }
        : release.counts,
    })

    try {
      await addListItem(selectedListId, { releaseId: release.id })
      const selectedList = lists.find((list) => list.id === selectedListId)
      setMessage(`Added to ${selectedList?.title || 'your list'}.`)
    } catch (caught: any) {
      onReleaseChange(previousRelease)
      setError(getErrorMessage(caught, 'Unable to add this release to a list right now.'))
    } finally {
      setListSaving(false)
    }
  }

  async function handleWantToHearToggle() {
    setError(null)
    setMessage(null)
    setWantToHearLoading(true)
    const previousRelease = release
    const nextWantToHear = !release.isWantToHear

    onReleaseChange({
      ...release,
      isWantToHear: nextWantToHear,
    })

    try {
      if (release.isWantToHear) {
        await removeWantToHear(release.id)
        setMessage('Removed from want to hear.')
      } else {
        await addWantToHear(release.id)
        setMessage('Added to want to hear.')
      }
    } catch (caught: any) {
      onReleaseChange(previousRelease)
      setError(getErrorMessage(caught, 'Unable to update want to hear right now.'))
    } finally {
      setWantToHearLoading(false)
    }
  }

  async function handleDiarySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setDiaryLoading(true)

    try {
      await createDiaryEntry({
        releaseId: release.id,
        listenedAt: new Date(`${diaryForm.listenedAt}T12:00:00.000Z`).toISOString(),
        notes: diaryForm.notes || undefined,
        createReview: canAttachReview,
        reviewContent: canAttachReview ? diaryForm.reviewContent : undefined,
      })
      onReleaseChange({ ...release, isLogged: true, isWantToHear: false })
      setDiaryForm({ listenedAt: todayValue(), notes: '', reviewContent: '' })
      setMessage('Logged to your diary.')
      onDiaryCreated?.()
    } catch (caught: any) {
      setError(getErrorMessage(caught, 'Unable to log this listen right now.'))
    } finally {
      setDiaryLoading(false)
    }
  }

  return (
    <div className="space-y-4 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f4d35e]">Release Menu</p>
        <h3 className="mt-2 text-2xl font-semibold text-white">Save, sort, and react to this release</h3>
        <p className="mt-3 text-sm text-white/62">Use the quick actions below to file this release into your own world.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleFavoriteToggle}
          disabled={favoriteLoading}
          className={release.isLiked ? 'inline-flex items-center justify-center gap-2 rounded-[1.2rem] bg-[#ff7b54] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#ff8f6f]' : 'inline-flex items-center justify-center gap-2 rounded-[1.2rem] border border-white/12 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.08]'}
        >
          {favoriteLoading ? <BrandLoader className="h-4 w-auto" /> : <Heart className="h-4 w-4" />}
          {release.isLiked ? 'Unlike Release' : 'Like Release'}
        </button>

        <button
          type="button"
          onClick={handleWantToHearToggle}
          disabled={wantToHearLoading || loggedLoading || release.isLogged}
          className={release.isLogged ? 'inline-flex items-center justify-center gap-2 rounded-[1.2rem] border border-[#f4d35e]/24 bg-[#f4d35e]/10 px-4 py-3 text-sm font-semibold text-[#f8e7a2]' : release.isWantToHear ? 'inline-flex items-center justify-center gap-2 rounded-[1.2rem] bg-[#8ecae6] px-4 py-3 text-sm font-semibold text-[#111318] transition hover:bg-[#a8def2]' : 'inline-flex items-center justify-center gap-2 rounded-[1.2rem] border border-white/12 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.08]'}
        >
          {wantToHearLoading || loggedLoading ? <BrandLoader className="h-4 w-auto" /> : <BookmarkPlus className="h-4 w-4" />}
          {release.isLogged ? 'Already Logged' : release.isWantToHear ? 'Remove Want To Hear' : 'Add To Want To Hear'}
        </button>
      </div>

      {release.isLogged ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/68">
          This release is already in your diary, so want to hear is disabled here.
        </p>
      ) : null}

      <Link href="/profile" className="inline-flex items-center justify-center gap-2 rounded-[1.2rem] border border-white/12 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.08]">
        <LibraryBig className="h-4 w-4" />
        Manage Lists
      </Link>

      <div className="space-y-3 rounded-[1.5rem] border border-white/10 bg-[#111318]/70 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Plus className="h-4 w-4 text-[#8ecae6]" />
          Add to one of your lists
        </div>
        {listLoading ? (
          <div className="flex items-center gap-2 text-sm text-white/60">
            <BrandLoader className="h-4 w-auto" />
            Loading your lists...
          </div>
        ) : lists.length ? (
          <div className="flex flex-col gap-3">
            <select value={selectedListId} onChange={(event) => setSelectedListId(event.target.value)} className="h-11 w-full rounded-2xl border border-white/10 bg-white/8 px-4 text-sm text-black outline-none">
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddToList}
              disabled={listSaving || !selectedListId}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#8ecae6] px-5 text-sm font-semibold text-[#111318] transition hover:bg-[#a8def2] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {listSaving ? <BrandLoader className="h-4 w-auto" /> : <Plus className="h-4 w-4" />}
              Add To Selected List
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-white/60">You have not created any lists yet.</p>
            <Link href="/profile" className="inline-flex items-center gap-2 rounded-full bg-[#f4d35e] px-4 py-2 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082]">
              Create a list
            </Link>
          </div>
        )}
      </div>

      <RatingPicker
        value={release.userRating?.value ?? null}
        loadingValue={ratingLoading}
        onRate={handleRate}
        onClear={handleClearRating}
      />

      <form onSubmit={handleDiarySubmit} className="space-y-3 rounded-[1.5rem] border border-white/10 bg-[#111318]/70 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <CalendarPlus className="h-4 w-4 text-[#8ecae6]" />
          Log this release to your diary
        </div>
        <input
          type="date"
          value={diaryForm.listenedAt}
          onChange={(event) => setDiaryForm((current) => ({ ...current, listenedAt: event.target.value }))}
          className="h-11 w-full rounded-2xl border border-white/10 bg-white/8 px-4 text-sm text-black outline-none"
          required
        />
        <textarea
          placeholder="Notes about this listen"
          value={diaryForm.notes}
          onChange={(event) => setDiaryForm((current) => ({ ...current, notes: event.target.value }))}
          className="min-h-[100px] w-full rounded-[1.25rem] border border-white/10 bg-white/8 px-4 py-3 text-sm text-black placeholder:text-white/36 outline-none"
        />
        <textarea
          placeholder="Optional review text. Add at least 10 characters to publish a review with this diary entry."
          value={diaryForm.reviewContent}
          onChange={(event) => setDiaryForm((current) => ({ ...current, reviewContent: event.target.value }))}
          className="min-h-[120px] w-full rounded-[1.25rem] border border-white/10 bg-white/8 px-4 py-3 text-sm text-black placeholder:text-white/36 outline-none"
        />
        <button
          type="submit"
          disabled={diaryLoading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#f4d35e] px-5 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {diaryLoading ? <BrandLoader className="h-4 w-auto" /> : null}
          Save Diary Entry
        </button>
      </form>
      {error ? <p className="rounded-2xl border border-[#ff7b54]/30 bg-[#ff7b54]/10 px-4 py-3 text-sm text-[#ffd6cc]">{error}</p> : null}
      {message ? <p className="rounded-2xl border border-[#2a9d8f]/30 bg-[#2a9d8f]/10 px-4 py-3 text-sm text-[#d1fff3]">{message}</p> : null}
    </div>
  )
}
