'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { BrandLoader } from '@/components/brand/brand-logo'
import { getMyNotificationsPage, markMyNotificationsRead, markMyNotificationsUnread, markNotificationReadState } from '@/lib/auth-api'
import { emitNotificationCount } from '@/lib/notification-events'
import { useAuthStore } from '@/store/auth-store'
import type { NotificationItem } from '@/types'
import { UserAvatar } from '@/components/profile/user-avatar'
import { formatDateTime } from '@/lib/utils'

const PAGE_SIZE = 12

export default function NotificationsPage() {
  const { user, hydrated, hydrate } = useAuthStore((state) => ({
    user: state.user,
    hydrated: state.hydrated,
    hydrate: state.hydrate,
  }))
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [updatingState, setUpdatingState] = useState<'read' | 'unread' | null>(null)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    async function loadNotifications() {
      if (!user) {
        setLoading(false)
        emitNotificationCount(0)
        return
      }

      try {
        const data = await getMyNotificationsPage(PAGE_SIZE, offset, filter)
        setNotifications((current) => (offset === 0 ? data.data : [...current, ...data.data]))
        setTotal(data.pagination.total)
        const unreadData = await getMyNotificationsPage(1, 0, 'unread')
        emitNotificationCount(unreadData.pagination.total)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    }

    if (hydrated) {
      loadNotifications()
    }
  }, [filter, hydrated, offset, user])

  useEffect(() => {
    setOffset(0)
    setNotifications([])
    setTotal(0)
    setLoading(true)
  }, [filter])

  async function handleNotificationState(nextState: 'read' | 'unread') {
    setUpdatingState(nextState)
    try {
      if (nextState === 'read') {
        await markMyNotificationsRead()
      } else {
        await markMyNotificationsUnread()
      }
      const data = await getMyNotificationsPage(PAGE_SIZE, 0, filter)
      const unreadData = await getMyNotificationsPage(1, 0, 'unread')
      setOffset(0)
      setNotifications(data.data)
      setTotal(data.pagination.total)
      emitNotificationCount(unreadData.pagination.total)
    } finally {
      setUpdatingState(null)
    }
  }

  async function handleNotificationItemState(notificationId: string, nextState: 'read' | 'unread') {
    await markNotificationReadState(notificationId, nextState)
    const unreadData = await getMyNotificationsPage(1, 0, 'unread')
    emitNotificationCount(unreadData.pagination.total)
    setNotifications((current) => {
      const next = current.map((item) =>
        item.id === notificationId ? { ...item, unread: nextState === 'unread' } : item,
      )
      return filter === 'unread' ? next.filter((item) => item.unread) : next
    })
    setTotal((current) => {
      if (filter === 'all') {
        return current
      }
      return nextState === 'unread' ? current : Math.max(current - 1, 0)
    })
  }

  function handleLoadMore() {
    setLoadingMore(true)
    setOffset((current) => current + PAGE_SIZE)
  }

  if (!hydrated || loading) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-4 py-10 text-white/70">
        <BrandLoader className="h-5 w-auto" />
      </main>
    )
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-white">
          <h1 className="text-3xl font-semibold">Sign in to view notifications</h1>
          <p className="mt-3 text-white/64">Follows, review likes, comments, and list likes will appear here.</p>
          <div className="mt-6 flex gap-3">
            <Link href="/auth/login" className="rounded-full bg-[#f4d35e] px-5 py-3 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082]">Sign In</Link>
            <Link href="/auth/register" className="rounded-full border border-white/12 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.08]">Create Account</Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,22,31,0.96),rgba(16,19,27,0.88))] p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-[#f4d35e]" />
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-white/45">Notifications</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">Your recent activity</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleNotificationState('read')}
              disabled={updatingState !== null}
              className="rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:opacity-60"
            >
              {updatingState === 'read' ? 'Marking...' : 'Mark All Read'}
            </button>
            <button
              type="button"
              onClick={() => handleNotificationState('unread')}
              disabled={updatingState !== null}
              className="rounded-full border border-[#f4d35e]/24 bg-[#f4d35e]/10 px-4 py-2 text-sm font-semibold text-[#f8e7a2] transition hover:bg-[#f4d35e]/16 disabled:opacity-60"
            >
              {updatingState === 'unread' ? 'Restoring...' : 'Mark All Unread'}
            </button>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-white/10 bg-[#11161f] p-1">
          {(['all', 'unread'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={filter === tab ? 'rounded-full bg-[#f4d35e] px-4 py-2 text-sm font-semibold text-[#111318]' : 'rounded-full px-4 py-2 text-sm font-medium text-white/70 transition hover:text-white'}
            >
              {tab === 'all' ? 'All' : 'Unread'}
            </button>
          ))}
        </div>
        <p className="text-sm text-white/52">
          Showing {notifications.length} of {total} {filter === 'unread' ? 'unread' : 'total'} notifications
        </p>
      </div>

      <section className="space-y-4">
        {notifications.length ? (
          <>
            {buildNotificationGroups(notifications).map((group) => (
              <div key={group.label} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/10" />
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-white/42">{group.label}</p>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
                {group.items.map((item) => (
                  <div key={item.id} className={item.unread ? 'rounded-[1.4rem] border border-[#f4d35e]/24 bg-[#f4d35e]/[0.06] p-4' : 'rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4'}>
                    <div className="flex items-start gap-4">
                      <UserAvatar user={item.user} className="h-12 w-12" textClassName="text-sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm leading-7 text-white/78">{item.text}</p>
                            <p className="mt-1 text-[0.68rem] uppercase tracking-[0.18em] text-white/38">{formatDateTime(item.createdAt)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleNotificationItemState(item.id, item.unread ? 'read' : 'unread')}
                            className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/74 transition hover:border-white/20 hover:bg-white/[0.08]"
                          >
                            Mark {item.unread ? 'Read' : 'Unread'}
                          </button>
                        </div>
                        {item.targetUrl ? (
                          <Link href={item.targetUrl} className="mt-3 inline-flex rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8ecae6]">
                            Open
                          </Link>
                        ) : null}
                        {item.release && !item.targetUrl ? (
                          <Link href={`/releases/${item.release.id}`} className="mt-3 inline-flex rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8ecae6]">
                            {item.release.title}
                          </Link>
                        ) : null}
                        {item.list ? (
                          <Link href={`/lists/${item.list.id}`} className="mt-3 inline-flex rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8ecae6]">
                            {item.list.title}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {notifications.length < total ? (
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:opacity-60"
              >
                {loadingMore ? <BrandLoader className="h-4 w-auto" /> : null}
                Load More
              </button>
            ) : null}
          </>
        ) : (
          <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-6 text-white/60">
            {filter === 'unread'
              ? 'No unread notifications right now.'
              : 'No notifications yet. When people follow you, like your reviews, comment on them, or like your lists, they will appear here.'}
          </div>
        )}
      </section>
    </main>
  )
}

function buildNotificationGroups(notifications: NotificationItem[]) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfWeek = startOfToday - 6 * 24 * 60 * 60 * 1000

  const groups = [
    { label: 'Today', items: [] as NotificationItem[] },
    { label: 'This Week', items: [] as NotificationItem[] },
    { label: 'Earlier', items: [] as NotificationItem[] },
  ]

  notifications.forEach((notification) => {
    const createdAt = new Date(notification.createdAt).getTime()
    if (createdAt >= startOfToday) {
      groups[0].items.push(notification)
    } else if (createdAt >= startOfWeek) {
      groups[1].items.push(notification)
    } else {
      groups[2].items.push(notification)
    }
  })

  return groups.filter((group) => group.items.length > 0)
}
