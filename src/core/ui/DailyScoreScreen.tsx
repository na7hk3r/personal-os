import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Loader2,
  MessageSquare,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import {
  dailyScoreService,
  type DailyScoreData,
} from '@core/services/dailyScoreService'

interface DailyScoreScreenProps {
  /** Llamado cuando el usuario decide entrar al dashboard. */
  onDismiss: () => void
  /**
   * Llamado cuando el usuario decide abrir el copiloto.
   * El callback es responsable de:
   *  - cerrar la pantalla (dismiss)
   *  - abrir el panel del copiloto (Shell se entera vía evento `copilot:open`)
   */
  onOpenCopilot: () => void
}

function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split('-').map((s) => Number.parseInt(s, 10))
  const date = new Date(y, (m ?? 1) - 1, d ?? 1)
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-300'
  if (score >= 60) return 'text-amber-300'
  if (score >= 40) return 'text-orange-300'
  return 'text-rose-300'
}

function scoreRing(score: number): string {
  if (score >= 80) return 'ring-emerald-400/40'
  if (score >= 60) return 'ring-amber-400/40'
  if (score >= 40) return 'ring-orange-400/40'
  return 'ring-rose-400/40'
}

export function DailyScoreScreen({ onDismiss, onOpenCopilot }: DailyScoreScreenProps) {
  const [data, setData] = useState<DailyScoreData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const computed = await dailyScoreService.compute()
        if (cancelled) return
        setData(computed)
      } catch (err) {
        console.error('[DailyScoreScreen] compute failed', err)
        if (!cancelled) setError('No pudimos calcular tu score de hoy.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Resumen del día"
      className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-[radial-gradient(circle_at_top,_#16324f_0%,_#101923_45%,_#070d14_100%)] p-6"
    >
      <div className="w-full max-w-xl rounded-2xl border border-border bg-surface-light/90 p-6 shadow-2xl backdrop-blur md:p-8">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            <span>Calculando tu día…</span>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <AlertTriangle className="text-rose-300" aria-hidden="true" />
            <p className="text-sm text-muted">{error}</p>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-md border border-border bg-surface px-4 py-2 text-sm text-white hover:border-accent/50"
            >
              Ir al dashboard
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <ScoreContent data={data} onDismiss={onDismiss} onOpenCopilot={onOpenCopilot} />
        )}
      </div>
    </div>
  )
}

interface ContentProps {
  data: DailyScoreData
  onDismiss: () => void
  onOpenCopilot: () => void
}

function ScoreContent({ data, onDismiss, onOpenCopilot }: ContentProps) {
  const dateLabel = formatLongDate(data.date)
  const deltaAbs = Math.abs(data.delta)
  const isUp = data.delta >= 0
  const DeltaIcon = isUp ? TrendingUp : TrendingDown
  const deltaColor = isUp ? 'text-emerald-300' : 'text-rose-300'
  const deltaLabel = data.delta === 0
    ? 'igual a tu promedio semanal'
    : `${isUp ? '▲' : '▼'} ${deltaAbs} pts vs. tu promedio semanal`

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{dateLabel}</p>
      </header>

      <section
        aria-label="Score del día"
        className={`flex items-center gap-5 rounded-2xl border border-border bg-surface px-5 py-5 ring-1 ${scoreRing(data.score)}`}
      >
        <div className={`flex h-20 w-20 flex-col items-center justify-center rounded-full bg-surface-light text-center ${scoreColor(data.score)}`}>
          <span className="text-3xl font-semibold leading-none">{data.score}</span>
          <span className="mt-1 text-[10px] uppercase tracking-widest text-muted">/ 100</span>
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-medium text-white">Tu score hoy</h2>
          <p className={`flex items-center gap-1.5 text-sm ${deltaColor}`}>
            <DeltaIcon size={14} aria-hidden="true" />
            <span>{deltaLabel}</span>
          </p>
          <p className="text-xs text-muted">Promedio últimos 7 días: {data.weekAverage}/100</p>
        </div>
      </section>

      {data.atRiskHabits.length > 0 && (
        <section aria-labelledby="rachas-en-riesgo" className="space-y-2">
          <h3
            id="rachas-en-riesgo"
            className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-amber-200"
          >
            <AlertTriangle size={14} aria-hidden="true" />
            Rachas en riesgo
          </h3>
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {data.atRiskHabits.map((h) => (
              <li key={h.name} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="truncate text-white">{h.name}</span>
                <span className="ml-3 text-xs text-amber-200">{h.streak}d sin perder</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.pendingTasks.length > 0 && (
        <section aria-labelledby="para-baseline" className="space-y-2">
          <h3
            id="para-baseline"
            className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-emerald-200"
          >
            <Target size={14} aria-hidden="true" />
            Para volver a baseline
          </h3>
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {data.pendingTasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                <span aria-hidden="true" className="inline-block h-3 w-3 rounded border border-border" />
                <span className="truncate text-white">{t.title}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.atRiskHabits.length === 0 && data.pendingTasks.length === 0 && (
        <p className="rounded-xl border border-dashed border-border bg-surface/50 px-4 py-3 text-xs text-muted">
          No hay alertas para hoy. Buen momento para abrir el copiloto y planear el día.
        </p>
      )}

      <footer className="flex flex-col gap-2 pt-2 sm:flex-row">
        <button
          type="button"
          onClick={onOpenCopilot}
          className="flex flex-1 items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          <MessageSquare size={16} aria-hidden="true" />
          Abrir copiloto
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-accent/50"
        >
          Ir al dashboard
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </footer>
    </div>
  )
}
