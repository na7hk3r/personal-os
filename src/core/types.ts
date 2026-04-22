import type { ComponentType } from 'react'

// ─── Event System ───

export type EventHandler = (payload: unknown) => void
export type UnsubscribeFn = () => void

export interface EventLogEntry {
  id: number
  event_type: string
  source: string
  payload: string
  created_at: string
}

// ─── Storage ───

export interface QueryOptions {
  where?: Record<string, unknown>
  orderBy?: string
  limit?: number
}

export interface Migration {
  version: number
  up: string
}

export interface StorageBridge {
  query: (sql: string, params?: unknown[]) => Promise<unknown[]>
  execute: (sql: string, params?: unknown[]) => Promise<{ changes: number; lastInsertRowid: number }>
  migrate: (pluginId: string, migrations: Migration[]) => Promise<void>
}

export interface AuthUser {
  id: string
  username: string
  createdAt: string
  lastLoginAt: string | null
}

export interface RegisterPayload {
  username: string
  password: string
  recoveryQuestion: string
  recoveryAnswer: string
}

export interface ResetPasswordWithRecoveryPayload {
  username: string
  recoveryAnswer: string
  newPassword: string
}

export interface AuthBridge {
  register: (payload: RegisterPayload) => Promise<AuthUser>
  login: (username: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  me: () => Promise<AuthUser | null>
  getRecoveryQuestion: (username: string) => Promise<string | null>
  resetPasswordWithRecovery: (payload: ResetPasswordWithRecoveryPayload) => Promise<void>
}

// ─── UI Registration ───

export interface WidgetDefinition {
  id: string
  pluginId: string
  title: string
  component: ComponentType
  defaultSize?: { w: number; h: number }
}

export interface PageDefinition {
  id: string
  pluginId: string
  path: string
  title: string
  icon: string
  component: ComponentType
}

export interface NavItemDefinition {
  id: string
  pluginId: string
  label: string
  icon: string
  path: string
  order?: number
  parentId?: string
}

// ─── User Profile ───

export interface UserProfile {
  name: string
  height: number
  age: number
  startDate: string
  weightGoal: number
}

// ─── Core API (injected into plugins) ───

export interface CoreAPI {
  storage: StorageBridge
  events: {
    emit(event: string, payload?: unknown): void
    on(event: string, handler: EventHandler): UnsubscribeFn
    off(event: string, handler: EventHandler): void
  }
  ui: {
    registerWidget(widget: WidgetDefinition): void
    registerPage(page: PageDefinition): void
    registerNavItem(item: NavItemDefinition): void
  }
  getProfile(): UserProfile
  gamification: {
    addPoints(amount: number, reason: string): void
    checkAchievement(achievementId: string): void
  }
}

// ─── Plugin Manifest ───

export interface OnboardingQuestion {
  id: string
  text: string
  type: 'text' | 'number' | 'select'
  options?: string[]
}

export interface PluginManifest {
  id: string
  name: string
  version: string
  description: string
  icon: string

  // Lifecycle
  init(api: CoreAPI): Promise<void>
  activate?(): void
  deactivate?(): void

  // UI
  widgets?: WidgetDefinition[]
  pages?: PageDefinition[]
  navItems?: NavItemDefinition[]

  // Events
  events?: {
    emits: string[]
    listens: string[]
  }

  // Onboarding
  onboarding?: {
    questions: OnboardingQuestion[]
    onComplete: (answers: Record<string, unknown>) => void
  }

  // Storage
  collections?: string[]
  migrations?: Migration[]
}

// ─── Plugin State ───

export type PluginStatus = 'registered' | 'initializing' | 'active' | 'inactive' | 'error'

export interface PluginEntry {
  manifest: PluginManifest
  status: PluginStatus
  error?: string
}
