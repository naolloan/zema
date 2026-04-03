'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Bell, ChevronDown, LogOut, Menu, Search, Sparkles, UserCircle2, X } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { BrandMark, BrandWordmark } from '@/components/brand/brand-logo'
import { UserAvatar } from '@/components/profile/user-avatar'
import { getMyNotificationsPage, logoutUser } from '@/lib/auth-api'
import { subscribeToNotificationCount } from '@/lib/notification-events'
import { useAuthStore } from '@/store/auth-store'
import type { NotificationItem } from '@/types'

const publicNavItems = [
  { href: '/explore', label: 'Explore' },
  { href: '/releases', label: 'Releases' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/activity', label: 'Activity' },
  { href: '/lists', label: 'Lists' },
  { href: '/auth/login', label: 'Sign In' },
]

const privateNavItems = [
  { href: '/explore', label: 'Explore' },
  { href: '/releases', label: 'Releases' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/activity', label: 'Activity' },
  { href: '/lists', label: 'Lists' },
]

export function SiteHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const notificationMenuRef = useRef<HTMLDivElement | null>(null)
  const accountMenuRef = useRef<HTMLDivElement | null>(null)
  const mobileNavRef = useRef<HTMLDivElement | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const [notificationPreview, setNotificationPreview] = useState<NotificationItem[]>([])
  const { user, hydrated, hydrate, clearSession } = useAuthStore((state) => ({
    user: state.user,
    hydrated: state.hydrated,
    hydrate: state.hydrate,
    clearSession: state.clearSession,
  }))

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    async function loadNotifications() {
      if (!user) {
        setNotificationCount(0)
        return
      }

      try {
        const notifications = await getMyNotificationsPage(1, 0, 'unread')
        setNotificationCount(notifications.pagination.total)
      } catch {
        setNotificationCount(0)
      }
    }

    if (hydrated) {
      loadNotifications()
    }
  }, [hydrated, user])

  useEffect(() => subscribeToNotificationCount((unreadCount) => {
    setNotificationCount(unreadCount)
  }), [])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!notificationMenuRef.current?.contains(event.target as Node)) {
        setNotificationMenuOpen(false)
      }
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
      if (!mobileNavRef.current?.contains(event.target as Node)) {
        setMobileNavOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  const navItems = user ? privateNavItems : publicNavItems

  useEffect(() => {
    async function loadNotificationPreview() {
      if (!notificationMenuOpen || !user) {
        return
      }

      try {
        const notifications = await getMyNotificationsPage(5, 0, 'all')
        setNotificationPreview(notifications.data)
      } catch {
        setNotificationPreview([])
      }
    }

    loadNotificationPreview()
  }, [notificationMenuOpen, user])

  async function handleLogout() {
    try {
      await logoutUser()
    } catch {
      // Intentionally ignore logout transport issues and clear local auth state.
    } finally {
      setMenuOpen(false)
      clearSession()
      router.push('/')
      router.refresh()
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[linear-gradient(180deg,rgba(12,14,19,0.92),rgba(12,14,19,0.72))] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 text-white">
          <BrandMark className="h-[3.85rem] w-[5.3rem] shrink-0" />
          <BrandWordmark className="text-[1.72rem] font-bold tracking-[0.12em] text-white sm:text-[1.95rem]" />
        </Link>

        <nav className="hidden items-center gap-3 md:flex">
          {navItems.map((item) => {
            const active = item.href === '/'
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? 'rounded-full border border-[#f4d35e]/24 bg-[#f4d35e]/12 px-4 py-2 text-sm font-medium text-white'
                    : 'rounded-full px-4 py-2 text-sm font-medium text-white/72 transition hover:bg-white/[0.06] hover:text-white'
                }
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/explore"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#8ecae6]/18 bg-[#8ecae6]/10 text-sm font-medium text-white transition hover:border-[#8ecae6]/30 hover:bg-[#8ecae6]/16 sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-2"
          >
            <Search className="h-4 w-4 text-[#8ecae6]" />
            <span className="hidden sm:inline">Search</span>
          </Link>

          {!hydrated ? null : user ? (
            <>
              <div ref={notificationMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setNotificationMenuOpen((current) => !current)}
                  className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] text-white transition hover:border-white/20 hover:bg-white/[0.08]"
                >
                  <Bell className="h-4 w-4" />
                  {notificationCount ? (
                    <span className="absolute -right-1 -top-1 inline-flex min-h-[1.2rem] min-w-[1.2rem] items-center justify-center rounded-full bg-[#f4d35e] px-1 text-[10px] font-bold text-[#111318]">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </span>
                  ) : null}
                </button>

                {notificationMenuOpen ? (
                  <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-80 rounded-[1.25rem] border border-white/10 bg-[#101720]/96 p-2 shadow-[0_22px_60px_rgba(0,0,0,0.3)] backdrop-blur">
                    <div className="flex items-center justify-between border-b border-white/8 px-3 py-3">
                      <div>
                        <p className="text-sm font-semibold text-white">Notifications</p>
                        <p className="mt-1 text-xs text-white/45">{notificationCount ? `${notificationCount} unread` : 'All caught up'}</p>
                      </div>
                      <Link
                        href="/notifications"
                        onClick={() => setNotificationMenuOpen(false)}
                        className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8ecae6]"
                      >
                        View all
                      </Link>
                    </div>
                    <div className="max-h-[22rem] overflow-y-auto py-2">
                      {notificationPreview.length ? (
                        notificationPreview.map((item) => (
                          <Link
                            key={item.id}
                            href={item.targetUrl || '/notifications'}
                            onClick={() => setNotificationMenuOpen(false)}
                            className="flex items-start gap-3 rounded-xl px-3 py-3 transition hover:bg-white/[0.06]"
                          >
                            <UserAvatar user={item.user} className="h-10 w-10 shrink-0" textClassName="text-[11px]" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start gap-2">
                                {item.unread ? <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#f4d35e]" /> : <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-white/12" />}
                                <p className="text-sm leading-6 text-white/78">{item.text}</p>
                              </div>
                            </div>
                          </Link>
                        ))
                      ) : (
                        <div className="px-3 py-4 text-sm text-white/55">No recent notifications yet.</div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <div ref={accountMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08]"
                >
                  {user.avatarUrl ? <UserAvatar user={user} className="h-8 w-8" textClassName="text-[11px]" /> : <UserCircle2 className="h-5 w-5" />}
                  <span className="hidden sm:inline">{user.displayName || user.username}</span>
                  <ChevronDown className={`h-4 w-4 text-white/60 transition ${menuOpen ? 'rotate-180' : ''}`} />
                </button>

                {menuOpen ? (
                  <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-56 rounded-[1.25rem] border border-white/10 bg-[#101720]/96 p-2 shadow-[0_22px_60px_rgba(0,0,0,0.3)] backdrop-blur">
                    <div className="border-b border-white/8 px-3 py-3">
                      <p className="text-sm font-semibold text-white">{user.displayName || user.username}</p>
                      <p className="mt-1 text-xs text-white/45">@{user.username}</p>
                    </div>
                    <div className="py-2">
                      <Link
                        href="/profile"
                        onClick={() => setMenuOpen(false)}
                        className="block rounded-xl px-3 py-2 text-sm font-medium text-white/78 transition hover:bg-white/[0.06] hover:text-white"
                      >
                        Profile
                      </Link>
                      <Link
                        href="/profile/settings"
                        onClick={() => setMenuOpen(false)}
                        className="mt-1 block rounded-xl px-3 py-2 text-sm font-medium text-white/78 transition hover:bg-white/[0.06] hover:text-white"
                      >
                        Account Settings
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="mt-1 inline-flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-white/78 transition hover:bg-white/[0.06] hover:text-white"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div ref={mobileNavRef} className="relative md:hidden">
                <button
                  type="button"
                  onClick={() => setMobileNavOpen((current) => !current)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] text-white transition hover:border-white/20 hover:bg-white/[0.08]"
                  aria-expanded={mobileNavOpen}
                  aria-label="Open navigation menu"
                >
                  {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>

                {mobileNavOpen ? (
                  <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-72 rounded-[1.25rem] border border-white/10 bg-[#101720]/96 p-2 shadow-[0_22px_60px_rgba(0,0,0,0.3)] backdrop-blur">
                    <div className="border-b border-white/8 px-3 py-3">
                      <p className="text-sm font-semibold text-white">Navigate</p>
                      <p className="mt-1 text-xs text-white/45">Browse the app from mobile too.</p>
                    </div>
                    <div className="py-2">
                      {privateNavItems.map((item) => {
                        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileNavOpen(false)}
                            className={active ? 'block rounded-xl bg-[#f4d35e]/12 px-3 py-2 text-sm font-medium text-white' : 'block rounded-xl px-3 py-2 text-sm font-medium text-white/78 transition hover:bg-white/[0.06] hover:text-white'}
                          >
                            {item.label}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 rounded-full bg-[#f4d35e] px-4 py-2 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082]"
              >
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Start Logging</span>
                <span className="sm:hidden">Join</span>
              </Link>

              <div ref={mobileNavRef} className="relative md:hidden">
                <button
                  type="button"
                  onClick={() => setMobileNavOpen((current) => !current)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] text-white transition hover:border-white/20 hover:bg-white/[0.08]"
                  aria-expanded={mobileNavOpen}
                  aria-label="Open navigation menu"
                >
                  {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>

                {mobileNavOpen ? (
                  <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-72 rounded-[1.25rem] border border-white/10 bg-[#101720]/96 p-2 shadow-[0_22px_60px_rgba(0,0,0,0.3)] backdrop-blur">
                    <div className="border-b border-white/8 px-3 py-3">
                      <p className="text-sm font-semibold text-white">Navigate</p>
                      <p className="mt-1 text-xs text-white/45">Explore Zeማa from mobile view.</p>
                    </div>
                    <div className="py-2">
                      {publicNavItems.map((item) => {
                        const active = item.href === '/'
                          ? pathname === item.href
                          : pathname === item.href || pathname.startsWith(`${item.href}/`)
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileNavOpen(false)}
                            className={active ? 'block rounded-xl bg-[#f4d35e]/12 px-3 py-2 text-sm font-medium text-white' : 'block rounded-xl px-3 py-2 text-sm font-medium text-white/78 transition hover:bg-white/[0.06] hover:text-white'}
                          >
                            {item.label}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
