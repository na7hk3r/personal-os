import { create } from 'zustand'
import type { UserProfile } from '../types'

interface CoreState {
  // Profile
  profile: UserProfile
  updateProfile: (updates: Partial<UserProfile>) => void

  // Settings
  settings: {
    theme: 'dark' | 'light'
    sidebarCollapsed: boolean
  }
  updateSettings: (updates: Partial<CoreState['settings']>) => void

  // Plugins
  activePlugins: string[]
  togglePlugin: (pluginId: string) => void
  setActivePlugins: (ids: string[]) => void

  // Onboarding
  onboardingComplete: boolean
  completeOnboarding: () => void
}

export const useCoreStore = create<CoreState>((set) => ({
  profile: {
    name: '',
    height: 0,
    age: 0,
    startDate: '',
    weightGoal: 0,
  },
  updateProfile: (updates) =>
    set((state) => ({
      profile: { ...state.profile, ...updates },
    })),

  settings: {
    theme: 'dark',
    sidebarCollapsed: false,
  },
  updateSettings: (updates) =>
    set((state) => ({
      settings: { ...state.settings, ...updates },
    })),

  activePlugins: [],
  togglePlugin: (pluginId) =>
    set((state) => {
      const isActive = state.activePlugins.includes(pluginId)
      return {
        activePlugins: isActive
          ? state.activePlugins.filter((id) => id !== pluginId)
          : [...state.activePlugins, pluginId],
      }
    }),
  setActivePlugins: (ids) => set({ activePlugins: ids }),

  onboardingComplete: false,
  completeOnboarding: () => set({ onboardingComplete: true }),
}))
