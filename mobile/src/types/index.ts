export * from '../../../shared/types'

export interface MobileApiEnvelope<T> {
  success: boolean
  data: T
  error?: string
  message?: string
}

export interface AuthUser {
  id: string
  email?: string
  username: string
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
  emailVerifiedAt?: string | null
}

export interface Session {
  token: string
  user: AuthUser
}

export interface RegistrationResult {
  requiresEmailVerification: true
  email: string
  previewUrl: string | null
  deliveryMode?: 'email' | 'preview'
  deliveryReason?: string | null
}

export interface PasswordResetRequestResult {
  previewUrl: string | null
  deliveryMode?: 'email' | 'preview'
  deliveryReason?: string | null
}

export interface MobileNavItem {
  label: string
  href: string
}
