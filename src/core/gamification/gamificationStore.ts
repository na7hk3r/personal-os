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
}

const POINTS_PER_LEVEL = 100

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-entry',
    title: 'Primer registro',
    description: 'Registraste tu primer día',
    icon: '🌟',
    condition: (s) => s.totalEntries >= 1,
  },
  {
    id: 'week-streak',
    title: 'Racha semanal',
    description: '7 días seguidos registrando',
    icon: '🔥',
    condition: (s) => s.dailyStreak >= 7,
  },
  {
    id: 'month-streak',
    title: 'Racha mensual',
    description: '30 días seguidos registrando',
    icon: '💎',
    condition: (s) => s.dailyStreak >= 30,
  },
  {
    id: 'centurion',
    title: 'Centurión',
    description: 'Acumula 100 puntos',
    icon: '💯',
    condition: (s) => s.totalPoints >= 100,
  },
  {
    id: 'workout-10',
    title: 'Deportista',
    description: 'Completa 10 entrenamientos',
    icon: '🏃',
    condition: (s) => s.totalWorkouts >= 10,
  },
  {
    id: 'tasks-25',
    title: 'Productivo',
    description: 'Completa 25 tareas',
    icon: '✅',
    condition: (s) => s.tasksCompleted >= 25,
  },
]

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

      return {
        points: newPoints,
        level: newLevel,
        history: [
          { amount, reason, date: new Date().toISOString() },
          ...s.history.slice(0, 49),
        ],
      }
    })
  },

  setStreak: (n) => set({ streak: n }),

  unlockAchievement: (id) => {
    const s = get()
    if (s.unlockedIds.includes(id)) return
    const ach = s.achievements.find((a) => a.id === id)
    if (!ach) return

    set({ unlockedIds: [...s.unlockedIds, id] })

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
}))
