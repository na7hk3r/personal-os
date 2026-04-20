import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { storageAPI } from '@core/storage/StorageAPI'
import { eventBus } from '@core/events/EventBus'
import { useCoreStore } from '@core/state/coreStore'
import type { EventLogEntry } from '@core/types'

type DayState = 'on-track' | 'unstable' | 'disconnected'

interface HeroState {
  dayState: DayState
  insight: string
  ctaLabel: string
  ctaPath: string
}

const FITNESS_WEIGHT_EVENTS = new Set(['WEIGHT_RECORDED', 'FITNESS_WEIGHT_RECORDED'])
const WORK_DONE_EVENTS = new Set(['TASK_COMPLETED', 'WORK_TASK_COMPLETED'])

function isOneOf(entry: EventLogEntry, values: Set<string>): boolean {
  return values.has(entry.event_type)
}

function computeState(events: EventLogEntry[]): HeroState {
  const now = Date.now()
  const ONE_DAY = 86_400_000
  const THREE_DAYS = ONE_DAY * 3

  const lastEvent = events[0]

  if (!lastEvent) {
    return {
      dayState: 'disconnected',
      insight: 'Sin actividad registrada aún. Empezá ahora.',
      ctaLabel: 'Registrar peso',
      ctaPath: '/fitness/tracking',
    }
  }

  const lastTs = new Date(lastEvent.created_at).getTime()
  const elapsed = now - lastTs

  // Check weight-specific gap for more actionable insight
  const lastWeight = events.find((e) => isOneOf(e, FITNESS_WEIGHT_EVENTS))
  const lastTask = events.find((e) => isOneOf(e, WORK_DONE_EVENTS))

  if (elapsed < ONE_DAY) {
    const insight = lastWeight
      ? `Último registro: ${lastEvent.source === 'fitness' ? 'Fitness' : 'Work'} — todo en orden.`
      : 'Hay actividad hoy. Seguí el ritmo.'
    return {
      dayState: 'on-track',
      insight,
      ctaLabel: 'Ver dashboard fitness',
      ctaPath: '/fitness',
    }
  }

  if (elapsed < THREE_DAYS) {
    const days = Math.floor(elapsed / ONE_DAY)
    const src = lastEvent.source === 'fitness' ? 'peso' : 'trabajo'
    return {
      dayState: 'unstable',
      insight: `Hace ${days} ${days === 1 ? 'día' : 'días'} sin registrar ${src}.`,
      ctaLabel: lastTask ? 'Retomar trabajo' : 'Registrar peso',
      ctaPath: lastTask ? '/work' : '/fitness/tracking',
    }
  }

  const days = Math.floor(elapsed / ONE_DAY)
  return {
    dayState: 'disconnected',
    insight: `Hace ${days} días sin actividad. Volvé al sistema.`,
    ctaLabel: 'Planificar día',
    ctaPath: '/fitness/tracking',
  }
}

function getGreeting(name: string): string {
  const hour = new Date().getHours()
  const firstName = name?.trim().split(' ')[0] || ''
  const nameStr = firstName ? `, ${firstName}` : ''

  const morning = [
    `Buenos días${nameStr}. Empezá el día con todo.`,
    `Buenos días${nameStr}. Un día más para construir algo.`,
    `Buenos días${nameStr}. ¿Qué vas a lograr hoy?`,
  ]
  const afternoon = [
    `Buenas tardes${nameStr}. ¿Cómo viene el día?`,
    `Buenas tardes${nameStr}. Ya vas por la mitad, seguí.`,
    `Buenas tardes${nameStr}. Revisá tus prioridades.`,
  ]
  const evening = [
    `Buenas noches${nameStr}. ¿Cómo fue el día?`,
    `Buenas noches${nameStr}. Buen momento para reflexionar.`,
    `Buenas noches${nameStr}. Dejá todo listo para mañana.`,
  ]

  const pool = hour >= 5 && hour < 13 ? morning : hour >= 13 && hour < 20 ? afternoon : evening
  return pool[new Date().getDate() % pool.length]
}

const STATE_CONFIG: Record<DayState, { label: string; dot: string; border: string; badge: string }> = {
  'on-track': {
    label: 'En ritmo',
    dot: 'bg-success',
    border: 'border-success/30',
    badge: 'bg-success/10 text-success',
  },
  unstable: {
    label: 'Inestable',
    dot: 'bg-warning',
    border: 'border-warning/30',
    badge: 'bg-warning/10 text-warning',
  },
  disconnected: {
    label: 'Desconectado',
    dot: 'bg-danger',
    border: 'border-danger/30',
    badge: 'bg-danger/10 text-danger',
  },
}

export function SystemStatusHero() {
  const navigate = useNavigate()
  const profileName = useCoreStore((s) => s.profile.name)
  const [heroState, setHeroState] = useState<HeroState>({
    dayState: 'on-track',
    insight: 'Cargando estado del sistema…',
    ctaLabel: 'Ver fitness',
    ctaPath: '/fitness',
  })

  useEffect(() => {
    const load = () => {
      storageAPI
        .getRecentEvents(50)
        .then((events) => setHeroState(computeState(events)))
        .catch(() => {})
    }

    load()

    // Event persistence is async; delay slightly before re-reading SQLite.
    const delayedLoad = () => setTimeout(load, 60)
    const unsubs = [
      eventBus.on('FITNESS_WEIGHT_RECORDED', delayedLoad),
      eventBus.on('FITNESS_DAILY_ENTRY_SAVED', delayedLoad),
      eventBus.on('WORK_TASK_COMPLETED', delayedLoad),
      eventBus.on('WORK_TASK_CREATED', delayedLoad),
      eventBus.on('WORK_TASK_MOVED', delayedLoad),
      // backward compatibility if old events are still emitted in some places
      eventBus.on('WEIGHT_RECORDED', delayedLoad),
      eventBus.on('TASK_COMPLETED', delayedLoad),
      eventBus.on('TASK_CREATED', delayedLoad),
      eventBus.on('TASK_MOVED', delayedLoad),
    ]

    return () => unsubs.forEach((u) => u())
  }, [])

  const cfg = STATE_CONFIG[heroState.dayState]

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border ${cfg.border} bg-surface-light/90 p-6 shadow-2xl transition-all duration-300`}
    >
      {/* Background decoration */}
      <div className="absolute right-0 top-0 h-full w-1/3 opacity-20 pointer-events-none">
        <img src="/GRUPO.png" alt="" className="h-full w-full object-cover" />
      </div>

      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Left: status + insight */}
        <div className="min-w-0 space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Estado del Sistema</p>

          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${cfg.badge}`}>
              <span className={`h-2 w-2 rounded-full ${cfg.dot} animate-pulse`} />
              {cfg.label}
            </span>
          </div>

          <h1 className="text-2xl font-semibold leading-tight">{getGreeting(profileName)}</h1>
          <p className="max-w-xl text-sm text-muted">{heroState.insight}</p>
        </div>

        {/* Right: CTA */}
        <div className="shrink-0">
          <button
            onClick={() => navigate(heroState.ctaPath)}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-colors hover:bg-accent/80"
          >
            {heroState.ctaLabel} →
          </button>
        </div>
      </div>
    </section>
  )
}
