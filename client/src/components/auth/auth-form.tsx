'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BrandLoader } from '@/components/brand/brand-logo'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { checkUsernameAvailability, getGoogleAuthUrl, getSpotifyAuthUrl, loginUser, registerUser, resendVerificationEmail } from '@/lib/auth-api'
import { useAuthStore } from '@/store/auth-store'

interface AuthFormProps {
  mode: 'login' | 'register'
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const setSession = useAuthStore((state) => state.setSession)
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true'
  const spotifyEnabled = process.env.NEXT_PUBLIC_SPOTIFY_AUTH_ENABLED === 'true'
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewReason, setPreviewReason] = useState<string | null>(null)
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null)
  const [usernameStatus, setUsernameStatus] = useState<{
    state: 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
    message: string
  }>({
    state: 'idle',
    message: '',
  })
  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    displayName: '',
    bio: '',
  })

  const isRegister = mode === 'register'

  useEffect(() => {
    if (!isRegister) {
      return
    }

    const candidate = form.username.trim()
    if (!candidate) {
      setUsernameStatus({ state: 'idle', message: '' })
      return
    }

    setUsernameStatus({ state: 'checking', message: 'Checking username...' })

    const timeout = window.setTimeout(async () => {
      try {
        const availability = await checkUsernameAvailability(candidate)
        if (!availability.valid) {
          setUsernameStatus({ state: 'invalid', message: availability.reason || 'Invalid username' })
          return
        }

        if (!availability.available) {
          setUsernameStatus({ state: 'taken', message: availability.reason || 'That username is already taken' })
          return
        }

        setUsernameStatus({ state: 'available', message: 'Username is available' })
      } catch {
        setUsernameStatus({ state: 'idle', message: '' })
      }
    }, 350)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [form.username, isRegister])

  function getErrorMessage(caught: any) {
    return caught?.response?.data?.error || caught?.response?.data?.error?.message || 'Something went wrong. Please try again.'
  }

  function getErrorData(caught: any) {
    return caught?.response?.data?.data || null
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    setPreviewUrl(null)
    setPreviewReason(null)
    setPendingVerificationEmail(null)

    try {
      if (isRegister) {
        if (usernameStatus.state === 'checking') {
          setError('Please wait while we check that username.')
          return
        }

        if (usernameStatus.state === 'taken' || usernameStatus.state === 'invalid') {
          setError(usernameStatus.message || 'Please choose a different username.')
          return
        }

        const result = await registerUser({
          email: form.email,
          username: form.username,
          password: form.password,
          displayName: form.displayName || undefined,
          bio: form.bio || undefined,
        })

        setMessage('Account created. Verify your email before signing in.')
        setPreviewUrl(result.previewUrl)
        setPreviewReason(result.deliveryMode === 'preview' ? result.deliveryReason || null : null)
        setPendingVerificationEmail(result.email)
        return
      }

      const session = await loginUser({
            email: form.email,
            password: form.password,
          })

      setSession(session)
      router.push('/profile')
      router.refresh()
    } catch (caught: any) {
      setError(getErrorMessage(caught))
      const data = getErrorData(caught)
      if (data?.requiresEmailVerification && data?.email) {
        setPendingVerificationEmail(data.email)
        setPreviewUrl(data.previewUrl || null)
        setPreviewReason(data.deliveryMode === 'preview' ? data.deliveryReason || null : null)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleResendVerification() {
    if (!pendingVerificationEmail) {
      return
    }

    setResending(true)
    setError(null)
    setPreviewReason(null)

    try {
      const result = await resendVerificationEmail(pendingVerificationEmail)
      setMessage('Verification email sent. Check your inbox for the next step.')
      setPreviewUrl(result.previewUrl)
      setPreviewReason(result.deliveryMode === 'preview' ? result.deliveryReason || null : null)
    } catch (caught: any) {
      setError(getErrorMessage(caught))
    } finally {
      setResending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f4d35e]">
          {isRegister ? 'Create Account' : 'Welcome Back'}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
          {isRegister ? 'Claim your corner of the catalog.' : 'Sign in and pick up where you left off.'}
        </h1>
        <p className="mt-4 text-white/64">
          {isRegister
            ? 'Create a profile, track your listening, and start building likes, curated favorites, lists, and reviews.'
            : 'Use your account to access your profile, diary, ratings, and listening history.'}
        </p>
      </div>

      {googleEnabled || spotifyEnabled ? (
        <div className="grid gap-3">
          {googleEnabled ? (
            <a
              href={getGoogleAuthUrl()}
              className="inline-flex h-12 w-full items-center justify-center rounded-full border border-white/14 bg-white/[0.04] px-6 text-sm font-semibold text-white transition hover:border-white/22 hover:bg-white/[0.08]"
            >
              Continue with Google
            </a>
          ) : null}
          {spotifyEnabled ? (
            <a
              href={getSpotifyAuthUrl()}
              className="inline-flex h-12 w-full items-center justify-center rounded-full border border-[#1db954]/24 bg-[#1db954]/12 px-6 text-sm font-semibold text-[#d8ffe6] transition hover:border-[#1db954]/38 hover:bg-[#1db954]/18"
            >
              Continue with Spotify
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-3">
        <Input
          type={isRegister ? 'email' : 'text'}
          placeholder={isRegister ? 'Email' : 'Email or username'}
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          className="h-12 rounded-2xl border-white/10 bg-white/8 text-black placeholder:text-white/36"
          required
        />
        {isRegister ? (
          <>
            <Input
            placeholder="Username"
            value={form.username}
            onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
            className="h-12 rounded-2xl border-white/10 bg-white/8 text-black placeholder:text-white/36"
            required
            />
            {usernameStatus.state !== 'idle' ? (
              <p
                className={
                  usernameStatus.state === 'available'
                    ? 'px-1 text-xs text-[#74e6b2]'
                    : usernameStatus.state === 'checking'
                      ? 'px-1 text-xs text-white/60'
                      : 'px-1 text-xs text-[#ffb4a0]'
                }
              >
                {usernameStatus.message}
              </p>
            ) : null}
          </>
        ) : null}
        {isRegister ? (
          <Input
            placeholder="Display name"
            value={form.displayName}
            onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
            className="h-12 rounded-2xl border-white/10 bg-white/8 text-black placeholder:text-white/36"
          />
        ) : null}
        <PasswordInput
          placeholder="Password"
          value={form.password}
          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          className="h-12 rounded-2xl border-white/10 bg-white/8 text-black placeholder:text-white/36"
          required
        />
        {isRegister ? (
          <textarea
            placeholder="Short bio (optional)"
            value={form.bio}
            onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
            className="min-h-[120px] w-full rounded-[1.25rem] border border-white/10 bg-white/8 px-4 py-3 text-sm text-black placeholder:text-white/36 outline-none transition focus:border-white/20"
          />
        ) : null}
      </div>

      {error ? <p className="rounded-2xl border border-[#ff7b54]/30 bg-[#ff7b54]/10 px-4 py-3 text-sm text-[#ffd6cc]">{error}</p> : null}
      {message ? <p className="rounded-2xl border border-[#8ecae6]/30 bg-[#8ecae6]/10 px-4 py-3 text-sm text-[#d7f2ff]">{message}</p> : null}
      {previewUrl ? (
        <p className="rounded-2xl border border-[#f4d35e]/30 bg-[#f4d35e]/10 px-4 py-3 text-sm text-[#fff2bf]">
          Development preview mode is active for this email flow.
          {previewReason ? ` ${previewReason}` : ''} Use this direct link for local testing:{' '}
          <a href={previewUrl} className="font-semibold text-[#ffe082] underline underline-offset-4">
            Open link
          </a>
        </p>
      ) : null}
      {pendingVerificationEmail ? (
        <button
          type="button"
          onClick={handleResendVerification}
          disabled={resending}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-6 text-sm font-semibold text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {resending ? <BrandLoader className="h-4 w-auto" /> : null}
          Resend verification email
        </button>
      ) : null}

      <button
        type="submit"
        disabled={loading || (isRegister && usernameStatus.state === 'checking')}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#f4d35e] px-6 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? <BrandLoader className="h-4 w-auto" /> : null}
        {isRegister ? 'Create account' : 'Sign in'}
      </button>

      <p className="text-sm text-white/56">
        {isRegister ? 'Already have an account?' : 'Need an account?'}{' '}
        <Link href={isRegister ? '/auth/login' : '/auth/register'} className="text-[#f4d35e] transition hover:text-[#ffe082]">
          {isRegister ? 'Sign in' : 'Register'}
        </Link>
      </p>

      {!isRegister ? (
        <p className="text-sm text-white/56">
          Forgot your password?{' '}
          <Link href="/auth/forgot-password" className="text-[#8ecae6] transition hover:text-[#d0effa]">
            Reset it here
          </Link>
        </p>
      ) : null}
    </form>
  )
}
