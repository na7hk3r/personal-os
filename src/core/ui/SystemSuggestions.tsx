import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { storageAPI } from '@core/storage/StorageAPI'
import { useCoreStore } from '@core/state/coreStore'
import { Lightbulb, TriangleAlert, CheckCircle2 } from 'lucide-react'
import { buildSystemSuggestions, subscribeGuidanceRefresh, type GuidanceSuggestion } from './systemGuidance'

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

  if (suggestions.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-widest text-muted">Sugerencias del Sistema</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {suggestions.map((s) => {
          const style = TYPE_STYLES[s.type]
          const Icon = style.icon
          return (
            <div
              key={s.id}
              className={`rounded-xl border ${style.border} p-4 flex flex-col gap-3 animate-fade-in`}
            >
              <div className="flex items-start gap-2">
                <Icon size={15} className="mt-0.5" />
                <p className="text-xs text-muted leading-relaxed">{s.message}</p>
              </div>
              <button
                onClick={() => navigate(s.ctaPath)}
                className={`self-start text-xs font-medium ${style.text} hover:underline transition-all`}
              >
                {s.ctaLabel} →
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
