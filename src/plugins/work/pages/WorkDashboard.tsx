import { useEffect, useMemo, useState } from 'react'
import { storageAPI } from '@core/storage/StorageAPI'
import type { EventLogEntry } from '@core/types'
import { eventBus } from '@core/events/EventBus'
import { useWorkStore } from '../store'
import {
  completeWorkFocusSession,
  getEffectiveDuration,
  interruptWorkFocusSession,
  pauseWorkFocusSession,
  resumeWorkFocusSession,
  startWorkFocusSession,
} from '../focus'
import { WORK_EVENTS } from '../events'
import { KanbanBoard } from '../components/KanbanBoard'
import { ClipboardList, ListChecks, NotebookPen, TimerReset, Play, Pause, Square, XCircle } from 'lucide-react'

const WORK_ACTIVITY_EVENTS: Set<string> = new Set([
  WORK_EVENTS.TASK_CREATED,
  WORK_EVENTS.TASK_UPDATED,
  WORK_EVENTS.TASK_COMPLETED,
  WORK_EVENTS.TASK_DELETED,
  WORK_EVENTS.TASK_MOVED,
  WORK_EVENTS.TASK_STARTED,
  WORK_EVENTS.TASK_SWITCHED,
  WORK_EVENTS.FOCUS_STARTED,
  WORK_EVENTS.FOCUS_PAUSED,
  WORK_EVENTS.FOCUS_RESUMED,
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
  [WORK_EVENTS.FOCUS_PAUSED]: 'Foco pausado',
  [WORK_EVENTS.FOCUS_RESUMED]: 'Foco reanudado',
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
  // Objetivo de Pomodoro en minutos (persistido en localStorage).
  const [pomodoroGoalMin, setPomodoroGoalMin] = useState<number>(() => {
    if (typeof window === 'undefined') return 25
    const raw = window.localStorage.getItem('work.pomodoroGoalMin')
    const n = raw ? Number.parseInt(raw, 10) : NaN
    return Number.isFinite(n) && n > 0 ? n : 25
  })
  // Evita notificar varias veces por la misma sesión.
  const [notifiedSessionId, setNotifiedSessionId] = useState<string | null>(null)
  const totalCards = cards.length
  const totalNotes = notes.length

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('work.pomodoroGoalMin', String(pomodoroGoalMin))
  }, [pomodoroGoalMin])

  // Solicitar permiso de notificación una única vez.
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!currentFocusSession || currentFocusSession.pausedAt) return undefined

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
      return sum + getEffectiveDuration(session, now)
    }, 0)
    const completedSessions = sessionsToday.filter((session) => session.endTime && !session.interrupted).length
    const efficiency = sessionsToday.length === 0 ? 0 : Math.round((completedSessions / sessionsToday.length) * 100)

    return {
      sessionsToday,
      totalFocusMs,
      efficiency,
    }
  }, [focusSessions, now])

  const activeTasks = useMemo(() => {
    const inProgressColumnIds = new Set(
      columns.filter((column) => /progreso|progress/i.test(column.name) || column.id === 'col-progress').map((column) => column.id),
    )

    return cards
      .filter((card) => inProgressColumnIds.has(card.columnId))
      .sort((a, b) => a.position - b.position)
      .slice(0, 5)
  }, [cards, columns])

  const isPaused = Boolean(currentFocusSession?.pausedAt)
  const currentDuration = currentFocusSession ? getEffectiveDuration(currentFocusSession, now) : 0
  const pomodoroGoalMs = pomodoroGoalMin * 60_000
  const pomodoroProgress = pomodoroGoalMs > 0 ? Math.min(1, currentDuration / pomodoroGoalMs) : 0
  const remainingMs = Math.max(0, pomodoroGoalMs - currentDuration)

  // Dispara notificación + auto-complete cuando se alcanza el objetivo.
  useEffect(() => {
    if (!currentFocusSession || isPaused) return
    if (pomodoroGoalMs <= 0) return
    if (currentDuration < pomodoroGoalMs) return
    if (notifiedSessionId === currentFocusSession.id) return

    setNotifiedSessionId(currentFocusSession.id)
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const title = currentTask?.title ?? 'Foco libre'
        new Notification('Pomodoro completado 🎯', {
          body: `${pomodoroGoalMin} min logrados en "${title}". ¡Buen trabajo!`,
          silent: false,
        })
      }
    } catch {
      // Notifications bloqueadas en Electron — ignorar silenciosamente.
    }
    void completeWorkFocusSession()
  }, [currentFocusSession, currentDuration, pomodoroGoalMs, pomodoroGoalMin, isPaused, notifiedSessionId, currentTask])

  return (
    <div className="plugin-shell plugin-shell-work space-y-6">
      <section className="plugin-panel rounded-2xl p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Now Panel</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              {currentTask?.title ?? (currentFocusSession ? 'Foco libre en curso' : 'Sin foco activo')}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              {!currentFocusSession
                ? 'Elegí una tarea desde el tablero o iniciá una sesión libre para activar el motor de ejecución.'
                : isPaused
                  ? 'Sesión pausada. Reanudá para seguir sumando tiempo efectivo.'
                  : `Corriendo desde ${new Date(currentFocusSession.startTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}.`}
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 rounded-2xl border border-border/70 bg-surface px-4 py-3 lg:min-w-[320px]">
            <div className="flex items-center justify-between w-full gap-2 text-xs uppercase tracking-[0.2em] text-muted">
              <span className="flex items-center gap-2">
                <TimerReset size={14} />
                Tiempo efectivo {isPaused && <span className="text-warning">(pausado)</span>}
              </span>
              <label className="flex items-center gap-1 normal-case tracking-normal text-[11px]">
                Meta
                <select
                  value={pomodoroGoalMin}
                  onChange={(e) => setPomodoroGoalMin(Number.parseInt(e.target.value, 10))}
                  className="rounded bg-surface-light border border-border px-1 py-0.5 text-xs text-white focus:border-accent/60 focus:outline-none"
                >
                  <option value={15}>15m</option>
                  <option value={25}>25m</option>
                  <option value={45}>45m</option>
                  <option value={60}>60m</option>
                  <option value={90}>90m</option>
                </select>
              </label>
            </div>
            <p className={`text-3xl font-semibold tabular-nums ${isPaused ? 'text-warning' : 'text-white'}`}>
              {formatDuration(currentDuration)}
            </p>
            {currentFocusSession && (
              <div className="w-full">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-light">
                  <div
                    className={`h-full transition-all duration-500 ${
                      pomodoroProgress >= 1 ? 'bg-success' : 'bg-accent'
                    }`}
                    style={{ width: `${pomodoroProgress * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-muted">
                  {pomodoroProgress >= 1
                    ? `✓ Meta alcanzada (${pomodoroGoalMin}m)`
                    : `Faltan ${formatDuration(remainingMs)} para la meta`}
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {!currentFocusSession && (
                <button
                  onClick={() => startWorkFocusSession(null)}
                  className="inline-flex items-center gap-2 rounded-xl border border-accent/30 px-3 py-2 text-sm text-accent-light transition-colors hover:bg-accent/10"
                >
                  <Play size={14} />
                  Start
                </button>
              )}
              {currentFocusSession && isPaused && (
                <button
                  onClick={() => resumeWorkFocusSession()}
                  className="inline-flex items-center gap-2 rounded-xl border border-accent/30 px-3 py-2 text-sm text-accent-light transition-colors hover:bg-accent/10"
                >
                  <Play size={14} />
                  Resume
                </button>
              )}
              {currentFocusSession && !isPaused && (
                <button
                  onClick={() => pauseWorkFocusSession()}
                  className="inline-flex items-center gap-2 rounded-xl border border-warning/30 px-3 py-2 text-sm text-warning transition-colors hover:bg-warning/10"
                >
                  <Pause size={14} />
                  Pause
                </button>
              )}
              <button
                onClick={() => completeWorkFocusSession()}
                disabled={!currentFocusSession}
                title="Finalizar y contar como sesión completada"
                className="inline-flex items-center gap-2 rounded-xl border border-success/30 px-3 py-2 text-sm text-success transition-colors hover:bg-success/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Square size={14} />
                Stop
              </button>
              <button
                onClick={() => interruptWorkFocusSession()}
                disabled={!currentFocusSession}
                title="Abandonar sesión (cuenta como interrumpida)"
                className="inline-flex items-center gap-2 rounded-xl border border-danger/30 px-3 py-2 text-sm text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <XCircle size={14} />
                Cancel
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="plugin-panel p-4">
          <p className="text-xs text-muted mb-1 flex items-center gap-1.5">
            <ClipboardList size={14} />
            Tableros
          </p>
          <p className="text-2xl font-bold">{boards.length}</p>
        </div>
        <div className="plugin-panel p-4">
          <p className="text-xs text-muted mb-1 flex items-center gap-1.5">
            <ListChecks size={14} />
            Tareas
          </p>
          <p className="text-2xl font-bold">{totalCards}</p>
        </div>
        <div className="plugin-panel p-4">
          <p className="text-xs text-muted mb-1 flex items-center gap-1.5">
            <NotebookPen size={14} />
            Notas
          </p>
          <p className="text-2xl font-bold">{totalNotes}</p>
        </div>
        <div className="plugin-panel p-4">
          <p className="text-xs text-muted mb-1 flex items-center gap-1.5">
            <TimerReset size={14} />
            Foco hoy
          </p>
          <p className="text-2xl font-bold">{formatDuration(todayMetrics.totalFocusMs)}</p>
          <p className="mt-1 text-xs text-muted">{todayMetrics.sessionsToday.length} sesiones, {todayMetrics.efficiency}% eficiencia</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Tablero principal</h3>
        <KanbanBoard />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="plugin-panel rounded-2xl p-5">
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

        <section className="plugin-panel rounded-2xl p-5">
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
    </div>
  )
}
