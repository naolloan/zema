export * from '../../../shared/types'

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

export interface MobileNavItem {
  label: string
  href: string
}
