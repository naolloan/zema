'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, UploadCloud } from 'lucide-react'
import { BrandLoader } from '@/components/brand/brand-logo'
import { PasswordInput } from '@/components/ui/password-input'
import type { Profile, User } from '@/types'
import { changePassword, checkUsernameAvailability, deleteMyAccount, updateMyProfile, uploadMyAvatar } from '@/lib/auth-api'
import { useAuthStore } from '@/store/auth-store'

interface ProfileEditorProps {
  profile: Profile
  onProfileChange: (profile: Profile) => void
}

const MAX_FILE_SIZE = 5 * 1024 * 1024
const OUTPUT_SIZE = 512

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Unable to process that image.'))
    image.src = src
  })
}

async function buildCroppedAvatar(src: string, zoom: number) {
  const image = await loadImage(src)
  const cropBase = Math.min(image.naturalWidth, image.naturalHeight)
  const cropSize = cropBase / zoom
  const sx = (image.naturalWidth - cropSize) / 2
  const sy = (image.naturalHeight - cropSize) / 2

  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Unable to prepare your image right now.')
  }

  context.drawImage(image, sx, sy, cropSize, cropSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
  return canvas.toDataURL('image/jpeg', 0.9)
}

export function ProfileEditor({ profile, onProfileChange }: ProfileEditorProps) {
  const router = useRouter()
  const setSession = useAuthStore((state) => state.setSession)
  const clearSession = useAuthStore((state) => state.clearSession)
  const token = useAuthStore((state) => state.token)
  const currentUser = useAuthStore((state) => state.user)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [form, setForm] = useState({
    username: profile.username || '',
    displayName: profile.displayName || '',
    bio: profile.bio || '',
    avatarUrl: profile.avatarUrl || '',
    commentPermission: profile.commentPermission || 'FOLLOWING',
  })
  const [avatarSource, setAvatarSource] = useState<'url' | 'upload'>(profile.avatarUrl?.includes('/uploads/avatars/') ? 'upload' : 'url')
  const [avatarPreview, setAvatarPreview] = useState(profile.avatarUrl || '')
  const [uploadSource, setUploadSource] = useState<string | null>(null)
  const [uploadZoom, setUploadZoom] = useState(1)
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [deleteForm, setDeleteForm] = useState({
    currentPassword: '',
    confirmation: '',
  })
  const [usernameStatus, setUsernameStatus] = useState<{
    state: 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
    message: string
  }>({
    state: 'idle',
    message: '',
  })

  useEffect(() => {
    setForm({
      username: profile.username || '',
      displayName: profile.displayName || '',
      bio: profile.bio || '',
      avatarUrl: profile.avatarUrl || '',
      commentPermission: profile.commentPermission || 'FOLLOWING',
    })
    setAvatarPreview(profile.avatarUrl || '')
    setAvatarSource(profile.avatarUrl?.includes('/uploads/avatars/') ? 'upload' : 'url')
    setUploadSource(null)
    setUploadZoom(1)
  }, [profile])

  useEffect(() => {
    const candidate = form.username.trim()
    const currentUsername = (profile.username || '').trim()

    if (!candidate) {
      setUsernameStatus({ state: 'idle', message: '' })
      return
    }

    if (candidate.localeCompare(currentUsername, undefined, { sensitivity: 'accent' }) === 0) {
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
  }, [form.username, profile.username])

  useEffect(() => {
    if (!uploadSource) {
      return
    }

    let cancelled = false

    buildCroppedAvatar(uploadSource, uploadZoom)
      .then((dataUrl) => {
        if (!cancelled) {
          setAvatarPreview(dataUrl)
        }
      })
      .catch((caught: any) => {
        if (!cancelled) {
          setError(caught?.message || 'Unable to prepare that image.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [uploadSource, uploadZoom])

  useEffect(() => {
    return () => {
      if (uploadSource?.startsWith('blob:')) {
        URL.revokeObjectURL(uploadSource)
      }
    }
  }, [uploadSource])

  function resetMessages() {
    setError(null)
    setMessage(null)
  }

  function handleAvatarModeChange(nextMode: 'url' | 'upload') {
    setAvatarSource(nextMode)
    resetMessages()

    if (nextMode === 'url') {
      if (uploadSource?.startsWith('blob:')) {
        URL.revokeObjectURL(uploadSource)
      }
      setUploadSource(null)
      setUploadZoom(1)
      setAvatarPreview(form.avatarUrl)
      return
    }

    if (!uploadSource) {
      setAvatarPreview(form.avatarUrl)
    }
  }

  function handleAvatarUrlChange(value: string) {
    setForm((current) => ({ ...current, avatarUrl: value }))
    setAvatarPreview(value)
  }

  function validateFile(file: File) {
    if (!file.type.startsWith('image/')) {
      throw new Error('Please choose an image file.')
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error('Please choose an image smaller than 5MB.')
    }
  }

  function handleSelectedFile(file: File) {
    validateFile(file)
    resetMessages()
    setAvatarSource('upload')
    setForm((current) => ({ ...current, avatarUrl: '' }))

    if (uploadSource?.startsWith('blob:')) {
      URL.revokeObjectURL(uploadSource)
    }

    const objectUrl = URL.createObjectURL(file)
    setUploadSource(objectUrl)
    setUploadZoom(1)
    setAvatarPreview(objectUrl)
  }

  function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      handleSelectedFile(file)
    } catch (caught: any) {
      setError(caught?.message || 'Unable to use that image right now.')
    } finally {
      event.target.value = ''
    }
  }

  function handleDrop(event: React.DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    setDragActive(false)

    const file = event.dataTransfer.files?.[0]
    if (!file) return

    try {
      handleSelectedFile(file)
    } catch (caught: any) {
      setError(caught?.message || 'Unable to use that image right now.')
    }
  }

  function clearAvatar() {
    resetMessages()
    setForm((current) => ({ ...current, avatarUrl: '' }))
    setAvatarPreview('')

    if (uploadSource?.startsWith('blob:')) {
      URL.revokeObjectURL(uploadSource)
    }

    setUploadSource(null)
    setUploadZoom(1)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function handlePasswordFieldKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      handlePasswordSubmit()
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    resetMessages()

    try {
      if (usernameStatus.state === 'checking') {
        setError('Please wait while we check that username.')
        return
      }

      if (usernameStatus.state === 'taken' || usernameStatus.state === 'invalid') {
        setError(usernameStatus.message || 'Please choose a different username.')
        return
      }

      let nextAvatarUrl = form.avatarUrl.trim()

      if (avatarSource === 'upload' && uploadSource) {
        const croppedDataUrl = await buildCroppedAvatar(uploadSource, uploadZoom)
        const uploadResult = await uploadMyAvatar(croppedDataUrl)
        nextAvatarUrl = uploadResult.avatarUrl
      }

      const updatedUser = await updateMyProfile({
        username: form.username || undefined,
        displayName: form.displayName || undefined,
        bio: form.bio || undefined,
        avatarUrl: nextAvatarUrl || undefined,
        commentPermission: form.commentPermission,
      })

      const nextProfile: Profile = {
        ...profile,
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        displayName: updatedUser.displayName,
        bio: updatedUser.bio,
        avatarUrl: updatedUser.avatarUrl,
        commentPermission: updatedUser.commentPermission,
        createdAt: updatedUser.createdAt,
      }

      setForm({
        username: updatedUser.username || '',
        displayName: updatedUser.displayName || '',
        bio: updatedUser.bio || '',
        avatarUrl: updatedUser.avatarUrl || '',
        commentPermission: updatedUser.commentPermission || 'FOLLOWING',
      })
      setAvatarPreview(updatedUser.avatarUrl || '')
      setUploadSource(null)
      setUploadZoom(1)

      onProfileChange(nextProfile)
      if (token) {
        setSession({ user: { ...currentUser, ...updatedUser } as User, token })
      }
      setMessage('Profile updated.')
    } catch (caught: any) {
      setError(caught?.response?.data?.error || caught?.message || 'Unable to update your profile right now.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePasswordSubmit() {
    setPasswordLoading(true)
    resetMessages()

    try {
      await changePassword(passwordForm)
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setMessage('Password updated.')
    } catch (caught: any) {
      setError(caught?.response?.data?.error || caught?.message || 'Unable to update your password right now.')
    } finally {
      setPasswordLoading(false)
    }
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true)
    resetMessages()

    try {
      if (deleteForm.confirmation.trim().toUpperCase() !== 'DELETE') {
        setError('Type DELETE to confirm account deletion.')
        return
      }

      const confirmed = window.confirm('This action permanently deletes your account. Continue?')
      if (!confirmed) {
        return
      }

      await deleteMyAccount({
        confirmation: deleteForm.confirmation,
        currentPassword: deleteForm.currentPassword || undefined,
      })

      clearSession()
      router.replace('/')
      router.refresh()
    } catch (caught: any) {
      setError(caught?.response?.data?.error || caught?.message || 'Unable to delete your account right now.')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f4d35e]">Edit Profile</p>
        <h3 className="mt-2 text-2xl font-semibold text-white">Tune how you show up</h3>
      </div>

      <input
        value={form.username}
        onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
        placeholder="Username"
        className="h-11 w-full rounded-2xl border border-white/10 bg-white/8 px-4 text-sm text-black placeholder:text-black/36 outline-none"
      />
      <p className="-mt-1 px-1 text-xs text-white/55">Unique handle used in profile links and sign in. Letters, numbers, `.`, `_`, and `-`.</p>
      {usernameStatus.state !== 'idle' ? (
        <p
          className={
            usernameStatus.state === 'available'
              ? '-mt-1 px-1 text-xs text-[#74e6b2]'
              : usernameStatus.state === 'checking'
                ? '-mt-1 px-1 text-xs text-white/60'
                : '-mt-1 px-1 text-xs text-[#ffb4a0]'
          }
        >
          {usernameStatus.message}
        </p>
      ) : null}

      <input
        value={form.displayName}
        onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
        placeholder="Display name"
        className="h-11 w-full rounded-2xl border border-white/10 bg-white/8 px-4 text-sm text-black placeholder:text-black/36 outline-none"
      />

      <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
        <p className="text-sm font-semibold text-white">Who can comment on your reviews and lists?</p>
        <select
          value={form.commentPermission}
          onChange={(event) => setForm((current) => ({ ...current, commentPermission: event.target.value as 'ANYONE' | 'FOLLOWING' | 'SELF' }))}
          className="mt-3 h-11 w-full rounded-2xl border border-white/10 bg-white/8 px-4 text-sm text-black outline-none"
        >
          <option value="ANYONE">Anyone</option>
          <option value="FOLLOWING">People you follow</option>
          <option value="SELF">Just you</option>
        </select>
      </div>

      <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Profile picture</p>
            <p className="mt-1 text-xs text-white/55">Upload from your gallery, drag and drop, crop with zoom, or paste an image URL.</p>
          </div>
          <div className="inline-flex rounded-full border border-white/10 bg-[#111318]/70 p-1">
            <button
              type="button"
              onClick={() => handleAvatarModeChange('upload')}
              className={avatarSource === 'upload' ? 'rounded-full bg-[#f4d35e] px-4 py-2 text-xs font-semibold text-[#111318]' : 'rounded-full px-4 py-2 text-xs font-semibold text-white/70'}
            >
              Upload
            </button>
            <button
              type="button"
              onClick={() => handleAvatarModeChange('url')}
              className={avatarSource === 'url' ? 'rounded-full bg-[#f4d35e] px-4 py-2 text-xs font-semibold text-[#111318]' : 'rounded-full px-4 py-2 text-xs font-semibold text-white/70'}
            >
              URL
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/12 bg-white/[0.04]">
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarPreview}
                alt="Avatar preview"
                className="h-full w-full object-cover"
                style={avatarSource === 'upload' && uploadSource ? { transform: `scale(${uploadZoom})` } : undefined}
              />
            ) : (
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Preview</span>
            )}
          </div>

          <div className="flex-1 space-y-3">
            {avatarSource === 'upload' ? (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setDragActive(true)
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  className={`flex min-h-[9rem] w-full flex-col items-center justify-center rounded-[1.25rem] border border-dashed px-5 py-6 text-center transition ${dragActive ? 'border-[#8ecae6] bg-[#8ecae6]/10' : 'border-white/14 bg-white/[0.03] hover:border-white/24 hover:bg-white/[0.05]'}`}
                >
                  <UploadCloud className="h-6 w-6 text-[#8ecae6]" />
                  <p className="mt-3 text-sm font-semibold text-white">Drag and drop an image here</p>
                  <p className="mt-2 text-xs leading-6 text-white/55">or click to choose from your gallery. JPG, PNG, WebP, or GIF up to 5MB.</p>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {uploadSource ? (
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                      Crop Zoom
                    </span>
                    <input
                      type="range"
                      min="1"
                      max="2.4"
                      step="0.05"
                      value={uploadZoom}
                      onChange={(event) => setUploadZoom(Number(event.target.value))}
                      className="w-full accent-[#f4d35e]"
                    />
                  </label>
                ) : null}
              </>
            ) : (
              <div className="space-y-3">
                <input
                  value={form.avatarUrl}
                  onChange={(event) => handleAvatarUrlChange(event.target.value)}
                  placeholder="https://example.com/your-photo.jpg"
                  className="h-11 w-full rounded-2xl border border-white/10 bg-white/8 px-4 text-sm text-black placeholder:text-black/36 outline-none"
                />
                <p className="text-xs leading-6 text-white/55">Paste a direct image URL if you prefer not to upload a file.</p>
              </div>
            )}

            {avatarPreview ? (
              <button
                type="button"
                onClick={clearAvatar}
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/60 transition hover:text-white"
              >
                <ImagePlus className="h-3.5 w-3.5" />
                Remove picture
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <textarea
        value={form.bio}
        onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
        placeholder="Write a short bio"
        className="min-h-[120px] w-full rounded-[1.25rem] border border-white/10 bg-white/8 px-4 py-3 text-sm text-black placeholder:text-black/36 outline-none"
      />

      <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
        <div>
          <p className="text-sm font-semibold text-white">Change password</p>
          <p className="mt-1 text-xs text-white/55">Enter your current password, then choose and confirm a new one. If you signed up with Google and never set a password, use the forgot-password flow first.</p>
        </div>
        <div className="mt-4 space-y-3">
          <PasswordInput
            value={passwordForm.currentPassword}
            onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
            onKeyDown={handlePasswordFieldKeyDown}
            placeholder="Current password"
            className="h-11 w-full rounded-2xl border border-white/10 bg-white/8 px-4 text-sm text-black placeholder:text-black/36 outline-none"
          />
          <PasswordInput
            value={passwordForm.newPassword}
            onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
            onKeyDown={handlePasswordFieldKeyDown}
            placeholder="New password"
            className="h-11 w-full rounded-2xl border border-white/10 bg-white/8 px-4 text-sm text-black placeholder:text-black/36 outline-none"
          />
          <PasswordInput
            value={passwordForm.confirmPassword}
            onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
            onKeyDown={handlePasswordFieldKeyDown}
            placeholder="Confirm new password"
            className="h-11 w-full rounded-2xl border border-white/10 bg-white/8 px-4 text-sm text-black placeholder:text-black/36 outline-none"
          />
          <button
            type="button"
            onClick={handlePasswordSubmit}
            disabled={passwordLoading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#8ecae6]/28 bg-[#8ecae6]/12 px-5 text-sm font-semibold text-[#d8f2ff] transition hover:bg-[#8ecae6]/18 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {passwordLoading ? <BrandLoader className="h-4 w-auto" /> : null}
            Update password
          </button>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-[#ff7b54]/25 bg-[#ff7b54]/8 p-4">
        <div>
          <p className="text-sm font-semibold text-[#ffd9cd]">Delete account</p>
          <p className="mt-1 text-xs text-[#ffd9cd]/72">
            This permanently deletes your account and related private data. Public content tied to your account may also be removed.
          </p>
          <p className="mt-2 text-xs text-[#ffd9cd]/72">
            Enter your current password if you use email/password sign in. For Google-created accounts, password can be left blank.
          </p>
        </div>
        <div className="mt-4 space-y-3">
          <PasswordInput
            value={deleteForm.currentPassword}
            onChange={(event) => setDeleteForm((current) => ({ ...current, currentPassword: event.target.value }))}
            placeholder="Current password (if applicable)"
            className="h-11 w-full rounded-2xl border border-white/14 bg-white/8 px-4 text-sm text-black placeholder:text-black/36 outline-none"
          />
          <input
            value={deleteForm.confirmation}
            onChange={(event) => setDeleteForm((current) => ({ ...current, confirmation: event.target.value }))}
            placeholder='Type "DELETE" to confirm'
            className="h-11 w-full rounded-2xl border border-white/14 bg-white/8 px-4 text-sm text-black placeholder:text-black/36 outline-none"
          />
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={deleteLoading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#ff7b54]/35 bg-[#ff7b54]/16 px-5 text-sm font-semibold text-[#ffd9cd] transition hover:bg-[#ff7b54]/24 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {deleteLoading ? <BrandLoader className="h-4 w-auto" /> : null}
            Delete account
          </button>
        </div>
      </div>

      {error ? <p className="rounded-2xl border border-[#ff7b54]/30 bg-[#ff7b54]/10 px-4 py-3 text-sm text-[#ffd6cc]">{error}</p> : null}
      {message ? <p className="rounded-2xl border border-[#2a9d8f]/30 bg-[#2a9d8f]/10 px-4 py-3 text-sm text-[#d1fff3]">{message}</p> : null}

      <button
        type="submit"
        disabled={loading || usernameStatus.state === 'checking'}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#f4d35e] px-5 text-sm font-semibold text-[#111318] transition hover:bg-[#ffe082] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? <BrandLoader className="h-4 w-auto" /> : null}
        Save changes
      </button>
    </form>
  )
}
