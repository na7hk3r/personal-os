import { create } from 'zustand'
import { eventBus } from '@core/events/EventBus'
import { GAMIFICATION_EVENTS } from '@core/events/events'

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  condition: (stats: GamificationStats) => boolean
  unlockedAt?: string
}

export interface GamificationStats {
  totalPoints: number
  dailyStreak: number
  totalEntries: number
  totalWorkouts: number
  tasksCompleted: number
}

interface GamificationState {
  points: number
  level: number
  streak: number
  history: { amount: number; reason: string; date: string }[]
  achievements: Achievement[]
  unlockedIds: string[]

  addPoints: (amount: number, reason: string) => void
  setStreak: (n: number) => void
  unlockAchievement: (id: string) => void
  checkAchievements: (stats: GamificationStats) => void
  loadFromStorage: () => Promise<void>
}

interface PersistedGamificationState {
  points: number
  level: number
  streak: number
  history: { amount: number; reason: string; date: string }[]
  unlockedIds: string[]
}

const POINTS_PER_LEVEL = 100

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-entry',
    title: 'Primer registro',
    description: 'Registraste tu primer día',
    icon: 'Star',
    condition: (s) => s.totalEntries >= 1,
  },
  {
    id: 'week-streak',
    title: 'Racha semanal',
    description: '7 días seguidos registrando',
    icon: 'Flame',
    condition: (s) => s.dailyStreak >= 7,
  },
  {
    id: 'month-streak',
    title: 'Racha mensual',
    description: '30 días seguidos registrando',
    icon: 'Gem',
    condition: (s) => s.dailyStreak >= 30,
  },
  {
    id: 'centurion',
    title: 'Centurión',
    description: 'Acumula 100 puntos',
    icon: 'Target',
    condition: (s) => s.totalPoints >= 100,
  },
  {
    id: 'workout-10',
    title: 'Deportista',
    description: 'Completa 10 entrenamientos',
    icon: 'PersonStanding',
    condition: (s) => s.totalWorkouts >= 10,
  },
  {
    id: 'tasks-25',
    title: 'Productivo',
    description: 'Completa 25 tareas',
    icon: 'CheckCircle2',
    condition: (s) => s.tasksCompleted >= 25,
  },
]

const SETTINGS_KEY = 'gamificationState'

function getPersistableState(state: Pick<GamificationState, 'points' | 'level' | 'streak' | 'history' | 'unlockedIds'>): PersistedGamificationState {
  return {
    points: state.points,
    level: state.level,
    streak: state.streak,
    history: state.history.slice(0, 50),
    unlockedIds: state.unlockedIds,
  }
}

function persistState(state: Pick<GamificationState, 'points' | 'level' | 'streak' | 'history' | 'unlockedIds'>): void {
  if (!window.storage) return
  const payload = JSON.stringify(getPersistableState(state))
  void window.storage.execute(
    `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
    [SETTINGS_KEY, payload],
  )
}

export const useGamificationStore = create<GamificationState>((set, get) => ({
  points: 0,
  level: 1,
  streak: 0,
  history: [],
  achievements: DEFAULT_ACHIEVEMENTS,
  unlockedIds: [],

  addPoints: (amount, reason) => {
    set((s) => {
      const newPoints = s.points + amount
      const newLevel = Math.floor(newPoints / POINTS_PER_LEVEL) + 1
      const levelUp = newLevel > s.level

      if (levelUp) {
        eventBus.emit(GAMIFICATION_EVENTS.LEVEL_UP, { level: newLevel })
      }

      eventBus.emit(GAMIFICATION_EVENTS.POINTS_ADDED, { amount, reason, total: newPoints })

      const nextState = {
        points: newPoints,
        level: newLevel,
        history: [
          { amount, reason, date: new Date().toISOString() },
          ...s.history.slice(0, 49),
        ],
      }

      persistState({
        points: nextState.points,
        level: nextState.level,
        streak: s.streak,
        history: nextState.history,
        unlockedIds: s.unlockedIds,
      })

      return nextState
    })
  },

  setStreak: (n) =>
    set((s) => {
      persistState({
        points: s.points,
        level: s.level,
        streak: n,
        history: s.history,
        unlockedIds: s.unlockedIds,
      })
      return { streak: n }
    }),

  unlockAchievement: (id) => {
    const s = get()
    if (s.unlockedIds.includes(id)) return
    const ach = s.achievements.find((a) => a.id === id)
    if (!ach) return

    const unlockedIds = [...s.unlockedIds, id]
    set({ unlockedIds })

    persistState({
      points: s.points,
      level: s.level,
      streak: s.streak,
      history: s.history,
      unlockedIds,
    })

    eventBus.emit(GAMIFICATION_EVENTS.ACHIEVEMENT_UNLOCKED, {
      id,
      title: ach.title,
    })
  },

  checkAchievements: (stats) => {
    const s = get()
    for (const ach of s.achievements) {
      if (!s.unlockedIds.includes(ach.id) && ach.condition(stats)) {
        get().unlockAchievement(ach.id)
      }
    }
  },

  loadFromStorage: async () => {
    if (!window.storage) return

    try {
      const rows = (await window.storage.query(
        `SELECT value FROM settings WHERE key = ? LIMIT 1`,
        [SETTINGS_KEY],
      )) as { value: string }[]

      const raw = rows[0]?.value
      if (!raw) return

      const parsed = JSON.parse(raw) as Partial<PersistedGamificationState>
      const points = Number(parsed.points ?? 0)
      const level = Number(parsed.level ?? Math.floor(points / POINTS_PER_LEVEL) + 1)
      const streak = Number(parsed.streak ?? 0)
      const history = Array.isArray(parsed.history) ? parsed.history.slice(0, 50) : []
      const unlockedIds = Array.isArray(parsed.unlockedIds) ? parsed.unlockedIds : []

      set({
        points,
        level,
        streak,
        history,
        unlockedIds,
      })
    } catch {
      // ignore malformed persisted state
    }
  },
}))
