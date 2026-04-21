import { useGamificationStore } from '@core/gamification/gamificationStore'
import { eventBus } from '@core/events/EventBus'
import { FITNESS_EVENTS } from '@plugins/fitness/events'
import { WORK_EVENTS } from '@plugins/work/events'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Flame,
  Gem,
  NotebookPen,
  PersonStanding,
  Star,
  Sunrise,
  Target,
  TimerReset,
} from 'lucide-react'
import {
  buildGamificationStats,
  getAchievementProgress,
  getLevelTier,
  getLevelTitle,
  getXpMultiplierForStreak,
  getIsoDateKey,
  userActedToday,
} from '@core/gamification/gamificationUtils'

const ACH_ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Star,
  Flame,
  Gem,
  Target,
  PersonStanding,
  CheckCircle2,
  TimerReset,
  NotebookPen,
  Sunrise,
}

const ACTION_EVENTS: Set<string> = new Set([
  FITNESS_EVENTS.DAILY_ENTRY_SAVED,
  FITNESS_EVENTS.WORKOUT_COMPLETED,
  FITNESS_EVENTS.MEASUREMENT_SAVED,
  WORK_EVENTS.TASK_COMPLETED,
  WORK_EVENTS.FOCUS_STARTED,
  WORK_EVENTS.FOCUS_COMPLETED,
  WORK_EVENTS.NOTE_CREATED,
])

function hasActionTodayInBusHistory(): boolean {
  const today = getIsoDateKey(new Date())
  return eventBus
    .getHistory(180)
    .some((item) => ACTION_EVENTS.has(item.event) && getIsoDateKey(new Date(item.timestamp)) === today)
}

const LEVEL_TIER_STYLE: Record<string, string> = {
  bronze: 'from-xp-bronze to-amber-300 text-[#2a1808]',
  silver: 'from-xp-silver to-slate-200 text-[#1f2937]',
  gold: 'from-xp-gold to-yellow-200 text-[#3a2a00]',
  platinum: 'from-xp-platinum to-cyan-200 text-[#08212f]',
}

export function GamificationBar() {
  const { points, level, streak, unlockedIds, achievements, lastActionAt, history } = useGamificationStore()
  const [actedToday, setActedToday] = useState(() => hasActionTodayInBusHistory() || userActedToday(lastActionAt))
  const pointsInLevel = points % 100
  const progressPct = pointsInLevel
  const levelTier = getLevelTier(level)
  const levelTitle = getLevelTitle(level)
  const multiplier = getXpMultiplierForStreak(streak)
  const streakAtRisk = streak > 0 && !actedToday
  const stats = useMemo(() => buildGamificationStats(points, streak, history), [points, streak, history])

  useEffect(() => {
    setActedToday(hasActionTodayInBusHistory() || userActedToday(lastActionAt))

    const markAction = () => setActedToday(true)
    const unsubs = Array.from(ACTION_EVENTS).map((eventName) => eventBus.on(eventName, markAction))
    return () => unsubs.forEach((unsubscribe) => unsubscribe())
  }, [lastActionAt])

  return (
    <div className="bg-surface-light rounded-xl border border-border p-4 space-y-3">
      {/* Level + Points */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            title={`${levelTitle} (${levelTier})`}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br text-lg font-black shadow-lg ${LEVEL_TIER_STYLE[levelTier]}`}
          >
            {level}
          </span>
          <div>
            <p className="text-sm font-semibold">Nivel {level} · {levelTitle}</p>
            <p className="text-xs text-muted">{points} puntos totales</p>
          </div>
        </div>
        <div className="text-right">
          <p
            className={`text-sm font-semibold inline-flex items-center gap-1.5 ${
              streakAtRisk ? 'text-warning' : streak > 0 ? 'text-success' : 'text-muted'
            }`}
            title={streakAtRisk ? 'Sin accion registrada hoy, la racha esta en riesgo' : 'Racha diaria activa'}
          >
            {streakAtRisk ? <AlertTriangle size={14} /> : <Flame size={14} className={streak > 0 ? 'animate-pulse' : ''} />}
            {streak} dias {streakAtRisk ? 'en riesgo' : ''}
          </p>
          <p className="text-xs text-muted">racha</p>
        </div>
      </div>

      {multiplier > 1 && (
        <div className="inline-flex items-center rounded-full border border-accent/35 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent-light">
          Multiplicador activo x{multiplier.toFixed(2)}
        </div>
      )}

      {/* Progress bar */}
      <div className="relative w-full bg-surface rounded-full h-2 overflow-hidden">
        <div
          className="progress-bar-fill relative bg-gradient-to-r from-accent to-accent-light h-2 rounded-full"
          style={{ width: `${progressPct}%` }}
        >
          <span className="absolute inset-0 progress-shimmer" />
        </div>
      </div>
      <p className="text-xs text-muted text-right">{pointsInLevel}/100 para nivel {level + 1}</p>

      {/* Achievements */}
      <div className="flex flex-wrap gap-2 mt-2">
        {achievements.map((ach) => {
          const unlocked = unlockedIds.includes(ach.id)
          const Icon = ACH_ICON_MAP[ach.icon] ?? Star
          const progress = getAchievementProgress(ach.id, stats)
          const remaining = Math.max(0, progress.target - progress.current)
          return (
            <div
              key={ach.id}
              title={unlocked
                ? `${ach.title}: ${ach.description}`
                : `${ach.title}: ${ach.description}. Falta ${remaining} ${progress.label}`}
              className={`cursor-default transition-all duration-200 rounded-full border p-1.5 ${
                unlocked
                  ? 'opacity-100 scale-100 border-xp-gold/65 bg-xp-gold/10 achievement-glow'
                  : 'opacity-55 grayscale scale-95 border-border bg-surface'
              }`}
            >
              <Icon size={18} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
