import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import type { Session } from '@/types'
import { setApiToken } from '@/lib/api'

const SESSION_KEY = 'zema-mobile-session'

interface AuthState {
  hydrated: boolean
  token: string | null
  user: Session['user'] | null
  hydrate: () => Promise<void>
  setSession: (session: Session) => Promise<void>
  clearSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  hydrated: false,
  token: null,
  user: null,
  hydrate: async () => {
    const raw = await SecureStore.getItemAsync(SESSION_KEY)

    if (!raw) {
      set({ hydrated: true, token: null, user: null })
      return
    }

    try {
      const session = JSON.parse(raw) as Session
      setApiToken(session.token)
      set({ hydrated: true, token: session.token, user: session.user })
    } catch {
      await SecureStore.deleteItemAsync(SESSION_KEY)
      set({ hydrated: true, token: null, user: null })
    }
  },
  setSession: async (session) => {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session))
    setApiToken(session.token)
    set({ token: session.token, user: session.user })
  },
  clearSession: async () => {
    await SecureStore.deleteItemAsync(SESSION_KEY)
    setApiToken(null)
    set({ token: null, user: null })
  },
}))
