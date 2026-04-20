import { useGamificationStore } from '@core/gamification/gamificationStore'

export function GamificationBar() {
  const { points, level, streak, unlockedIds, achievements } = useGamificationStore()
  const pointsInLevel = points % 100
  const progressPct = pointsInLevel

  return (
    <div className="bg-surface-light rounded-xl border border-border p-4 space-y-3">
      {/* Level + Points */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⭐</span>
          <div>
            <p className="text-sm font-semibold">Nivel {level}</p>
            <p className="text-xs text-muted">{points} puntos totales</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">🔥 {streak} días</p>
          <p className="text-xs text-muted">racha</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
        <div
          className="progress-bar-fill bg-gradient-to-r from-accent to-accent-light h-2 rounded-full"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <p className="text-xs text-muted text-right">{pointsInLevel}/100 para nivel {level + 1}</p>

      {/* Achievements */}
      <div className="flex flex-wrap gap-2 mt-2">
        {achievements.map((ach) => {
          const unlocked = unlockedIds.includes(ach.id)
          return (
            <div
              key={ach.id}
              title={`${ach.title}: ${ach.description}`}
              className={`text-xl cursor-default transition-opacity ${
                unlocked ? 'opacity-100' : 'opacity-25 grayscale'
              }`}
            >
              {ach.icon}
            </div>
          )
        })}
      </div>
    </div>
  )
}
