import { useGamificationStore } from '@core/gamification/gamificationStore'
import { CheckCircle2, Flame, Gem, PersonStanding, Star, Target } from 'lucide-react'

const ACH_ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Star,
  Flame,
  Gem,
  Target,
  PersonStanding,
  CheckCircle2,
}

export function GamificationBar() {
  const { points, level, streak, unlockedIds, achievements } = useGamificationStore()
  const pointsInLevel = points % 100
  const progressPct = pointsInLevel

  return (
    <div className="bg-surface-light rounded-xl border border-border p-4 space-y-3">
      {/* Level + Points */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-accent-light"><Star size={22} /></span>
          <div>
            <p className="text-sm font-semibold">Nivel {level}</p>
            <p className="text-xs text-muted">{points} puntos totales</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold inline-flex items-center gap-1.5">
            <Flame size={14} className="text-warning" />
            {streak} días
          </p>
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
          const Icon = ACH_ICON_MAP[ach.icon] ?? Star
          return (
            <div
              key={ach.id}
              title={`${ach.title}: ${ach.description}`}
              className={`cursor-default transition-all duration-200 ${
                unlocked ? 'opacity-100 scale-100' : 'opacity-25 grayscale scale-90'
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
