'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { BrandLoader } from '@/components/brand/brand-logo'
import { Input } from '@/components/ui/input'
import { resetPassword } from '@/lib/auth-api'
import { useAuthStore } from '@/store/auth-store'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setSession = useAuthStore((state) => state.setSession)
  const token = useMemo(() => searchParams.get('token') || '', [searchParams])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!token) {
      setError('This reset link is missing its token.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const session = await resetPassword(token, password)
      setSession(session)
      router.replace('/profile')
      router.refresh()
    } catch (caught: any) {
      setError(caught?.response?.data?.error || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <form onSubmit={handleSubmit} className="space-y-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8ecae6]">Choose A New Password</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">Set your new password.</h1>
          <p className="mt-4 text-white/64">Use a password you haven&apos;t used before.</p>
        </div>

        {!token ? (
          <p className="rounded-2xl border border-[#ff7b54]/30 bg-[#ff7b54]/10 px-4 py-3 text-sm text-[#ffd6cc]">
            This password reset link is incomplete. <Link href="/auth/forgot-password" className="underline underline-offset-4">Request a fresh one</Link>.
          </p>
        ) : null}

        <Input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-12 rounded-2xl border-white/10 bg-white/8 text-black placeholder:text-white/36"
          required
        />
        <Input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="h-12 rounded-2xl border-white/10 bg-white/8 text-black placeholder:text-white/36"
          required
        />

        {error ? <p className="rounded-2xl border border-[#ff7b54]/30 bg-[#ff7b54]/10 px-4 py-3 text-sm text-[#ffd6cc]">{error}</p> : null}

        <button
          type="submit"
          disabled={loading || !token}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#f4d35e] px-6 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? <BrandLoader className="h-4 w-auto" /> : null}
          Reset password
        </button>
      </form>
    </main>
  )
}
