'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { BrandLoader } from '@/components/brand/brand-logo'
import { verifyEmailToken } from '@/lib/auth-api'
import { useAuthStore } from '@/store/auth-store'

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setSession = useAuthStore((state) => state.setSession)
  const token = useMemo(() => searchParams.get('token') || '', [searchParams])
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function run() {
      if (!token) {
        setStatus('error')
        setError('This verification link is missing its token.')
        return
      }

      try {
        const session = await verifyEmailToken(token)
        if (!active) {
          return
        }
        setSession(session)
        setStatus('success')
        router.replace('/profile')
        router.refresh()
      } catch (caught: any) {
        if (!active) {
          return
        }
        setStatus('error')
        setError(caught?.response?.data?.error || 'This verification link is invalid or has expired.')
      }
    }

    void run()

    return () => {
      active = false
    }
  }, [router, setSession, token])

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center">
        {status === 'loading' ? (
          <>
            <BrandLoader className="mx-auto h-12 w-auto" />
            <h1 className="mt-6 text-3xl font-semibold text-white">Verifying your email…</h1>
          </>
        ) : null}

        {status === 'error' ? (
          <>
            <h1 className="text-3xl font-semibold text-white">Verification failed</h1>
            <p className="mt-4 text-white/68">{error}</p>
            <Link href="/auth/login" className="mt-6 inline-flex rounded-full bg-[#f4d35e] px-5 py-3 text-sm font-semibold text-[#111318]">
              Back to sign in
            </Link>
          </>
        ) : null}

        {status === 'success' ? (
          <>
            <h1 className="text-3xl font-semibold text-white">Email verified</h1>
            <p className="mt-4 text-white/68">Taking you to your profile…</p>
          </>
        ) : null}
      </div>
    </main>
  )
}
