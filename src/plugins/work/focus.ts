import { eventBus } from '@core/events/EventBus'
import { WORK_EVENTS } from './events'
import { useWorkStore } from './store'
import type { FocusSession } from './types'

function getCurrentTimestamp() {
  return Date.now()
}

async function persistFocusSession(session: FocusSession) {
  if (!window.storage) return

  await window.storage.execute(
    `INSERT INTO work_focus_sessions (id, task_id, start_time, end_time, duration, interrupted)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      session.id,
      session.taskId,
      session.startTime,
      session.endTime ?? null,
      session.duration ?? null,
      session.interrupted ? 1 : 0,
    ],
  )
}

async function updatePersistedFocusSession(session: FocusSession) {
  if (!window.storage) return

  await window.storage.execute(
    `UPDATE work_focus_sessions
     SET task_id = ?, end_time = ?, duration = ?, interrupted = ?
     WHERE id = ?`,
    [session.taskId, session.endTime ?? null, session.duration ?? null, session.interrupted ? 1 : 0, session.id],
  )
}

export async function startWorkFocusSession(taskId: string | null) {
  const store = useWorkStore.getState()
  const currentSession = store.currentFocusSession

  if (currentSession && currentSession.taskId === taskId) {
    return currentSession
  }

  const previousTaskId = currentSession?.taskId ?? null
  if (currentSession) {
    await interruptWorkFocusSession()
  }

  const session: FocusSession = {
    id: crypto.randomUUID(),
    taskId,
    startTime: getCurrentTimestamp(),
    interrupted: false,
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

async function finalizeCurrentSession(interrupted: boolean) {
  const store = useWorkStore.getState()
  const currentSession = store.currentFocusSession
  if (!currentSession) return null

  const endTime = getCurrentTimestamp()
  const duration = Math.max(0, endTime - currentSession.startTime)
  const completedSession: FocusSession = {
    ...currentSession,
    endTime,
    duration,
    interrupted,
  }

  store.finishFocusSession(currentSession.id, completedSession)
  await updatePersistedFocusSession(completedSession)

  eventBus.emit(
    interrupted ? WORK_EVENTS.FOCUS_INTERRUPTED : WORK_EVENTS.FOCUS_COMPLETED,
    {
      sessionId: completedSession.id,
      taskId: completedSession.taskId,
      duration,
    },
  )

  return completedSession
}

export async function completeWorkFocusSession() {
  return finalizeCurrentSession(false)
}

export async function interruptWorkFocusSession() {
  return finalizeCurrentSession(true)
}
