import { useEffect, useState } from 'react'
import { storageAPI } from '@core/storage/StorageAPI'
import { eventBus } from '@core/events/EventBus'
import type { EventLogEntry } from '@core/types'
import { Bell, BriefcaseBusiness, Dumbbell, Inbox } from 'lucide-react'

const SOURCE_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  fitness: Dumbbell,
  work: BriefcaseBusiness,
}

const EVENT_LABELS: Record<string, (payload: Record<string, unknown>) => string> = {
  WEIGHT_RECORDED: (p) => `Registraste peso${p.weight ? `: ${p.weight}kg` : ''}`,
  FITNESS_WEIGHT_RECORDED: (p) => `Registraste peso${p.weight ? `: ${p.weight}kg` : ''}`,
  DAILY_ENTRY_SAVED: () => 'Guardaste entrada diaria',
  FITNESS_DAILY_ENTRY_SAVED: () => 'Guardaste entrada diaria',
  MEAL_LOGGED: (p) => `Registraste comida${p.type ? ` (${p.type})` : ''}`,
  FITNESS_MEAL_LOGGED: (p) => `Registraste comida${p.type ? ` (${p.type})` : ''}`,
  WORKOUT_COMPLETED: () => 'Completaste un entrenamiento',
  FITNESS_WORKOUT_COMPLETED: () => 'Completaste un entrenamiento',
  MEASUREMENT_SAVED: () => 'Guardaste medidas corporales',
  FITNESS_MEASUREMENT_SAVED: () => 'Guardaste medidas corporales',
  TASK_CREATED: (p) => `Creaste tarea${p.title ? `: ${String(p.title).slice(0, 30)}` : ''}`,
  WORK_TASK_CREATED: (p) => `Creaste tarea${p.title ? `: ${String(p.title).slice(0, 30)}` : ''}`,
  TASK_COMPLETED: (p) => `Completaste tarea${p.title ? `: ${String(p.title).slice(0, 30)}` : ''}`,
  WORK_TASK_COMPLETED: (p) => `Completaste tarea${p.title ? `: ${String(p.title).slice(0, 30)}` : ''}`,
  TASK_MOVED: () => 'Moviste una tarea',
  WORK_TASK_MOVED: () => 'Moviste una tarea',
  NOTE_CREATED: (p) => `Creaste nota${p.title ? `: ${String(p.title).slice(0, 30)}` : ''}`,
  WORK_NOTE_CREATED: (p) => `Creaste nota${p.title ? `: ${String(p.title).slice(0, 30)}` : ''}`,
}

function humanizeEvent(entry: EventLogEntry): string {
  try {
    const payload = JSON.parse(entry.payload || '{}') as Record<string, unknown>
    const fn = EVENT_LABELS[entry.event_type]
    if (fn) return fn(payload)
  } catch {
    // ignore parse error
  }
  return entry.event_type.replace(/_/g, ' ').toLowerCase()
}

function relativeTime(isoStr: string): string {
  const ms = Date.now() - new Date(isoStr).getTime()
  const mins = Math.floor(ms / 60_000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `hace ${days}d`
}

export function RecentActivityFeed() {
  const [events, setEvents] = useState<EventLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    storageAPI
      .getRecentEvents(20)
      .then((data) => {
        setEvents(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    load()

    // Refresh feed when new events are emitted
    const delayedLoad = () => setTimeout(load, 60)

    const unsubs = [
      eventBus.on('FITNESS_WEIGHT_RECORDED', delayedLoad),
      eventBus.on('FITNESS_DAILY_ENTRY_SAVED', delayedLoad),
      eventBus.on('FITNESS_MEAL_LOGGED', delayedLoad),
      eventBus.on('FITNESS_WORKOUT_COMPLETED', delayedLoad),
      eventBus.on('FITNESS_MEASUREMENT_SAVED', delayedLoad),
      eventBus.on('WORK_TASK_CREATED', delayedLoad),
      eventBus.on('WORK_TASK_COMPLETED', delayedLoad),
      eventBus.on('WORK_TASK_MOVED', delayedLoad),
      eventBus.on('WORK_NOTE_CREATED', delayedLoad),
      // backward compatibility for old names
      eventBus.on('WEIGHT_RECORDED', delayedLoad),
      eventBus.on('DAILY_ENTRY_SAVED', delayedLoad),
      eventBus.on('TASK_CREATED', delayedLoad),
      eventBus.on('TASK_COMPLETED', delayedLoad),
      eventBus.on('TASK_MOVED', delayedLoad),
      eventBus.on('NOTE_CREATED', delayedLoad),
      eventBus.on('MEASUREMENT_SAVED', delayedLoad),
      eventBus.on('MEAL_LOGGED', delayedLoad),
      eventBus.on('WORKOUT_COMPLETED', delayedLoad),
    ]

    return () => unsubs.forEach((unsub) => unsub())
  }, [])

  return (
    <div className="rounded-xl border border-border bg-surface-light/85 p-4 shadow-lg h-full flex flex-col">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted mb-3">Actividad Reciente</h3>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-muted animate-pulse">Cargando…</p>
        </div>
      ) : events.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
          <Inbox size={28} className="text-muted/70" />
          <p className="text-xs text-muted">Sin actividad reciente</p>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto space-y-2 pr-1">
          {events.map((entry) => (
            <li key={entry.id} className="flex items-start gap-2.5 animate-fade-in">
              <span className="text-base leading-none mt-0.5 text-muted/80">
                {(() => {
                  const Icon = SOURCE_ICON[entry.source]
                  return Icon ? <Icon size={14} /> : <Bell size={14} />
                })()}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground leading-snug truncate">
                  {humanizeEvent(entry)}
                </p>
                <p className="text-[10px] text-muted mt-0.5">{relativeTime(entry.created_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
