import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { storageAPI } from '@core/storage/StorageAPI'
import type { EventLogEntry } from '@core/types'
import { Lightbulb, TriangleAlert, CheckCircle2 } from 'lucide-react'

interface Suggestion {
  id: string
  message: string
  ctaLabel: string
  ctaPath: string
  type: 'info' | 'warning' | 'positive'
}

const ONE_DAY = 86_400_000

const WEIGHT_EVENTS = new Set(['WEIGHT_RECORDED', 'FITNESS_WEIGHT_RECORDED'])
const TASK_CREATED_EVENTS = new Set(['TASK_CREATED', 'WORK_TASK_CREATED'])
const TASK_COMPLETED_EVENTS = new Set(['TASK_COMPLETED', 'WORK_TASK_COMPLETED'])
const DAILY_ENTRY_EVENTS = new Set(['DAILY_ENTRY_SAVED', 'FITNESS_DAILY_ENTRY_SAVED'])

function isOneOfType(eventType: string, values: Set<string>): boolean {
  return values.has(eventType)
}

function buildSuggestions(events: EventLogEntry[]): Suggestion[] {
  const now = Date.now()
  const suggestions: Suggestion[] = []

  const lastWeight = events.find((e) => isOneOfType(e.event_type, WEIGHT_EVENTS))
  const lastTask = events.find(
    (e) =>
      isOneOfType(e.event_type, TASK_CREATED_EVENTS) ||
      isOneOfType(e.event_type, TASK_COMPLETED_EVENTS),
  )
  const lastTaskCompleted = events.find((e) => isOneOfType(e.event_type, TASK_COMPLETED_EVENTS))
  const lastEntry = events.find((e) => isOneOfType(e.event_type, DAILY_ENTRY_EVENTS))

  // Weight suggestion
  if (!lastWeight) {
    suggestions.push({
      id: 'no-weight',
      message: 'No has registrado tu peso todavía. Empezar ayuda a seguir el progreso.',
      ctaLabel: 'Registrar peso',
      ctaPath: '/fitness/tracking',
      type: 'warning',
    })
  } else {
    const elapsed = now - new Date(lastWeight.created_at).getTime()
    const days = Math.floor(elapsed / ONE_DAY)
    if (days >= 3) {
      suggestions.push({
        id: 'weight-gap',
        message: `Hace ${days} días que no registrás tu peso.`,
        ctaLabel: 'Registrar ahora',
        ctaPath: '/fitness/tracking',
        type: 'warning',
      })
    }
  }

  // Task activity suggestion
  if (!lastTaskCompleted) {
    if (lastTask) {
      suggestions.push({
        id: 'no-task-completed',
        message: 'Tenés tareas sin completar. ¿Retomás el trabajo?',
        ctaLabel: 'Ver tareas',
        ctaPath: '/work',
        type: 'info',
      })
    }
  } else {
    const elapsed = now - new Date(lastTaskCompleted.created_at).getTime()
    const days = Math.floor(elapsed / ONE_DAY)
    if (days >= 3) {
      suggestions.push({
        id: 'task-gap',
        message: `Hace ${days} días sin completar tareas.`,
        ctaLabel: 'Ver trabajo',
        ctaPath: '/work',
        type: 'warning',
      })
    }
  }

  // Positive reinforcement
  if (lastEntry) {
    const elapsed = now - new Date(lastEntry.created_at).getTime()
    if (elapsed < ONE_DAY) {
      suggestions.push({
        id: 'good-rhythm',
        message: 'Registraste datos hoy. ¡Buen ritmo, seguí así!',
        ctaLabel: 'Ver progreso',
        ctaPath: '/fitness',
        type: 'positive',
      })
    }
  }

  // Cap at 3
  return suggestions.slice(0, 3)
}

const TYPE_STYLES: Record<
  Suggestion['type'],
  { border: string; icon: React.ComponentType<{ size?: number; className?: string }>; text: string }
> = {
  warning: { border: 'border-warning/30 bg-warning/5', icon: TriangleAlert, text: 'text-warning' },
  info: { border: 'border-accent/30 bg-accent/5', icon: Lightbulb, text: 'text-accent-light' },
  positive: { border: 'border-success/30 bg-success/5', icon: CheckCircle2, text: 'text-success' },
}

export function SystemSuggestions() {
  const navigate = useNavigate()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])

  useEffect(() => {
    storageAPI
      .getRecentEvents(100)
      .then((events) => setSuggestions(buildSuggestions(events)))
      .catch(() => {})
  }, [])

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
