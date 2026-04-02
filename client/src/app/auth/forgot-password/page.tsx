'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BrandLoader } from '@/components/brand/brand-logo'
import { Input } from '@/components/ui/input'
import { requestPasswordReset } from '@/lib/auth-api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewReason, setPreviewReason] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    setPreviewUrl(null)
    setPreviewReason(null)

    try {
      const result = await requestPasswordReset(email)
      setMessage('If an account exists for that email, a password reset link has been sent.')
      setPreviewUrl(result.previewUrl)
      setPreviewReason(result.deliveryMode === 'preview' ? result.deliveryReason || null : null)
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
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8ecae6]">Password Reset</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">Reset your password.</h1>
          <p className="mt-4 text-white/64">Enter your email address and we&apos;ll send you a reset link.</p>
        </div>

        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-12 rounded-2xl border-white/10 bg-white/8 text-black placeholder:text-white/36"
          required
        />

        {error ? <p className="rounded-2xl border border-[#ff7b54]/30 bg-[#ff7b54]/10 px-4 py-3 text-sm text-[#ffd6cc]">{error}</p> : null}
        {message ? <p className="rounded-2xl border border-[#8ecae6]/30 bg-[#8ecae6]/10 px-4 py-3 text-sm text-[#d7f2ff]">{message}</p> : null}
        {previewUrl ? (
          <p className="rounded-2xl border border-[#f4d35e]/30 bg-[#f4d35e]/10 px-4 py-3 text-sm text-[#fff2bf]">
            Development preview mode is active for password reset.
            {previewReason ? ` ${previewReason}` : ''} Use this direct link for local testing:{' '}
            <a href={previewUrl} className="font-semibold text-[#ffe082] underline underline-offset-4">
              Open reset link
            </a>
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#f4d35e] px-6 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? <BrandLoader className="h-4 w-auto" /> : null}
          Send reset link
        </button>
      </form>
    </main>
  )
}
