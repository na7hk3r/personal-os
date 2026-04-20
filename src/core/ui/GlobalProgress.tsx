import { useGamificationStore } from '@core/gamification/gamificationStore'
import { CheckCircle2, Flame, Gem, PersonStanding, Star, Target } from 'lucide-react'

const PLUGIN_LABELS: Record<string, string> = {
  fitness: 'Fitness',
  work: 'Work',
}

const REASON_PREFIXES = [
  { prefix: 'fitness', label: 'Fitness' },
  { prefix: 'work', label: 'Work' },
  { prefix: 'weight', label: 'Fitness' },
  { prefix: 'task', label: 'Work' },
  { prefix: 'note', label: 'Work' },
]

const ACH_ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Star,
  Flame,
  Gem,
  Target,
  PersonStanding,
  CheckCircle2,
}

function categorizeReason(reason: string): string {
  const lower = reason.toLowerCase()
  for (const { prefix, label } of REASON_PREFIXES) {
    if (lower.includes(prefix)) return label
  }
  return 'General'
}

export function GlobalProgress() {
  const { points, level, streak, history, unlockedIds, achievements } = useGamificationStore()
  const pointsInLevel = points % 100
  const progressPct = pointsInLevel

  // XP breakdown by source
  const breakdown = history.reduce<Record<string, number>>((acc, entry) => {
    const cat = categorizeReason(entry.reason)
    acc[cat] = (acc[cat] ?? 0) + entry.amount
    return acc
  }, {})

  const breakdownEntries = Object.entries(breakdown).sort((a, b) => b[1] - a[1])

  return (
    <div className="rounded-xl border border-border bg-surface-light/85 p-5 shadow-lg space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative text-accent-light">
            <Star size={22} />
          </div>
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
          <p className="text-xs text-muted">racha activa</p>
        </div>
      </div>

      {/* Progress bar with milestones */}
      <div className="space-y-1">
        <div className="relative w-full bg-surface rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-accent to-accent-light h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
          {/* Milestone markers */}
          {[25, 50, 75].map((pct) => (
            <div
              key={pct}
              className={`absolute top-0 bottom-0 w-px ${progressPct >= pct ? 'bg-white/30' : 'bg-surface-lighter'}`}
              style={{ left: `${pct}%` }}
            />
          ))}
        </div>
        <p className="text-xs text-muted text-right">{pointsInLevel}/100 para nivel {level + 1}</p>
      </div>

      {/* XP Breakdown */}
      {breakdownEntries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {breakdownEntries.map(([cat, xp]) => (
            <span
              key={cat}
              className="rounded-full bg-surface px-2.5 py-0.5 text-xs text-muted border border-border"
            >
              {PLUGIN_LABELS[cat.toLowerCase()] ?? cat}: +{xp} XP
            </span>
          ))}
        </div>
      )}

      {/* Achievements */}
      <div className="flex flex-wrap gap-2">
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
