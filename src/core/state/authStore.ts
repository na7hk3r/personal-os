import { create } from 'zustand'
import type { AuthUser, RegisterPayload, ResetPasswordWithRecoveryPayload } from '@core/types'

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated'

interface AuthState {
  status: AuthStatus
  currentUser: AuthUser | null
  loading: boolean
  error: string | null
  initializeSession: () => Promise<void>
  login: (username: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
  getRecoveryQuestion: (username: string) => Promise<string | null>
  resetPasswordWithRecovery: (payload: ResetPasswordWithRecoveryPayload) => Promise<void>
}

function toReadableError(error: unknown): string {
  if (error instanceof Error) {
    return error.message.replace(/^Auth IPC failed:\s*/i, '').trim()
  }
  return 'Ocurrio un error inesperado.'
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'checking',
  currentUser: null,
  loading: false,
  error: null,

  initializeSession: async () => {
    if (!window.auth) {
      set({ status: 'unauthenticated', currentUser: null })
      return
    }

    set({ loading: true, error: null })
    try {
      const user = await window.auth.me()
      set({
        status: user ? 'authenticated' : 'unauthenticated',
        currentUser: user,
        loading: false,
      })
    } catch (error) {
      set({
        status: 'unauthenticated',
        currentUser: null,
        error: toReadableError(error),
        loading: false,
      })
    }
  },

  login: async (username, password) => {
    set({ loading: true, error: null })
    try {
      const user = await window.auth.login(username, password)
      set({ status: 'authenticated', currentUser: user, loading: false })
    } catch (error) {
      set({ error: toReadableError(error), loading: false })
      throw error
    }
  },

  register: async (payload) => {
    set({ loading: true, error: null })
    try {
      const user = await window.auth.register(payload)
      set({ status: 'authenticated', currentUser: user, loading: false })
    } catch (error) {
      set({ error: toReadableError(error), loading: false })
      throw error
    }
  },

  logout: async () => {
    try {
      await window.auth.logout()
    } finally {
      set({ status: 'unauthenticated', currentUser: null, loading: false, error: null })
      window.location.reload()
    }
  },

  clearError: () => set({ error: null }),

  getRecoveryQuestion: async (username) => {
    try {
      return await window.auth.getRecoveryQuestion(username)
    } catch {
      return null
    }
  },

  resetPasswordWithRecovery: async (payload) => {
    set({ loading: true, error: null })
    try {
      await window.auth.resetPasswordWithRecovery(payload)
      set({ loading: false })
    } catch (error) {
      set({ error: toReadableError(error), loading: false })
      throw error
    }
  },
}))
