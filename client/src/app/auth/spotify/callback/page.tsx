'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { BrandLoader } from '@/components/brand/brand-logo'
import type { AuthSession } from '@/types'
import { useAuthStore } from '@/store/auth-store'

function decodeSessionPayload(payload: string): AuthSession {
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = window.atob(padded)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes)) as AuthSession
}

export default function SpotifyCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setSession = useAuthStore((state) => state.setSession)
  const sessionPayload = searchParams.get('session')
  const error = searchParams.get('error')

  useEffect(() => {
    if (!sessionPayload) {
      return
    }

    try {
      const session = decodeSessionPayload(sessionPayload)
      setSession(session)
      router.replace('/profile')
      router.refresh()
    } catch {
      router.replace('/auth/login')
    }
  }, [router, sessionPayload, setSession])

  if (error) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center">
          <h1 className="text-3xl font-semibold text-white">Spotify sign-in couldn&apos;t finish</h1>
          <p className="mt-4 text-white/68">{error}</p>
          <Link href="/auth/login" className="mt-6 inline-flex rounded-full bg-[#1db954] px-5 py-3 text-sm font-semibold text-[#07110b]">
            Back to sign in
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center">
        <BrandLoader className="mx-auto h-12 w-auto" />
        <h1 className="mt-6 text-3xl font-semibold text-white">Signing you in with Spotify…</h1>
      </div>
    </main>
  )
}
