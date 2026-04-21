import { CheckCircle2, Circle } from 'lucide-react'
import { useGamificationStore } from '@core/gamification/gamificationStore'

export function DailyMissions() {
  const dailyMissions = useGamificationStore((s) => s.dailyMissions)
  const missionsCompletedDate = useGamificationStore((s) => s.missionsCompletedDate)

  const pending = dailyMissions.filter((mission) => !mission.completed).length
  const allCompleted = dailyMissions.length > 0 && pending === 0

  if (dailyMissions.length === 0) {
    return null
  }

  return (
    <section className="rounded-2xl border border-border bg-surface-light/90 p-5 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Daily Missions</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Misiones del dia</h3>
        </div>
        {pending > 0 && (
          <span className="rounded-full border border-warning/35 bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">
            Pendiente hoy
          </span>
        )}
      </div>

      <div className="mt-4 space-y-2">
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
            <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent-light">
              +{mission.xp} XP
            </span>
          </div>
        ))}
      </div>

      {allCompleted && (
        <div className="mt-3 rounded-xl border border-success/30 bg-success/12 px-3 py-2 text-sm text-success animate-fade-in">
          Dia completo. Bonus aplicado {missionsCompletedDate ? 'con exito' : 'en progreso'}.
        </div>
      )}
    </section>
  )
}
