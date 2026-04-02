'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { MessageCircle, Send, Trash2 } from 'lucide-react'
import { BrandLoader } from '@/components/brand/brand-logo'
import { ListLikeButton } from '@/components/lists/list-like-button'
import { ArtistCreditLine } from '@/components/music/artist-credit-line'
import { ReleaseQuickMenu } from '@/components/music/release-quick-menu'
import { addListComment, deleteListComment, getListById, removeListItem, updateList, updateListItem } from '@/lib/auth-api'
import { UserAvatar } from '@/components/profile/user-avatar'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
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

function formatReleaseType(type: 'ALBUM' | 'SINGLE' | 'EP' | 'MIXTAPE') {
  return {
    ALBUM: 'Album',
    SINGLE: 'Single',
    EP: 'EP',
    MIXTAPE: 'Mixtape',
  }[type]
}

export default function ListDetailPage() {
  const params = useParams<{ id: string }>()
  const { user, hydrated, hydrate } = useAuthStore((state) => ({
    user: state.user,
    hydrated: state.hydrated,
    hydrate: state.hydrate,
  }))
  const [list, setList] = useState<List | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentValue, setCommentValue] = useState('')
  const [commentPending, setCommentPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    async function loadList() {
      if (!params?.id) return
      setLoading(true)
      try {
        const data = await getListById(params.id)
        setList(data)
        setTitle(data.title)
        setDescription(data.description || '')
      } catch {
        setList(null)
      } finally {
        setLoading(false)
      }
    }

    loadList()
  }, [params?.id])

  const isOwner = Boolean(user && list && user.id === list.user.id)

  async function handleSaveMeta() {
    if (!list || !isOwner) return
    try {
      const updated = await updateList(list.id, { title, description })
      setList({ ...list, ...updated })
      setEditing(false)
      setError(null)
    } catch (caught: any) {
      setError(caught?.response?.data?.error || 'Unable to update this list right now.')
    }
  }

  async function handleRemoveItem(itemId: string) {
    if (!list || !isOwner) return
    try {
      await removeListItem(list.id, itemId)
      setList({ ...list, items: (list.items || []).filter((item) => item.id !== itemId), itemsCount: Math.max(0, list.itemsCount - 1) })
      setError(null)
    } catch (caught: any) {
      setError(caught?.response?.data?.error || 'Unable to remove this item right now.')
    }
  }

  async function handleUpdateItem(itemId: string, notes: string) {
    if (!list || !isOwner) return
    try {
      const updated = await updateListItem(list.id, itemId, { notes })
      setList({
        ...list,
        items: (list.items || []).map((item) => (item.id === itemId ? { ...item, ...updated } : item)),
      })
      setError(null)
    } catch (caught: any) {
      setError(caught?.response?.data?.error || 'Unable to update notes right now.')
    }
  }

  async function handleAddComment() {
    if (!list || !commentValue.trim()) return
    try {
      setCommentPending(true)
      const comment = await addListComment(list.id, { content: commentValue.trim() })
      setList({
        ...list,
        comments: [...(list.comments || []), comment],
      })
      setCommentValue('')
      setError(null)
    } catch (caught: any) {
      setError(caught?.response?.data?.error || 'Unable to add a comment right now.')
    } finally {
      setCommentPending(false)
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!list) return
    try {
      setCommentPending(true)
      await deleteListComment(list.id, commentId)
      setList({
        ...list,
        comments: (list.comments || []).filter((comment) => comment.id !== commentId),
      })
      setError(null)
    } catch (caught: any) {
      setError(caught?.response?.data?.error || 'Unable to delete this comment right now.')
    } finally {
      setCommentPending(false)
    }
  }

  if (!hydrated || loading) {
    return <main className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 py-10 text-white/70"><BrandLoader className="h-5 w-auto" /></main>
  }

  if (!list) {
    return <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8"><div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-white"><h1 className="text-3xl font-semibold">List not found</h1></div></main>
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <Link href={isOwner ? '/profile#manage-lists' : `/users/${list.user.id}/lists`} className="text-sm text-[#f4d35e] transition hover:text-[#ffe082]">
        {isOwner ? 'Back to your list tools' : `More from ${list.user.displayName || list.user.username}`}
      </Link>
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
        {editing && isOwner ? (
          <div className="space-y-3">
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="List name" className="h-11 w-full rounded-2xl border border-white/10 bg-white/8 px-4 text-sm text-black placeholder:text-black/36 outline-none" />
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="List description" className="min-h-[120px] w-full rounded-[1.25rem] border border-white/10 bg-white/8 px-4 py-3 text-sm text-black placeholder:text-black/36 outline-none" />
            <div className="flex gap-3"><button onClick={handleSaveMeta} className="rounded-full bg-[#f4d35e] px-5 py-3 text-sm font-semibold text-[#111318]">Save</button><button onClick={() => setEditing(false)} className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-white">Cancel</button></div>
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8ecae6]">{list.isPublic ? 'Public List' : 'Private List'}</p>
              <p className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#f4d35e]">{formatListCategory(list.category)}</p>
              <Link href={`/users/${list.user.id}`} className="text-sm text-white/62 transition hover:text-white">by {list.user.displayName || list.user.username}</Link>
            </div>
            <h1 className="mt-4 text-4xl font-semibold text-white">{list.title}</h1>
            <p className="mt-4 max-w-3xl text-white/64">{list.description || 'No description yet.'}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-sm uppercase tracking-[0.2em] text-white/40">{list.itemsCount} releases</p>
              {list.isPublic ? <ListLikeButton listId={list.id} ownerId={list.user.id} initialLikesCount={list.likesCount} initialIsLiked={list.isLiked} /> : null}
              <button
                type="button"
                onClick={() => setCommentsOpen((current) => !current)}
                className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/72 transition hover:bg-white/12"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                {(list.comments || []).length}
              </button>
            </div>
            {isOwner ? <button onClick={() => setEditing(true)} className="mt-5 rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-white">Edit metadata</button> : null}
          </div>
        )}
      </section>
      {commentsOpen ? (
        <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="space-y-3">
            {(list.comments || []).map((comment) => (
              <div key={comment.id} className="rounded-2xl border border-white/8 bg-[#0f141d]/88 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <UserAvatar user={comment.user} className="h-10 w-10" textClassName="text-sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{comment.user.displayName || comment.user.username}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/40">{formatDate(comment.createdAt)}</p>
                    </div>
                  </div>
                  {user?.id === comment.user.id ? (
                    <button type="button" onClick={() => handleDeleteComment(comment.id)} className="text-white/45 transition hover:text-[#ffb4a2]">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <p className="mt-3 text-sm leading-6 text-white/76">{comment.content}</p>
              </div>
            ))}
          </div>
          {user ? (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                value={commentValue}
                onChange={(event) => setCommentValue(event.target.value)}
                placeholder="Write a comment"
                className="h-11 flex-1 rounded-full border border-white/10 bg-white/8 px-4 text-sm text-black placeholder:text-white/38 outline-none"
              />
              <button
                type="button"
                onClick={handleAddComment}
                disabled={commentPending || commentValue.trim().length < 2}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#f4d35e] px-4 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082] disabled:opacity-60"
              >
                {commentPending ? <BrandLoader className="h-4 w-auto" /> : <Send className="h-4 w-4" />}
                Reply
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
      {error ? <p className="rounded-2xl border border-[#ff7b54]/30 bg-[#ff7b54]/10 px-4 py-3 text-sm text-[#ffd6cc]">{error}</p> : null}
      <section className="space-y-4">
        {(list.items || []).map((item) => (
          <div key={item.id} className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/releases/${item.release.id}`} className="text-xl font-semibold text-white transition hover:text-[#f4d35e]">{item.release.title}</Link>
                  {list.category === 'MIXED' ? (
                    <span className="rounded-full border border-white/12 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8ecae6]">
                      {formatReleaseType(item.release.type)}
                    </span>
                  ) : null}
                </div>
                <ArtistCreditLine credits={item.release.artistCredits} className="mt-2 block text-sm text-white/56" />
                <p className="mt-2 text-sm text-white/54">Position {item.position}</p>
              </div>
              <div className="flex items-center gap-3 self-start sm:self-auto">
                <ReleaseQuickMenu release={item.release} buttonClassName="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#8ecae6]/25 bg-[#264653] text-[#d8eff8] transition hover:border-[#8ecae6]/45 hover:bg-[#2b5b63] hover:text-white" panelClassName="absolute right-0 top-12 z-30 w-72 rounded-[1.4rem] border border-[#8ecae6]/16 bg-[#20303b] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)]" />
                {isOwner ? <button onClick={() => handleRemoveItem(item.id)} className="rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-white">Remove</button> : null}
              </div>
            </div>
            {isOwner ? (
              <textarea defaultValue={item.notes || ''} onBlur={(event) => handleUpdateItem(item.id, event.target.value)} className="mt-4 min-h-[100px] w-full rounded-[1.25rem] border border-white/10 bg-white/8 px-4 py-3 text-sm text-black outline-none" placeholder="Add notes for this list entry" />
            ) : item.notes ? (
              <p className="mt-4 text-sm leading-7 text-white/72">{item.notes}</p>
            ) : null}
          </div>
        ))}
      </section>
    </main>
  )
}
