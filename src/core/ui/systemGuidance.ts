import { CORE_EVENTS } from '@core/events/events'
import { eventBus } from '@core/events/EventBus'
import type { EventLogEntry } from '@core/types'

export interface GuidanceSuggestion {
  id: string
  message: string
  ctaLabel: string
  ctaPath: string
  type: 'info' | 'warning' | 'positive'
}

export type HeroDayState = 'on-track' | 'unstable' | 'disconnected'

export interface GuidanceHeroState {
  dayState: HeroDayState
  insight: string
  ctaLabel: string
  ctaPath: string
}

const ONE_DAY = 86_400_000
const THREE_DAYS = ONE_DAY * 3

const WEIGHT_EVENTS = new Set(['WEIGHT_RECORDED', 'FITNESS_WEIGHT_RECORDED'])
const TASK_CREATED_EVENTS = new Set(['TASK_CREATED', 'WORK_TASK_CREATED'])
const TASK_COMPLETED_EVENTS = new Set(['TASK_COMPLETED', 'WORK_TASK_COMPLETED'])
const DAILY_ENTRY_EVENTS = new Set(['DAILY_ENTRY_SAVED', 'FITNESS_DAILY_ENTRY_SAVED'])

function hasType(eventType: string, values: Set<string>): boolean {
  return values.has(eventType)
}

function findLast(events: EventLogEntry[], types: Set<string>): EventLogEntry | undefined {
  return events.find((e) => hasType(e.event_type, types))
}

function getElapsedMs(entry?: EventLogEntry): number | null {
  if (!entry) return null
  return Date.now() - new Date(entry.created_at).getTime()
}

export function buildSystemSuggestions(
  events: EventLogEntry[],
  activePluginIds: string[],
): GuidanceSuggestion[] {
  const suggestions: GuidanceSuggestion[] = []
  const active = new Set(activePluginIds)

  if (active.size === 0) {
    return [
      {
        id: 'activate-plugin',
        message: 'No hay módulos activos. Activá al menos uno para comenzar.',
        ctaLabel: 'Ir al Control Center',
        ctaPath: '/control',
        type: 'warning',
      },
    ]
  }

  if (active.has('fitness')) {
    const lastWeight = findLast(events, WEIGHT_EVENTS)
    const weightElapsed = getElapsedMs(lastWeight)
    const lastDailyEntry = findLast(events, DAILY_ENTRY_EVENTS)
    const dailyElapsed = getElapsedMs(lastDailyEntry)

    if (!lastWeight) {
      suggestions.push({
        id: 'no-weight',
        message: 'No hay registro de peso. Cargá el primero para iniciar el seguimiento.',
        ctaLabel: 'Registrar peso',
        ctaPath: '/fitness/tracking',
        type: 'warning',
      })
    } else if (weightElapsed !== null && weightElapsed >= THREE_DAYS) {
      const days = Math.floor(weightElapsed / ONE_DAY)
      suggestions.push({
        id: 'weight-gap',
        message: `Hace ${days} días que no registrás tu peso.`,
        ctaLabel: 'Registrar peso',
        ctaPath: '/fitness/tracking',
        type: 'warning',
      })
    } else if (!lastDailyEntry || (dailyElapsed !== null && dailyElapsed >= ONE_DAY)) {
      suggestions.push({
        id: 'daily-entry-next',
        message: 'Próximo paso: completá tu entrada diaria de Fitness.',
        ctaLabel: 'Completar entrada',
        ctaPath: '/fitness/tracking',
        type: 'info',
      })
    }
  }

  if (active.has('work')) {
    const lastTaskCreated = findLast(events, TASK_CREATED_EVENTS)
    const lastTaskCompleted = findLast(events, TASK_COMPLETED_EVENTS)
    const completedElapsed = getElapsedMs(lastTaskCompleted)

    if (!lastTaskCreated) {
      suggestions.push({
        id: 'create-first-task',
        message: 'No hay tareas creadas en Work. Definí la primera tarea del día.',
        ctaLabel: 'Crear tarea',
        ctaPath: '/work',
        type: 'info',
      })
    } else if (!lastTaskCompleted) {
      suggestions.push({
        id: 'complete-first-task',
        message: 'Tenés tareas cargadas. Siguiente paso: completar una.',
        ctaLabel: 'Ver tareas',
        ctaPath: '/work',
        type: 'info',
      })
    } else if (completedElapsed !== null && completedElapsed >= THREE_DAYS) {
      const days = Math.floor(completedElapsed / ONE_DAY)
      suggestions.push({
        id: 'task-gap',
        message: `Hace ${days} días sin completar tareas en Work.`,
        ctaLabel: 'Retomar Work',
        ctaPath: '/work',
        type: 'warning',
      })
    }
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: 'all-good',
      message: 'Todo activo y en orden. No hay sugerencias pendientes.',
      ctaLabel: 'Ver dashboard',
      ctaPath: '/',
      type: 'positive',
    })
  }

  return suggestions.slice(0, 3)
}

export function computeHeroState(
  events: EventLogEntry[],
  suggestions: GuidanceSuggestion[],
  activePluginIds: string[],
): GuidanceHeroState {
  const lastEvent = events[0]
  const elapsed = lastEvent ? Date.now() - new Date(lastEvent.created_at).getTime() : null
  const firstActionable = suggestions.find((s) => s.type !== 'positive')

  if (activePluginIds.length === 0) {
    return {
      dayState: 'disconnected',
      insight: 'Sistema sin módulos activos. Activá Fitness o Work para operar.',
      ctaLabel: 'Activar módulos',
      ctaPath: '/control',
    }
  }

  if (firstActionable) {
    return {
      dayState: !elapsed || elapsed >= THREE_DAYS ? 'disconnected' : 'unstable',
      insight: firstActionable.message,
      ctaLabel: firstActionable.ctaLabel,
      ctaPath: firstActionable.ctaPath,
    }
  }

  if (!elapsed || elapsed >= THREE_DAYS) {
    const days = elapsed ? Math.floor(elapsed / ONE_DAY) : 0
    return {
      dayState: 'unstable',
      insight:
        days > 0
          ? `Todo activo y OK, pero hace ${days} días sin actividad registrada.`
          : 'Todo activo y OK. Sin sugerencias pendientes.',
      ctaLabel: 'Revisar dashboard',
      ctaPath: '/',
    }
  }

  return {
    dayState: 'on-track',
    insight: 'Todo activo y OK. Sin sugerencias pendientes.',
    ctaLabel: 'Seguir monitoreando',
    ctaPath: '/',
  }
}

export function subscribeGuidanceRefresh(onRefresh: () => void): Array<() => void> {
  const delayedRefresh = () => setTimeout(onRefresh, 60)

  return [
    eventBus.on('FITNESS_WEIGHT_RECORDED', delayedRefresh),
    eventBus.on('FITNESS_DAILY_ENTRY_SAVED', delayedRefresh),
    eventBus.on('WORK_TASK_COMPLETED', delayedRefresh),
    eventBus.on('WORK_TASK_CREATED', delayedRefresh),
    eventBus.on('WORK_TASK_MOVED', delayedRefresh),
    eventBus.on(CORE_EVENTS.PLUGIN_ACTIVATED, onRefresh),
    eventBus.on(CORE_EVENTS.PLUGIN_DEACTIVATED, onRefresh),
    // Compatibilidad con eventos legacy
    eventBus.on('WEIGHT_RECORDED', delayedRefresh),
    eventBus.on('DAILY_ENTRY_SAVED', delayedRefresh),
    eventBus.on('TASK_COMPLETED', delayedRefresh),
    eventBus.on('TASK_CREATED', delayedRefresh),
    eventBus.on('TASK_MOVED', delayedRefresh),
  ]
}