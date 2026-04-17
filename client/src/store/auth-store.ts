'use client'

import { create } from 'zustand'
import type { AuthSession, User } from '@/types'

const TOKEN_KEY = 'token'
const USER_KEY = 'user'

type AuthState = {
  user: User | null
  token: string | null
  hydrated: boolean
  setSession: (session: AuthSession) => void
  clearSession: () => void
  hydrate: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  hydrated: false,
  setSession: ({ user, token }) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(USER_KEY, JSON.stringify(user))
      window.localStorage.removeItem(TOKEN_KEY)
    }
    set({ user, token: token || null, hydrated: true })
  },
  clearSession: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_KEY)
      window.localStorage.removeItem(USER_KEY)
    }
    set({ user: null, token: null, hydrated: true })
  },
  hydrate: () => {
    if (typeof window === 'undefined') {
      set({ hydrated: true })
      return
    }

    const rawUser = window.localStorage.getItem(USER_KEY)
    let user: User | null = null

    if (rawUser) {
      try {
        user = JSON.parse(rawUser) as User
      } catch {
        window.localStorage.removeItem(USER_KEY)
      }
    }

    window.localStorage.removeItem(TOKEN_KEY)
    set({ token: null, user, hydrated: true })
  },
}))
