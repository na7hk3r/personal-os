import { useState } from 'react'
import { useGamificationStore } from '@core/gamification/gamificationStore'
import {
  buildGamificationStats,
  getAchievementProgress,
  getLevelTitle,
  getLevelTier,
  getNextAchievement,
  getXpHistoryByDay,
} from '@core/gamification/gamificationUtils'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CheckCircle2, Flame, Gem, NotebookPen, PersonStanding, Star, Sunrise, Target, TimerReset } from 'lucide-react'

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
  TimerReset,
  NotebookPen,
  Sunrise,
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
  const [achievementsExpanded, setAchievementsExpanded] = useState(false)
  const pointsInLevel = points % 100
  const progressPct = pointsInLevel
  const levelTitle = getLevelTitle(level)
  const tier = getLevelTier(level)
  const stats = buildGamificationStats(points, streak, history)
  const xpByDay = getXpHistoryByDay(history, 7)
  const nextAchievement = getNextAchievement(achievements, unlockedIds, stats)

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
          <div className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br text-base font-black shadow-lg ${
            tier === 'bronze'
              ? 'from-xp-bronze to-amber-300 text-[#2a1808]'
              : tier === 'silver'
                ? 'from-xp-silver to-slate-200 text-[#1f2937]'
                : tier === 'gold'
                  ? 'from-xp-gold to-yellow-200 text-[#3a2a00]'
                  : 'from-xp-platinum to-cyan-200 text-[#08212f]'
          }`}>
            {level}
          </div>
          <div>
            <p className="text-sm font-semibold">Nivel {level} · {levelTitle}</p>
            <p className="text-xs text-muted">{points} puntos totales</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="text-sm font-semibold inline-flex items-center gap-1.5">
            <Flame size={14} className="text-warning" />
            {streak} días
          </p>
          <p className="text-xs text-muted">racha activa</p>
          {nextAchievement && (
            <p className="text-micro text-muted" title={`${nextAchievement.title}: ${nextAchievement.progress.current}/${nextAchievement.progress.target}`}>
              🎯 {nextAchievement.title} {nextAchievement.progress.current}/{nextAchievement.progress.target}
            </p>
          )}
        </div>
      </div>

      {/* Progress bar with milestones */}
      <div className="space-y-1">
        <div className="relative w-full bg-surface rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-accent to-accent-light h-2.5 rounded-full transition-all duration-500 relative"
            style={{ width: `${progressPct}%` }}
          >
            <span className="absolute inset-0 progress-shimmer" />
          </div>
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

      <div className="rounded-xl border border-border bg-surface/50 p-3">
        <p className="mb-2 text-xs uppercase tracking-eyebrow text-muted">XP Ultimos 7 dias</p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={xpByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="date" stroke="var(--chart-axis)" fontSize={11} />
              <YAxis stroke="var(--chart-axis)" fontSize={11} width={28} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--chart-tooltip-bg)',
                  border: '1px solid var(--chart-tooltip-border)',
                }}
                labelStyle={{ color: 'var(--chart-axis)' }}
              />
              <Bar dataKey="xp" fill="var(--chart-weight)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
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
      {(() => {
        const VISIBLE_COUNT = 6
        const visible = achievementsExpanded ? achievements : achievements.slice(0, VISIBLE_COUNT)
        const hiddenCount = achievements.length - VISIBLE_COUNT
        return (
          <>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {visible.map((ach) => {
                const unlocked = unlockedIds.includes(ach.id)
                const Icon = ACH_ICON_MAP[ach.icon] ?? Star
                const progress = getAchievementProgress(ach.id, stats)
                return (
                  <div
                    key={ach.id}
                    title={`${ach.title}: ${ach.description}`}
                    className={`cursor-default rounded-xl border p-2.5 transition-all duration-200 ${
                      unlocked
                        ? 'border-xp-gold/55 bg-xp-gold/10'
                        : 'border-border bg-surface/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`rounded-lg p-1.5 ${unlocked ? 'bg-xp-gold/20 text-xp-gold' : 'bg-surface text-muted'}`}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">{ach.title}</p>
                        <p className="truncate text-caption text-muted">{ach.description}</p>
                      </div>
                    </div>
                    {!unlocked && (
                      <div className="mt-2 space-y-1">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-lighter">
                          <div
                            className="h-1.5 rounded-full bg-gradient-to-r from-warning to-xp-gold transition-all duration-500"
                            style={{ width: `${progress.percent}%` }}
                          />
                        </div>
                        <p className="text-caption text-muted">
                          {progress.current}/{progress.target} {progress.label}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {hiddenCount > 0 && (
              <button
                onClick={() => setAchievementsExpanded((prev) => !prev)}
                className="w-full rounded-lg border border-border bg-surface/40 py-1.5 text-xs text-muted transition-colors hover:bg-surface-lighter hover:text-white"
              >
                {achievementsExpanded ? 'Ver menos' : `Ver ${hiddenCount} logro${hiddenCount !== 1 ? 's' : ''} más`}
              </button>
            )}
          </>
        )
      })()}
    </div>
  )
}
