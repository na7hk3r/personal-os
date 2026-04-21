import { useEffect, useMemo, useState } from 'react'
import { storageAPI } from '@core/storage/StorageAPI'
import type { EventLogEntry } from '@core/types'
import { eventBus } from '@core/events/EventBus'
import { useWorkStore } from '../store'
import { completeWorkFocusSession, interruptWorkFocusSession, startWorkFocusSession } from '../focus'
import { WORK_EVENTS } from '../events'
import { KanbanBoard } from '../components/KanbanBoard'
import { ClipboardList, ListChecks, NotebookPen, TimerReset, Play, Pause, Square } from 'lucide-react'

const WORK_ACTIVITY_EVENTS: Set<string> = new Set([
  WORK_EVENTS.TASK_CREATED,
  WORK_EVENTS.TASK_UPDATED,
  WORK_EVENTS.TASK_COMPLETED,
  WORK_EVENTS.TASK_DELETED,
  WORK_EVENTS.TASK_MOVED,
  WORK_EVENTS.TASK_STARTED,
  WORK_EVENTS.TASK_SWITCHED,
  WORK_EVENTS.FOCUS_STARTED,
  WORK_EVENTS.FOCUS_COMPLETED,
  WORK_EVENTS.FOCUS_INTERRUPTED,
  WORK_EVENTS.NOTE_CREATED,
])

const EVENT_LABELS: Record<string, string> = {
  [WORK_EVENTS.TASK_CREATED]: 'Nueva tarea creada',
  [WORK_EVENTS.TASK_UPDATED]: 'Tarea actualizada',
  [WORK_EVENTS.TASK_COMPLETED]: 'Tarea completada',
  [WORK_EVENTS.TASK_DELETED]: 'Tarea eliminada',
  [WORK_EVENTS.TASK_MOVED]: 'Tarea movida',
  [WORK_EVENTS.TASK_STARTED]: 'Tarea iniciada',
  [WORK_EVENTS.TASK_SWITCHED]: 'Cambio de tarea',
  [WORK_EVENTS.FOCUS_STARTED]: 'Foco iniciado',
  [WORK_EVENTS.FOCUS_COMPLETED]: 'Foco completado',
  [WORK_EVENTS.FOCUS_INTERRUPTED]: 'Foco interrumpido',
  [WORK_EVENTS.NOTE_CREATED]: 'Nota creada',
}

function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatRelative(timestamp: string) {
  const elapsedMs = Date.now() - new Date(timestamp).getTime()
  const minutes = Math.max(1, Math.floor(elapsedMs / 60_000))
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  return `hace ${Math.floor(hours / 24)} d`
}

export function WorkDashboard() {
  const { boards, columns, cards, notes, focusSessions, currentFocusSession } = useWorkStore()
  const [now, setNow] = useState(Date.now())
  const [recentEvents, setRecentEvents] = useState<EventLogEntry[]>([])
  const totalCards = cards.length
  const totalNotes = notes.length

  useEffect(() => {
    if (!currentFocusSession) return undefined

    const intervalId = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [currentFocusSession])

  useEffect(() => {
    const loadRecentEvents = () => {
      storageAPI
        .getRecentEvents(40)
        .then((events) => {
          setRecentEvents(
            events.filter((entry) => entry.source === 'work' || WORK_ACTIVITY_EVENTS.has(entry.event_type)).slice(0, 5),
          )
        })
        .catch(() => {})
    }

    loadRecentEvents()

    const unsubscribes = Array.from(WORK_ACTIVITY_EVENTS).map((eventName) =>
      eventBus.on(eventName, loadRecentEvents),
    )

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe())
    }
  }, [])

  const currentTask = currentFocusSession
    ? cards.find((card) => card.id === currentFocusSession.taskId) ?? null
    : null

  const todayMetrics = useMemo(() => {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const sessionsToday = focusSessions.filter((session) => session.startTime >= startOfDay.getTime())
    const totalFocusMs = sessionsToday.reduce((sum, session) => {
      const duration = session.duration ?? ((session.id === currentFocusSession?.id ? now : session.startTime) - session.startTime)
      return sum + Math.max(0, duration)
    }, 0)
    const completedSessions = sessionsToday.filter((session) => session.endTime && !session.interrupted).length
    const efficiency = sessionsToday.length === 0 ? 0 : Math.round((completedSessions / sessionsToday.length) * 100)

    return {
      sessionsToday,
      totalFocusMs,
      efficiency,
    }
  }, [currentFocusSession?.id, focusSessions, now])

  const activeTasks = useMemo(() => {
    const inProgressColumnIds = new Set(
      columns.filter((column) => /progreso|progress/i.test(column.name) || column.id === 'col-progress').map((column) => column.id),
    )

    return cards
      .filter((card) => inProgressColumnIds.has(card.columnId))
      .sort((a, b) => a.position - b.position)
      .slice(0, 5)
  }, [cards, columns])

  const currentDuration = currentFocusSession ? now - currentFocusSession.startTime : 0

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-surface-light/90 p-5 shadow-lg shadow-black/20">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Now Panel</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              {currentTask?.title ?? (currentFocusSession ? 'Foco libre en curso' : 'Sin foco activo')}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              {currentFocusSession
                ? `Corriendo desde ${new Date(currentFocusSession.startTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}.`
                : 'Elegí una tarea desde el tablero o iniciá una sesión libre para activar el motor de ejecución.'}
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 rounded-2xl border border-border/70 bg-surface px-4 py-3 lg:min-w-[280px]">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted">
              <TimerReset size={14} />
              Tiempo activo
            </div>
            <p className="text-3xl font-semibold tabular-nums text-white">{formatDuration(currentDuration)}</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => startWorkFocusSession(null)}
                disabled={Boolean(currentFocusSession)}
                className="inline-flex items-center gap-2 rounded-xl border border-accent/30 px-3 py-2 text-sm text-accent-light transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play size={14} />
                Start
              </button>
              <button
                onClick={() => interruptWorkFocusSession()}
                disabled={!currentFocusSession}
                className="inline-flex items-center gap-2 rounded-xl border border-warning/30 px-3 py-2 text-sm text-warning transition-colors hover:bg-warning/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Pause size={14} />
                Pause
              </button>
              <button
                onClick={() => completeWorkFocusSession()}
                disabled={!currentFocusSession}
                className="inline-flex items-center gap-2 rounded-xl border border-success/30 px-3 py-2 text-sm text-success transition-colors hover:bg-success/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Square size={14} />
                Stop
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="bg-surface-light rounded-xl border border-border p-4">
          <p className="text-xs text-muted mb-1 flex items-center gap-1.5">
            <ClipboardList size={14} />
            Tableros
          </p>
          <p className="text-2xl font-bold">{boards.length}</p>
        </div>
        <div className="bg-surface-light rounded-xl border border-border p-4">
          <p className="text-xs text-muted mb-1 flex items-center gap-1.5">
            <ListChecks size={14} />
            Tareas
          </p>
          <p className="text-2xl font-bold">{totalCards}</p>
        </div>
        <div className="bg-surface-light rounded-xl border border-border p-4">
          <p className="text-xs text-muted mb-1 flex items-center gap-1.5">
            <NotebookPen size={14} />
            Notas
          </p>
          <p className="text-2xl font-bold">{totalNotes}</p>
        </div>
        <div className="bg-surface-light rounded-xl border border-border p-4">
          <p className="text-xs text-muted mb-1 flex items-center gap-1.5">
            <TimerReset size={14} />
            Foco hoy
          </p>
          <p className="text-2xl font-bold">{formatDuration(todayMetrics.totalFocusMs)}</p>
          <p className="mt-1 text-xs text-muted">{todayMetrics.sessionsToday.length} sesiones, {todayMetrics.efficiency}% eficiencia</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-border bg-surface-light/80 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Active Tasks</p>
              <h3 className="mt-1 text-lg font-semibold text-white">Tareas en progreso</h3>
            </div>
            <span className="rounded-full bg-surface px-2 py-1 text-xs text-muted">{activeTasks.length}</span>
          </div>

          <div className="mt-4 space-y-3">
            {activeTasks.length === 0 && (
              <div className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-sm text-muted">
                No hay tareas en progreso. Iniciá una desde el tablero para activar el flujo.
              </div>
            )}

            {activeTasks.map((card) => (
              <div
                key={card.id}
                className={`rounded-xl border px-4 py-3 ${currentFocusSession?.taskId === card.id ? 'border-success/40 bg-success/5' : 'border-border bg-surface'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{card.title}</p>
                    {card.description && <p className="mt-1 text-xs text-muted">{card.description}</p>}
                  </div>
                  <button
                    onClick={() => startWorkFocusSession(card.id)}
                    className="rounded-full border border-accent/30 px-3 py-1 text-xs text-accent-light transition-colors hover:bg-accent/10"
                  >
                    {currentFocusSession?.taskId === card.id ? 'En foco' : 'Focus'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface-light/80 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Recent Work Activity</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Actividad reciente</h3>

          <div className="mt-4 space-y-3">
            {recentEvents.length === 0 && (
              <div className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-sm text-muted">
                Todavía no hay actividad registrada para work.
              </div>
            )}

            {recentEvents.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-border bg-surface px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-white">{EVENT_LABELS[entry.event_type] ?? entry.event_type}</p>
                  <span className="text-xs text-muted">{formatRelative(entry.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Tablero principal</h3>
        <KanbanBoard />
      </div>
    </div>
  )
}
