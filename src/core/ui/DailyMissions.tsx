import { CheckCircle2, Circle, Sparkles, Zap } from 'lucide-react'
import { useGamificationStore } from '@core/gamification/gamificationStore'
import { getXpMultiplierForStreak } from '@core/gamification/gamificationUtils'

export function DailyMissions() {
  const dailyMissions = useGamificationStore((s) => s.dailyMissions)
  const missionsCompletedDate = useGamificationStore((s) => s.missionsCompletedDate)
  const streak = useGamificationStore((s) => s.streak)

  const pending = dailyMissions.filter((mission) => !mission.completed).length
  const allCompleted = dailyMissions.length > 0 && pending === 0
  const multiplier = getXpMultiplierForStreak(streak)
  const hasMultiplier = multiplier > 1

  const earnedXp = dailyMissions
    .filter((mission) => mission.completed)
    .reduce((sum, mission) => sum + mission.xp, 0)

  const baseXp = dailyMissions.reduce((sum, mission) => sum + mission.xp, 0)
  const bonusXp = 15 + (streak >= 7 ? 5 : 0)
  const totalXp = baseXp + bonusXp

  if (dailyMissions.length === 0) {
    return null
  }

  return (
    <section className="rounded-2xl border border-border bg-surface-light/90 p-5 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Daily Missions</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Misiones del día</h3>
        </div>
        <div className="flex flex-col items-end gap-1">
          {pending > 0 ? (
            <span className="rounded-full border border-warning/35 bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">
              Pendiente hoy
            </span>
          ) : (
            <span className="rounded-full border border-success/35 bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
              ✓ Completadas
            </span>
          )}
          {hasMultiplier && (
            <span className="inline-flex items-center gap-1 rounded-full border border-accent/35 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent-light">
              <Zap size={10} />
              ×{multiplier.toFixed(2)} XP
            </span>
          )}
        </div>
      </div>

      {/* XP Progress */}
      <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-surface/50 px-3 py-2">
        <p className="text-xs text-muted">XP del día</p>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-accent-light">{earnedXp}</span>
          <span className="text-xs text-muted">/ {totalXp} XP</span>
          {earnedXp > 0 && (
            <div className="ml-1 h-1.5 w-16 overflow-hidden rounded-full bg-surface-lighter">
              <div
                className="h-1.5 rounded-full bg-gradient-to-r from-accent to-accent-light transition-all duration-500"
                style={{ width: `${Math.min(100, (earnedXp / totalXp) * 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {dailyMissions.map((mission) => (
          <div
            key={mission.id}
            className={`flex items-center justify-between rounded-xl border px-3 py-2.5 transition-all ${
              mission.completed
                ? 'border-success/35 bg-success/10'
                : 'border-border bg-surface/70'
            }`}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              {mission.completed ? (
                <CheckCircle2 size={17} className="text-success" />
              ) : (
                <Circle size={15} className="text-muted" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{mission.title}</p>
                <p className="truncate text-xs text-muted">{mission.description}</p>
              </div>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
              mission.completed
                ? 'bg-success/15 text-success'
                : 'bg-accent/15 text-accent-light'
            }`}>
              +{mission.xp} XP
            </span>
          </div>
        ))}
      </div>

      {allCompleted && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-success/30 bg-success/12 px-3 py-2 text-sm text-success animate-fade-in">
          <Sparkles size={14} />
          <span>Día completo · +{bonusXp} XP bonus{missionsCompletedDate ? ' aplicado' : ' pendiente'}</span>
        </div>
      )}

      {!allCompleted && pending === 1 && (
        <p className="mt-2 text-center text-xs text-muted">Queda 1 misión — ¡casi!</p>
      )}
    </section>
  )
}
