'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { BookmarkPlus, ExternalLink, Heart, LibraryBig, MoreVertical, Plus } from 'lucide-react'
import { BrandLoader } from '@/components/brand/brand-logo'
import type { Release } from '@/types'
import { addListItem, addReleaseLike, addWantToHear, getMyDiary, getMyLists, removeReleaseLike, removeWantToHear } from '@/lib/auth-api'
import { useAuthStore } from '@/store/auth-store'

interface ReleaseQuickMenuProps {
  release: Release
  onReleaseChange?: (release: Release) => void
  buttonClassName?: string
  panelClassName?: string
}

export function ReleaseQuickMenu({ release, onReleaseChange, buttonClassName, panelClassName }: ReleaseQuickMenuProps) {
  const user = useAuthStore((state) => state.user)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuMounted, setMenuMounted] = useState(false)
  const [localRelease, setLocalRelease] = useState(release)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [wantToHearLoading, setWantToHearLoading] = useState(false)
  const [listsLoading, setListsLoading] = useState(false)
  const [listSaving, setListSaving] = useState(false)
  const [loggedLoading, setLoggedLoading] = useState(false)
  const [selectedListId, setSelectedListId] = useState('')
  const [lists, setLists] = useState<Array<{ id: string; title: string }>>([])
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    setLocalRelease(release)
  }, [release])

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current)
      }
    }
  }, [])

  function applyLocalRelease(nextRelease: Release) {
    setLocalRelease(nextRelease)
    onReleaseChange?.(nextRelease)
  }

  function openMenu() {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
    }
    setMenuMounted(true)
    requestAnimationFrame(() => {
      setMenuOpen(true)
    })
  }

  function closeMenu() {
    setMenuOpen(false)
    closeTimeoutRef.current = setTimeout(() => {
      setMenuMounted(false)
    }, 160)
  }

  function toggleMenu() {
    if (menuMounted) {
      closeMenu()
      return
    }

    openMenu()
  }

  useEffect(() => {
    async function loadLists() {
      if (!menuMounted || !user?.id) {
        return
      }

      setListsLoading(true)
      try {
        const nextLists = await getMyLists(user.id)
        setLists(nextLists.map((list) => ({ id: list.id, title: list.title })))
        if (nextLists.length) {
          setSelectedListId((current) => current || nextLists[0].id)
        }
      } catch {
        setLists([])
      } finally {
        setListsLoading(false)
      }
    }

    loadLists()
  }, [menuMounted, user?.id])

  useEffect(() => {
    async function loadLoggedState() {
      if (!menuMounted || !user?.id) {
        return
      }

      setLoggedLoading(true)
      try {
        const diaryEntries = await getMyDiary(1, 0, localRelease.id)
        const isLogged = diaryEntries.pagination.total > 0
        applyLocalRelease({
          ...localRelease,
          isLogged,
          isWantToHear: isLogged ? false : localRelease.isWantToHear,
        })
      } catch {
        applyLocalRelease({
          ...localRelease,
          isLogged: localRelease.isLogged ?? false,
        })
      } finally {
        setLoggedLoading(false)
      }
    }

    loadLoggedState()
  }, [localRelease.id, menuMounted, user?.id])

  useEffect(() => {
    if (!menuMounted) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeMenu()
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeMenu()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuMounted])

  function getErrorMessage(caught: any, fallback: string) {
    return caught?.response?.data?.error || caught?.response?.data?.error?.message || fallback
  }

  async function handleFavoriteToggle() {
    setFeedback(null)
    setFavoriteLoading(true)

    const previousRelease = localRelease
    const nextIsLiked = !localRelease.isLiked
    applyLocalRelease({
      ...localRelease,
      isLiked: nextIsLiked,
      counts: localRelease.counts
        ? {
            ...localRelease.counts,
            likes: Math.max(0, (localRelease.counts.likes || 0) + (nextIsLiked ? 1 : -1)),
          }
        : localRelease.counts,
    })

    try {
      if (previousRelease.isLiked) {
        await removeReleaseLike(previousRelease.id)
        setFeedback('Removed from liked releases.')
      } else {
        await addReleaseLike(previousRelease.id)
        setFeedback('Added to liked releases.')
      }
    } catch (caught: any) {
      applyLocalRelease(previousRelease)
      setFeedback(getErrorMessage(caught, 'Unable to update likes right now.'))
    } finally {
      setFavoriteLoading(false)
    }
  }

  async function handleWantToHearToggle() {
    setFeedback(null)
    setWantToHearLoading(true)

    const previousRelease = localRelease
    applyLocalRelease({
      ...localRelease,
      isWantToHear: !localRelease.isWantToHear,
    })

    try {
      if (previousRelease.isWantToHear) {
        await removeWantToHear(previousRelease.id)
        setFeedback('Removed from want to hear.')
      } else {
        await addWantToHear(previousRelease.id)
        setFeedback('Added to want to hear.')
      }
    } catch (caught: any) {
      applyLocalRelease(previousRelease)
      setFeedback(getErrorMessage(caught, 'Unable to update want to hear right now.'))
    } finally {
      setWantToHearLoading(false)
    }
  }

  async function handleAddToList() {
    if (!selectedListId) {
      return
    }

    setFeedback(null)
    setListSaving(true)

    const previousRelease = localRelease
    applyLocalRelease({
      ...localRelease,
      counts: localRelease.counts
        ? {
            ...localRelease.counts,
            lists: Math.max(0, (localRelease.counts.lists || 0) + 1),
          }
        : localRelease.counts,
    })

    try {
      await addListItem(selectedListId, { releaseId: localRelease.id })
      const selectedList = lists.find((list) => list.id === selectedListId)
      setFeedback(`Added to ${selectedList?.title || 'your list'}.`)
    } catch (caught: any) {
      applyLocalRelease(previousRelease)
      setFeedback(getErrorMessage(caught, 'Unable to add to list right now.'))
    } finally {
      setListSaving(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggleMenu}
        className={buttonClassName || 'inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#8ecae6]/25 bg-[#264653] text-[#d8eff8] transition hover:border-[#8ecae6]/45 hover:bg-[#2b5b63] hover:text-white'}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label="Open release actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {menuMounted ? (
        <div className={`${panelClassName || 'absolute right-0 top-12 z-30 w-72 rounded-[1.4rem] border border-[#8ecae6]/16 bg-[#20303b] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)]'} transition-all duration-150 ease-out ${menuOpen ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none -translate-y-2 scale-[0.98] opacity-0'}`} role="menu">
          <div className="space-y-3">
            <Link href={`/releases/${localRelease.id}`} className="inline-flex w-full items-center justify-center rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.08]">
              Open Release Page
            </Link>

            {localRelease.spotifyUrl ? (
              <a
                href={localRelease.spotifyUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#1DB954]/35 bg-[#1DB954]/15 px-4 py-2 text-sm font-semibold text-[#d8ffe8] transition hover:bg-[#1DB954]/22"
              >
                Open In Spotify
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}

            {user ? (
              <>
                <button
                  type="button"
                  onClick={handleFavoriteToggle}
                  disabled={favoriteLoading}
                  className={localRelease.isLiked ? 'inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#ff7b54] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#ff8f6f]' : 'inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.08]'}
                >
                  {favoriteLoading ? <BrandLoader className="h-4 w-auto" /> : <Heart className="h-4 w-4" />}
                  {localRelease.isLiked ? 'Unlike Release' : 'Like Release'}
                </button>

                <button
                  type="button"
                  onClick={handleWantToHearToggle}
                  disabled={wantToHearLoading || loggedLoading || localRelease.isLogged}
                  className={localRelease.isLogged ? 'inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#f4d35e]/24 bg-[#f4d35e]/10 px-4 py-2 text-sm font-semibold text-[#f8e7a2]' : localRelease.isWantToHear ? 'inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#8ecae6] px-4 py-2 text-sm font-semibold text-[#111318] transition hover:bg-[#a8def2]' : 'inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.08]'}
                >
                  {wantToHearLoading || loggedLoading ? <BrandLoader className="h-4 w-auto" /> : <BookmarkPlus className="h-4 w-4" />}
                  {localRelease.isLogged ? 'Already Logged' : localRelease.isWantToHear ? 'Remove Want To Hear' : 'Add To Want To Hear'}
                </button>
                {localRelease.isLogged ? (
                  <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/68">
                    This release is already in your diary, so it cannot stay on your want-to-hear shelf.
                  </p>
                ) : null}

                <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-3">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                    <LibraryBig className="h-4 w-4 text-[#8ecae6]" />
                    Add to your lists
                  </div>
                  {listsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <BrandLoader className="h-4 w-auto" />
                      Loading lists...
                    </div>
                  ) : lists.length ? (
                    <div className="space-y-3">
                      <select value={selectedListId} onChange={(event) => setSelectedListId(event.target.value)} className="h-10 w-full rounded-2xl border border-white/10 bg-white/8 px-4 text-sm text-black outline-none">
                        {lists.map((list) => (
                          <option key={list.id} value={list.id}>{list.title}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAddToList}
                        disabled={!selectedListId || listSaving}
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#8ecae6] px-4 text-sm font-semibold text-[#111318] transition hover:bg-[#a8def2] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {listSaving ? <BrandLoader className="h-4 w-auto" /> : <Plus className="h-4 w-4" />}
                        Add To Selected List
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-white/60">No lists yet.</p>
                      <Link href="/profile" className="inline-flex w-full items-center justify-center rounded-full bg-[#f4d35e] px-4 py-2 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082]">
                        Create a list
                      </Link>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-3 rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-3">
                <p className="text-sm text-white/60">Sign in to like this release or save it to your lists.</p>
                <Link href="/auth/login" className="inline-flex w-full items-center justify-center rounded-full bg-[#f4d35e] px-4 py-2 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082]">
                  Sign In
                </Link>
              </div>
            )}

            {feedback ? (
              <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/70">{feedback}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
