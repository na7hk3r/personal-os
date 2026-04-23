import { eventBus } from '@core/events/EventBus'
import { WORK_EVENTS } from './events'
import { useWorkStore } from './store'
import type { FocusSession } from './types'

/**
 * Duración mínima (ms) para que una sesión descartada al cambiar de tarea
 * cuente como sesión real. Por debajo de este umbral se borra sin penalizar.
 */
const MIN_VALID_SESSION_MS = 60_000

function getCurrentTimestamp() {
  return Date.now()
}

async function persistFocusSession(session: FocusSession) {
  if (!window.storage) return

  await window.storage.execute(
    `INSERT INTO work_focus_sessions (id, task_id, start_time, end_time, duration, interrupted, paused_at, paused_total)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      session.id,
      session.taskId,
      session.startTime,
      session.endTime ?? null,
      session.duration ?? null,
      session.interrupted ? 1 : 0,
      session.pausedAt ?? null,
      session.pausedTotal ?? 0,
    ],
  )
}

async function updatePersistedFocusSession(session: FocusSession) {
  if (!window.storage) return

  await window.storage.execute(
    `UPDATE work_focus_sessions
     SET task_id = ?, end_time = ?, duration = ?, interrupted = ?, paused_at = ?, paused_total = ?
     WHERE id = ?`,
    [
      session.taskId,
      session.endTime ?? null,
      session.duration ?? null,
      session.interrupted ? 1 : 0,
      session.pausedAt ?? null,
      session.pausedTotal ?? 0,
      session.id,
    ],
  )
}

async function deletePersistedFocusSession(id: string) {
  if (!window.storage) return
  await window.storage.execute(`DELETE FROM work_focus_sessions WHERE id = ?`, [id])
}

/**
 * Tiempo efectivo (sin pausas) de una sesión en curso o finalizada.
 */
export function getEffectiveDuration(session: FocusSession, now: number = Date.now()): number {
  const end = session.endTime ?? now
  const gross = Math.max(0, end - session.startTime)
  const pausedTotal = session.pausedTotal ?? 0
  const pausedOngoing = session.pausedAt ? Math.max(0, now - session.pausedAt) : 0
  return Math.max(0, gross - pausedTotal - pausedOngoing)
}

export async function startWorkFocusSession(taskId: string | null) {
  const store = useWorkStore.getState()
  const currentSession = store.currentFocusSession

  // Mismo target: si está pausada la reanudamos; si no, no-op.
  if (currentSession && currentSession.taskId === taskId) {
    if (currentSession.pausedAt) {
      await resumeWorkFocusSession()
    }
    return currentSession
  }

  const previousTaskId = currentSession?.taskId ?? null

  // Switch limpio: cerrar la sesión actual sin penalizar.
  //   - Si la sesión lleva ≥ 1 min de tiempo efectivo, la cerramos como COMPLETED.
  //   - Si lleva menos, la descartamos (no cuenta como interrupción).
  if (currentSession) {
    const effectiveMs = getEffectiveDuration(currentSession)

    if (effectiveMs >= MIN_VALID_SESSION_MS) {
      await finalizeCurrentSession({ interrupted: false, silent: true })
    } else {
      // Descarte silencioso
      store.finishFocusSession(currentSession.id, {
        endTime: getCurrentTimestamp(),
        duration: 0,
      })
      // Quitar del store y de la DB
      useWorkStore.setState((s) => ({
        focusSessions: s.focusSessions.filter((entry) => entry.id !== currentSession.id),
      }))
      await deletePersistedFocusSession(currentSession.id)
    }
  }

  const session: FocusSession = {
    id: crypto.randomUUID(),
    taskId,
    startTime: getCurrentTimestamp(),
    interrupted: false,
    pausedAt: null,
    pausedTotal: 0,
  }

  store.startFocusSession(session)
  await persistFocusSession(session)

  if (taskId) {
    eventBus.emit(WORK_EVENTS.TASK_STARTED, { taskId, sessionId: session.id })
  }

  if (previousTaskId && taskId && previousTaskId !== taskId) {
    eventBus.emit(WORK_EVENTS.TASK_SWITCHED, {
      fromTaskId: previousTaskId,
      toTaskId: taskId,
      sessionId: session.id,
    })
  }

  eventBus.emit(WORK_EVENTS.FOCUS_STARTED, { sessionId: session.id, taskId })

  return session
}

/**
 * Pausa la sesión activa sin cerrarla ni penalizar XP.
 */
export async function pauseWorkFocusSession() {
  const store = useWorkStore.getState()
  const currentSession = store.currentFocusSession
  if (!currentSession || currentSession.pausedAt) return null

  const pausedAt = getCurrentTimestamp()
  const updated: FocusSession = { ...currentSession, pausedAt }

  store.finishFocusSession(currentSession.id, { pausedAt })
  // finishFocusSession setea currentFocusSession=null cuando id coincide; lo
  // volvemos a apuntar porque sigue siendo la sesión activa (solo pausada).
  useWorkStore.setState({ currentFocusSession: updated })

  await updatePersistedFocusSession(updated)
  eventBus.emit(WORK_EVENTS.FOCUS_PAUSED, {
    sessionId: updated.id,
    taskId: updated.taskId,
  })
  return updated
}

/**
 * Reanuda una sesión previamente pausada, sumando el tiempo pausado al total.
 */
export async function resumeWorkFocusSession() {
  const store = useWorkStore.getState()
  const currentSession = store.currentFocusSession
  if (!currentSession || !currentSession.pausedAt) return null

  const now = getCurrentTimestamp()
  const pausedDelta = Math.max(0, now - currentSession.pausedAt)
  const updated: FocusSession = {
    ...currentSession,
    pausedAt: null,
    pausedTotal: (currentSession.pausedTotal ?? 0) + pausedDelta,
  }

  useWorkStore.setState((s) => ({
    currentFocusSession: updated,
    focusSessions: s.focusSessions.map((session) => (session.id === updated.id ? updated : session)),
  }))

  await updatePersistedFocusSession(updated)
  eventBus.emit(WORK_EVENTS.FOCUS_RESUMED, {
    sessionId: updated.id,
    taskId: updated.taskId,
  })
  return updated
}

interface FinalizeOptions {
  interrupted: boolean
  /** Si es true, NO emite el evento COMPLETED/INTERRUPTED (usado por switch limpio). */
  silent?: boolean
}

async function finalizeCurrentSession(opts: FinalizeOptions) {
  const store = useWorkStore.getState()
  const currentSession = store.currentFocusSession
  if (!currentSession) return null

  const endTime = getCurrentTimestamp()
  // Si estaba pausada al cerrar, cerramos también la pausa en curso.
  const pausedOngoing = currentSession.pausedAt ? Math.max(0, endTime - currentSession.pausedAt) : 0
  const pausedTotal = (currentSession.pausedTotal ?? 0) + pausedOngoing
  const duration = Math.max(0, endTime - currentSession.startTime - pausedTotal)

  const completedSession: FocusSession = {
    ...currentSession,
    endTime,
    duration,
    interrupted: opts.interrupted,
    pausedAt: null,
    pausedTotal,
  }

  store.finishFocusSession(currentSession.id, completedSession)
  await updatePersistedFocusSession(completedSession)

  if (!opts.silent) {
    eventBus.emit(
      opts.interrupted ? WORK_EVENTS.FOCUS_INTERRUPTED : WORK_EVENTS.FOCUS_COMPLETED,
      {
        sessionId: completedSession.id,
        taskId: completedSession.taskId,
        duration,
      },
    )
  }

  return completedSession
}

export async function completeWorkFocusSession() {
  return finalizeCurrentSession({ interrupted: false })
}

export async function interruptWorkFocusSession() {
  return finalizeCurrentSession({ interrupted: true })
}

