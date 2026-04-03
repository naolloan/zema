'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BrandLoader } from '@/components/brand/brand-logo'
import { ProfileEditor } from '@/components/profile/profile-editor'
import { getMyProfile } from '@/lib/auth-api'
import { useAuthStore } from '@/store/auth-store'
import type { Profile } from '@/types'

export default function ProfileSettingsPage() {
  const { user, token, hydrated, hydrate, clearSession } = useAuthStore((state) => ({
    user: state.user,
    token: state.token,
    hydrated: state.hydrated,
    hydrate: state.hydrate,
    clearSession: state.clearSession,
  }))
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    async function loadProfile() {
      if (!token || !user) {
        setLoading(false)
        return
      }

      try {
        const data = await getMyProfile()
        setProfile(data)
      } catch {
        clearSession()
      } finally {
        setLoading(false)
      }
    }

    if (hydrated) {
      loadProfile()
    }
  }, [clearSession, hydrated, token, user])

  if (!hydrated || loading) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center px-4 py-10 text-white/70">
        <BrandLoader className="h-5 w-auto" />
      </main>
    )
  }

  if (!token || !user || !profile) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-white">
          <h1 className="text-3xl font-semibold">Sign in to edit account settings</h1>
          <p className="mt-3 text-white/64">Account settings include profile identity, avatar, privacy permissions, password updates, and account deletion.</p>
          <div className="mt-6 flex gap-3">
            <Link href="/auth/login" className="rounded-full bg-[#f4d35e] px-5 py-3 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082]">Sign In</Link>
            <Link href="/auth/register" className="rounded-full border border-white/12 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.08]">Create Account</Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-5">
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/72 transition hover:bg-white/[0.08] hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to profile
        </Link>
      </div>

      <section className="mb-6 rounded-[1.4rem] border border-white/10 bg-[#101720] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f4d35e]">Account Settings</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Manage your account in one place</h1>
        <p className="mt-2 text-sm leading-7 text-white/64">
          Update display and profile details, avatar, password, comment permissions, and account deletion from this page.
        </p>
      </section>

      <ProfileEditor profile={profile} onProfileChange={setProfile} />
    </main>
  )
}
