# Catálogo de eventos

Los eventos se emiten a través del `EventBus` singleton. Cada evento se persiste en la tabla `events_log` automáticamente cuando tiene `source` explícito o cuando el `EventBus` puede inferirlo por prefijo (`FITNESS_`, `WORK_`, `FINANCE_`, `HABITS_`, `JOURNAL_`, `GOALS_`, `KNOWLEDGE_`, `TIME_`, `CORE_`, `GAMIFICATION_`).

## Eventos del sistema core

Definidos en `src/core/events/events.ts`.

### `CORE_EVENTS`

| Evento | Descripción | Payload |
|--------|-------------|---------|
| `CORE_PROFILE_UPDATED` | Perfil del usuario actualizado | `{ name?, height?, age?, … }` |
| `CORE_PLUGIN_ACTIVATED` | Plugin activado | `{ pluginId: string }` |
| `CORE_PLUGIN_DEACTIVATED` | Plugin desactivado | `{ pluginId: string }` |
| `CORE_ONBOARDING_COMPLETED` | Onboarding completado | `{ profile: UserProfile }` |
| `CORE_SETTINGS_UPDATED` | Ajustes actualizados | `{ theme: string, sidebarCollapsed: boolean }` |
| `CORE_PLANNER_TASK_COMPLETED` | Misión del Planner core completada | `{ taskId, title, complexity, xp, date }` |

### `GAMIFICATION_EVENTS`

| Evento | Descripción | Payload |
|--------|-------------|---------|
| `GAMIFICATION_POINTS_ADDED` | XP sumado o restado | `{ amount: number, reason: string, total: number }` |
| `GAMIFICATION_ACHIEVEMENT_UNLOCKED` | Logro desbloqueado | `{ id: string, title: string }` |
| `GAMIFICATION_LEVEL_UP` | Subió de nivel | `{ level: number }` |

---

## Eventos del plugin Fitness

Definidos en `src/plugins/fitness/events.ts`.

| Constante | Valor | Descripción | Payload |
|-----------|-------|-------------|---------|
| `FITNESS_EVENTS.WEIGHT_RECORDED` | `FITNESS_WEIGHT_RECORDED` | Peso registrado | `{ date: string, weight: number }` |
| `FITNESS_EVENTS.MEAL_LOGGED` | `FITNESS_MEAL_LOGGED` | Comida registrada | `{ date: string, meal: string }` |
| `FITNESS_EVENTS.WORKOUT_COMPLETED` | `FITNESS_WORKOUT_COMPLETED` | Entrenamiento completado | `{ date: string, type: 'A' \| 'B' }` |
| `FITNESS_EVENTS.DAILY_ENTRY_SAVED` | `FITNESS_DAILY_ENTRY_SAVED` | Entrada diaria guardada | `{ date: string }` |
| `FITNESS_EVENTS.MEASUREMENT_SAVED` | `FITNESS_MEASUREMENT_SAVED` | Medida corporal guardada | `{ date: string }` |

### Efecto en gamificación

| Evento | XP |
|--------|----|
| `FITNESS_DAILY_ENTRY_SAVED` | +5 |
| `FITNESS_WORKOUT_COMPLETED` | +25 |

---

## Eventos del plugin Work

Definidos en `src/plugins/work/events.ts`.

### Eventos de tareas

| Constante | Valor | Descripción | Payload |
|-----------|-------|-------------|---------|
| `WORK_EVENTS.TASK_CREATED` | `WORK_TASK_CREATED` | Nueva tarjeta creada | `{ taskId, title, columnId }` |
| `WORK_EVENTS.TASK_UPDATED` | `WORK_TASK_UPDATED` | Tarjeta editada y guardada | `{ taskId, title, description }` |
| `WORK_EVENTS.TASK_COMPLETED` | `WORK_TASK_COMPLETED` | Tarjeta movida a columna "Hecho" | `{ taskId, title, columnId }` |
| `WORK_EVENTS.TASK_DELETED` | `WORK_TASK_DELETED` | Tarjeta eliminada | `{ taskId }` |
| `WORK_EVENTS.TASK_BLOCKED` | `WORK_TASK_BLOCKED` | Tarea marcada como bloqueada | `{ taskId }` |
| `WORK_EVENTS.TASK_STARTED` | `WORK_TASK_STARTED` | Tarea puesta en foco | `{ taskId, sessionId }` |
| `WORK_EVENTS.TASK_SWITCHED` | `WORK_TASK_SWITCHED` | Cambio de tarea en foco | `{ fromTaskId, toTaskId, sessionId }` |
| `WORK_EVENTS.TASK_MOVED` | `WORK_TASK_MOVED` | Tarjeta movida entre columnas | `{ cardId, fromColumn, toColumn }` |

### Eventos de sesiones de foco

| Constante | Valor | Descripción | Payload |
|-----------|-------|-------------|---------|
| `WORK_EVENTS.FOCUS_STARTED` | `WORK_FOCUS_STARTED` | Sesión de foco iniciada | `{ sessionId, taskId }` |
| `WORK_EVENTS.FOCUS_PAUSED` | `WORK_FOCUS_PAUSED` | Sesión pausada (no penaliza XP) | `{ sessionId, taskId }` |
| `WORK_EVENTS.FOCUS_RESUMED` | `WORK_FOCUS_RESUMED` | Sesión reanudada | `{ sessionId, taskId }` |
| `WORK_EVENTS.FOCUS_COMPLETED` | `WORK_FOCUS_COMPLETED` | Sesión finalizada correctamente | `{ sessionId, taskId, duration }` |
| `WORK_EVENTS.FOCUS_INTERRUPTED` | `WORK_FOCUS_INTERRUPTED` | Sesión interrumpida | `{ sessionId, taskId, duration }` |

> Nota: cambiar de tarea con menos de 1 minuto de foco efectivo descarta la sesión silenciosamente (sin emitir evento ni alterar XP).

### Eventos del Core escuchados por Work

| Evento | Origen | Descripción |
|--------|--------|-------------|
| `core:focus-request` | `QuickActionsBar` | Solicita iniciar una sesión de foco libre. Work la ignora si ya hay una sesión activa. |

### Eventos de contenido

| Constante | Valor | Descripción | Payload |
|-----------|-------|-------------|---------|
| `WORK_EVENTS.NOTE_CREATED` | `WORK_NOTE_CREATED` | Nueva nota creada | `{ id }` |

### Efecto en gamificación

| Evento | XP |
|--------|----|
| `WORK_TASK_COMPLETED` | +10 |
| `WORK_FOCUS_COMPLETED` | +5 |
| `WORK_NOTE_CREATED` | +3 |
| `WORK_FOCUS_PAUSED` / `WORK_FOCUS_RESUMED` | 0 (pausa neutral) |
| Switch limpio (<1 min) | 0 (descarte silencioso) |
| `WORK_FOCUS_INTERRUPTED` | −2 |
| `CORE_PLANNER_TASK_COMPLETED` | +XP según complejidad (5/10/16) |

---

## Flujo de eventos: sesión de foco

```
startWorkFocusSession(taskId)
  ├─ [si hay sesión activa con distinto taskId]
  │     WORK_FOCUS_INTERRUPTED  ─────────────────────► gamification: -2 XP
  ├─ WORK_TASK_STARTED          { taskId, sessionId }
  ├─ [si se cambió de tarea]
  │     WORK_TASK_SWITCHED      { fromTaskId, toTaskId, sessionId }
  └─ WORK_FOCUS_STARTED         { sessionId, taskId }

completeWorkFocusSession()
  └─ WORK_FOCUS_COMPLETED       { sessionId, taskId, duration } ► gamification: +5 XP

interruptWorkFocusSession()
  └─ WORK_FOCUS_INTERRUPTED     { sessionId, taskId, duration } ► gamification: -2 XP
```

## Flujo de eventos: drag a columna "Hecho"

```
KanbanBoard.handleDragEnd()
  ├─ WORK_TASK_MOVED            { cardId, fromColumn, toColumn }
  └─ [si toColumn es done]
        WORK_TASK_COMPLETED     { taskId, title, columnId } ────► gamification: +10 XP
```

---

## Eventos del plugin Finance

Definidos en `src/plugins/finance/events.ts`. Prefijo: `FINANCE_`.

| Constante | Descripción | Payload |
|-----------|-------------|---------|
| `FINANCE_EVENTS.ACCOUNT_CREATED` | Cuenta creada | `{ accountId, name, type, currency }` |
| `FINANCE_EVENTS.ACCOUNT_UPDATED` | Cuenta actualizada | `{ accountId }` |
| `FINANCE_EVENTS.ACCOUNT_ARCHIVED` | Cuenta archivada | `{ accountId }` |
| `FINANCE_EVENTS.CATEGORY_CREATED` | Categoría creada | `{ categoryId, name, kind }` |
| `FINANCE_EVENTS.CATEGORY_UPDATED` | Categoría actualizada | `{ categoryId }` |
| `FINANCE_EVENTS.CATEGORY_DELETED` | Categoría eliminada | `{ categoryId }` |
| `FINANCE_EVENTS.TRANSACTION_CREATED` | Transacción registrada | `{ transactionId, amount, currency, kind }` |
| `FINANCE_EVENTS.TRANSACTION_UPDATED` | Transacción editada | `{ transactionId }` |
| `FINANCE_EVENTS.TRANSACTION_DELETED` | Transacción eliminada | `{ transactionId }` |
| `FINANCE_EVENTS.TRANSFER_CREATED` | Transferencia entre cuentas | `{ fromAccountId, toAccountId, amount }` |
| `FINANCE_EVENTS.RECURRING_CREATED` | Recurrente creada | `{ recurringId, cadence }` |
| `FINANCE_EVENTS.RECURRING_UPDATED` | Recurrente editada | `{ recurringId }` |
| `FINANCE_EVENTS.RECURRING_RUN` | Motor RRULE-light ejecutó una ocurrencia | `{ recurringId, transactionId }` |
| `FINANCE_EVENTS.RECURRING_DELETED` | Recurrente eliminada | `{ recurringId }` |
| `FINANCE_EVENTS.BUDGET_CREATED` | Presupuesto creado | `{ budgetId, categoryId, amount }` |
| `FINANCE_EVENTS.BUDGET_UPDATED` | Presupuesto actualizado | `{ budgetId }` |
| `FINANCE_EVENTS.ANOMALY_DETECTED` | `detectAnomaly` flagueó una transacción | `{ transactionId, reason }` |

### Efecto en gamificación

| Evento | XP |
|--------|----|
| `FINANCE_TRANSACTION_CREATED` | +2 |
| `FINANCE_RECURRING_CREATED` | +5 |
| `FINANCE_BUDGET_CREATED` | +5 |

---

## Eventos del plugin Habits

Definidos en `src/plugins/habits/events.ts`. Prefijo: `HABITS_`.

| Constante | Descripción | Payload |
|-----------|-------------|---------|
| `HABITS_EVENTS.HABIT_CREATED` | Hábito creado | `{ habitId, name, frequencyType }` |
| `HABITS_EVENTS.HABIT_UPDATED` | Hábito editado | `{ habitId }` |
| `HABITS_EVENTS.HABIT_ARCHIVED` | Hábito archivado | `{ habitId }` |
| `HABITS_EVENTS.HABIT_LOGGED` | Log diario registrado | `{ habitId, date, value }` |
| `HABITS_EVENTS.HABIT_UNLOGGED` | Log diario revertido | `{ habitId, date }` |
| `HABITS_EVENTS.GOAL_MET` | Meta del período cumplida (filo de cumplimiento) | `{ habitId, period }` |
| `HABITS_EVENTS.STREAK_BROKEN` | Racha rota | `{ habitId, lostStreak }` |

### Efecto en gamificación

| Evento | XP |
|--------|----|
| `HABITS_HABIT_LOGGED` | +2 |
| `HABITS_GOAL_MET` | +5 |

---

## Eventos del plugin Journal

Definidos en `src/plugins/journal/events.ts`. Prefijo: `JOURNAL_`.

| Constante | Descripción | Payload |
|-----------|-------------|---------|
| `JOURNAL_EVENTS.ENTRY_CREATED` | Entrada nueva (1 por día) | `{ entryId, date }` |
| `JOURNAL_EVENTS.ENTRY_UPDATED` | Entrada editada | `{ entryId }` |
| `JOURNAL_EVENTS.ENTRY_DELETED` | Entrada eliminada (con undo 5s) | `{ entryId }` |
| `JOURNAL_EVENTS.ENTRY_PINNED` | Entrada fijada / desfijada | `{ entryId, pinned }` |
| `JOURNAL_EVENTS.MOOD_LOGGED` | Mood registrado (1–5) | `{ entryId, mood }` |

### Efecto en gamificación

| Evento | XP |
|--------|----|
| `JOURNAL_ENTRY_CREATED` | +5 |
| `JOURNAL_ENTRY_UPDATED` | +2 |
| `JOURNAL_MOOD_LOGGED` | +1 |

---

## Eventos del plugin Goals

Definidos en `src/plugins/goals/events.ts`. Prefijo: `GOALS_`.

| Constante | Descripción | Payload |
|-----------|-------------|---------|
| `GOALS_EVENTS.GOAL_CREATED` | Objetivo creado | `{ goalId, period, year }` |
| `GOALS_EVENTS.GOAL_UPDATED` | Objetivo editado | `{ goalId }` |
| `GOALS_EVENTS.GOAL_COMPLETED` | Objetivo completado | `{ goalId, title }` |
| `GOALS_EVENTS.GOAL_ARCHIVED` | Objetivo archivado | `{ goalId }` |
| `GOALS_EVENTS.KR_CREATED` | Key Result creado | `{ krId, goalId, source }` |
| `GOALS_EVENTS.KR_UPDATED` | KR editado | `{ krId }` |
| `GOALS_EVENTS.KR_PROGRESS` | `current_value` actualizado (manual o vía `syncMetricBackedKRs`) | `{ krId, value }` |
| `GOALS_EVENTS.KR_COMPLETED` | KR alcanzó el `target_value` | `{ krId, goalId }` |
| `GOALS_EVENTS.KR_DELETED` | KR eliminado | `{ krId }` |
| `GOALS_EVENTS.MILESTONE_ADDED` | Hito registrado | `{ milestoneId, krId, value }` |

### Efecto en gamificación

| Evento | XP |
|--------|----|
| `GOALS_KR_COMPLETED` | +20 |
| `GOALS_GOAL_COMPLETED` | +100 |

---

## Eventos del plugin Knowledge

Definidos en `src/plugins/knowledge/events.ts`. Prefijo: `KNOWLEDGE_`.

| Constante | Descripción | Payload |
|-----------|-------------|---------|
| `KNOWLEDGE_EVENTS.RESOURCE_CREATED` | Recurso creado | `{ resourceId, type, title }` |
| `KNOWLEDGE_EVENTS.RESOURCE_UPDATED` | Recurso editado o progreso 0–100 actualizado | `{ resourceId }` |
| `KNOWLEDGE_EVENTS.RESOURCE_FINISHED` | Recurso marcado como terminado | `{ resourceId }` |
| `KNOWLEDGE_EVENTS.RESOURCE_DELETED` | Recurso eliminado (cascade a highlights) | `{ resourceId }` |
| `KNOWLEDGE_EVENTS.HIGHLIGHT_ADDED` | Highlight capturado | `{ highlightId, resourceId }` |
| `KNOWLEDGE_EVENTS.HIGHLIGHT_DELETED` | Highlight eliminado | `{ highlightId }` |
| `KNOWLEDGE_EVENTS.FLASHCARD_CREATED` | Flashcard creada | `{ flashcardId }` |
| `KNOWLEDGE_EVENTS.FLASHCARD_REVIEWED` | Tarjeta repasada (algoritmo SM-2 actualiza ease/interval/repetitions/next_review) | `{ flashcardId, quality }` |
| `KNOWLEDGE_EVENTS.FLASHCARD_DELETED` | Flashcard eliminada | `{ flashcardId }` |
| `KNOWLEDGE_EVENTS.STUDY_SESSION_STARTED` | Sesión de repaso iniciada | `{ sessionId, dueCount }` |
| `KNOWLEDGE_EVENTS.STUDY_SESSION_COMPLETED` | Sesión finalizada | `{ sessionId, reviewedCount }` |

### Efecto en gamificación

| Evento | XP |
|--------|----|
| `KNOWLEDGE_HIGHLIGHT_ADDED` | +3 |
| `KNOWLEDGE_FLASHCARD_REVIEWED` | +2 |
| `KNOWLEDGE_RESOURCE_FINISHED` | +15 |

---

## Eventos del plugin Tiempo

Definidos en `src/plugins/time/events.ts`. Prefijo: `TIME_`.

| Constante | Descripción | Payload |
|-----------|-------------|---------|
| `TIME_EVENTS.PROJECT_CREATED` | Proyecto creado | `{ projectId, name, hourlyRate }` |
| `TIME_EVENTS.PROJECT_UPDATED` | Proyecto editado | `{ projectId }` |
| `TIME_EVENTS.PROJECT_DELETED` | Proyecto eliminado (entries quedan con `projectId = null`) | `{ projectId }` |
| `TIME_EVENTS.ENTRY_STARTED` | Cronómetro arrancado (single-running guard detiene el activo) | `{ entryId, projectId }` |
| `TIME_EVENTS.ENTRY_STOPPED` | Cronómetro detenido | `{ entryId, durationSec, source }` |
| `TIME_EVENTS.ENTRY_CREATED` | Entry manual o auto creada (`source` = `manual` o `focus`) | `{ entryId, source }` |
| `TIME_EVENTS.ENTRY_UPDATED` | Entry editada | `{ entryId }` |
| `TIME_EVENTS.ENTRY_DELETED` | Entry eliminada | `{ entryId }` |

### Eventos escuchados

| Evento | Origen | Descripción |
|--------|--------|-------------|
| `WORK_FOCUS_COMPLETED` | plugin Work | Crea automáticamente una `time_entry` con `source='focus'` y `durationMin` del payload. |

### Efecto en gamificación

| Evento | XP |
|--------|----|
| `TIME_ENTRY_STOPPED` (≥5 min) | +2 |

---

## Escuchar eventos desde un plugin

```typescript
// dentro de plugin.init(api):
api.events.on(WORK_EVENTS.TASK_COMPLETED, (payload) => {
  // payload está tipado como unknown — hacer type guard
  const { taskId } = payload as { taskId: string }
  api.gamification.addPoints(10, `Tarea ${taskId} completada`)
})
```

## Escuchar eventos desde un componente React

```typescript
import { eventBus } from '@core/events/EventBus'
import { WORK_EVENTS } from '../events'

useEffect(() => {
  const unsub = eventBus.on(WORK_EVENTS.FOCUS_COMPLETED, () => {
    // re-fetch o actualizar estado local
  })
  return unsub  // cleanup automático al desmontar
}, [])
```

## Eventos consumidos por la UI del dashboard

- `RecentActivityFeed` muestra actividad reciente de `fitness`, `work` y `core` persistida en `events_log`.
- `SystemStatusHero` y `SystemSuggestions` reaccionan a:
  - eventos de Fitness (`FITNESS_WEIGHT_RECORDED`, `FITNESS_DAILY_ENTRY_SAVED`)
  - eventos de Work (`WORK_TASK_CREATED`, `WORK_TASK_COMPLETED`, `WORK_TASK_MOVED`)
  - eventos core de activación/desactivación de plugins
- Guardar perfil o preferencias desde Control Center emite eventos core para que el dashboard refleje el cambio en tiempo real.
- Completar tareas en Planner core también emite eventos core para timeline y misión diaria.
