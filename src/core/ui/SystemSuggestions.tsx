import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { storageAPI } from '@core/storage/StorageAPI'
import { useCoreStore } from '@core/state/coreStore'
import { Bell, CheckCircle2, Lightbulb, RefreshCw, Sparkles, TriangleAlert, X } from 'lucide-react'
import { buildSystemSuggestions, subscribeGuidanceRefresh, type GuidanceSuggestion } from './systemGuidance'
import { aiSuggestionsService } from '@core/services/aiSuggestionsService'
import { ollamaService } from '@core/services/ollamaService'

const TYPE_STYLES: Record<
  GuidanceSuggestion['type'],
  { border: string; icon: React.ComponentType<{ size?: number; className?: string }>; text: string }
> = {
  warning: { border: 'border-warning/30 bg-warning/5', icon: TriangleAlert, text: 'text-warning' },
  info: { border: 'border-accent/30 bg-accent/5', icon: Lightbulb, text: 'text-accent-light' },
  positive: { border: 'border-success/30 bg-success/5', icon: CheckCircle2, text: 'text-success' },
}

export function SystemSuggestions() {
  const navigate = useNavigate()
  const activePluginIds = useCoreStore((s) => s.activePlugins)
  const [suggestions, setSuggestions] = useState<GuidanceSuggestion[]>([])
  const [expanded, setExpanded] = useState(false)
  const [aiText, setAiText] = useState<string>('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiAvailable, setAiAvailable] = useState(false)

  useEffect(() => {
    void ollamaService.isReady().then((r) => setAiAvailable(r.enabled && r.healthy)).catch(() => setAiAvailable(false))
  }, [])

  const fetchAi = async () => {
    if (aiLoading) return
    setAiLoading(true)
    try {
      const result = await aiSuggestionsService.generate('dailyCoach')
      setAiText(result.text)
    } catch (err) {
      setAiText(`(IA no disponible: ${(err as Error).message})`)
    } finally {
      setAiLoading(false)
    }
  }

  useEffect(() => {
    if (expanded && aiAvailable && !aiText && !aiLoading) void fetchAi()
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, aiAvailable])

  useEffect(() => {
    const load = () => {
      storageAPI
        .getRecentEvents(120)
        .then((events) => setSuggestions(buildSystemSuggestions(events, activePluginIds)))
        .catch(() => {})
    }

    load()
    const unsubs = subscribeGuidanceRefresh(load)
    return () => unsubs.forEach((u) => u())
  }, [activePluginIds])

  const relevantSuggestions = suggestions.filter((s) => s.type !== 'positive')
  const hasRelevant = relevantSuggestions.length > 0
  const displaySuggestions = hasRelevant ? relevantSuggestions : suggestions

  if (suggestions.length === 0) return null

  return (
    <div className="relative flex justify-end">
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-surface-light/90 text-muted shadow transition-colors hover:border-accent/40 hover:text-accent-light"
        title={hasRelevant ? 'Abrir centro de notificaciones' : 'Abrir historial de notificaciones'}
      >
        <Bell size={15} />
        {hasRelevant && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-warning px-1 text-[10px] font-semibold text-slate-900">
            {relevantSuggestions.length}
          </span>
        )}
      </button>

      {expanded && (
        <section className="absolute right-0 top-11 z-30 w-[min(92vw,420px)] rounded-xl border border-border bg-surface-light/95 p-3 shadow-2xl backdrop-blur">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[11px] uppercase tracking-[0.14em] text-muted">Centro de notificaciones</p>
              <p className="text-xs text-muted">
                {hasRelevant
                  ? `${relevantSuggestions.length} alerta${relevantSuggestions.length === 1 ? '' : 's'} pendiente${relevantSuggestions.length === 1 ? '' : 's'}`
                  : 'No hay alertas pendientes, mostrando historial reciente'}
              </p>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/70 text-muted transition-colors hover:border-accent/40 hover:text-accent-light"
              title="Cerrar notificaciones"
            >
              <X size={13} />
            </button>
          </div>

          <div className="space-y-2">
            {aiAvailable && (
              <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-accent-light">
                    <Sparkles size={11} /> Coach IA local
                  </div>
                  <button
                    onClick={() => void fetchAi()}
                    disabled={aiLoading}
                    className="rounded p-1 text-muted hover:text-white disabled:opacity-50"
                    aria-label="Regenerar sugerencia"
                  ><RefreshCw size={11} className={aiLoading ? 'animate-spin' : ''} /></button>
                </div>
                <p className="whitespace-pre-line text-xs leading-relaxed text-foreground/80">
                  {aiLoading ? 'Pensando...' : aiText || 'Generando sugerencia...'}
                </p>
              </div>
            )}
            {displaySuggestions.map((s) => {
              const style = TYPE_STYLES[s.type]
              const Icon = style.icon
              return (
                <div
                  key={s.id}
                  className={`flex items-start justify-between gap-3 rounded-lg border ${style.border} p-3 animate-fade-in`}
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <Icon size={14} className="mt-0.5 shrink-0" />
                    <p className="text-xs leading-relaxed text-muted">{s.message}</p>
                  </div>
                  <button
                    onClick={() => {
                      navigate(s.ctaPath)
                      setExpanded(false)
                    }}
                    className={`shrink-0 self-center text-xs font-medium ${style.text} transition-all hover:underline`}
                  >
                    {s.ctaLabel} →
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
