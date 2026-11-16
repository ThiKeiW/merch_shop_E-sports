import { create } from 'zustand'

import { tokenStorage } from '@/shared/auth/tokenStorage'

import type { AuthResponse, SessionUser } from './types'

type AuthState = {
  token: string | null
  user: SessionUser | null
  setSession: (session: AuthResponse) => void
  setUser: (user: SessionUser | null) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: tokenStorage.get(),
  user: null,
  setSession: ({ token, user }) => {
    tokenStorage.set(token)
    set({ token, user })
  },
  setUser: (user) => set({ user }),
  clear: () => {
    tokenStorage.clear()
    set({ token: null, user: null })
  },
}))
