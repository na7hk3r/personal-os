# Catálogo de eventos

Los eventos se emiten a través del `EventBus` singleton. Cada evento se persiste en la tabla `events_log` automáticamente cuando tiene `source` explícito o cuando el `EventBus` puede inferirlo por prefijo (`FITNESS_`, `WORK_`, `CORE_`, `GAMIFICATION_`).

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
| `WORK_EVENTS.FOCUS_COMPLETED` | `WORK_FOCUS_COMPLETED` | Sesión finalizada correctamente | `{ sessionId, taskId, duration }` |
| `WORK_EVENTS.FOCUS_INTERRUPTED` | `WORK_FOCUS_INTERRUPTED` | Sesión interrumpida | `{ sessionId, taskId, duration }` |

### Eventos de contenido

| Constante | Valor | Descripción | Payload |
|-----------|-------|-------------|---------|
| `WORK_EVENTS.NOTE_CREATED` | `WORK_NOTE_CREATED` | Nueva nota creada | `{ id }` |

### Efecto en gamificación

| Evento | XP |
|--------|----|
| `WORK_TASK_COMPLETED` | +10 |
| `WORK_FOCUS_COMPLETED` | +5 |
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
