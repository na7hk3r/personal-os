# Sistema de Gamificación

## Visión general

El sistema de gamificación provee retroalimentación positiva al usuario por sus acciones en la aplicación. Está implementado en `src/core/gamification/gamificationStore.ts` y es accesible desde cualquier plugin via `api.gamification`.

## Mecánicas

### Puntos de experiencia (XP)

Cada acción relevante otorga o resta puntos. Los puntos se acumulan y **nunca se resetean** (el historial es permanente).

```
Nivel = floor(puntos_totales / 100) + 1
```

Por ejemplo: 250 puntos → Nivel 3 (con 50/100 hacia el nivel 4).

### Racha (streak)

Días consecutivos con al menos una acción registrada. Se muestra en la barra de gamificación del sidebar. La racha se guarda en el store en memoria (actualmente no persiste entre reinicios — oportunidad de mejora).

### Logros (achievements)

Los logros se desbloquean una sola vez y quedan marcados permanentemente. Cada logro tiene un ícono de Lucide React asociado.

## Tabla de XP por acción

| Fuente | Acción | XP |
|--------|--------|----|
| **Fitness** | Entrada diaria guardada | +5 |
| **Fitness** | Entrenamiento completado | +25 |
| **Work** | Tarea completada (movida a "Hecho") | +10 |
| **Work** | Sesión de foco completada | +5 |
| **Work** | Sesión de foco interrumpida | −2 |

## Logros disponibles

| ID | Ícono | Título | Condición |
|----|-------|--------|-----------|
| `first-entry` | `CheckCircle2` | Primer registro | 1 entrada total |
| `week-streak` | `Flame` | Racha semanal | 7 días de racha |
| `month-streak` | `Star` | Racha mensual | 30 días de racha |
| `centurion` | `Gem` | Centurión | 100 puntos totales |
| `workout-10` | `PersonStanding` | Deportista | 10 entrenamientos |
| `tasks-25` | `Target` | Productivo | 25 tareas completadas |

## API del store

```typescript
import { useGamificationStore } from '@core/gamification/gamificationStore'

const { points, level, streak, history, achievements, unlockedIds } = useGamificationStore()

// Agregar puntos (puede ser negativo)
useGamificationStore.getState().addPoints(10, 'Tarea completada')

// Actualizar racha
useGamificationStore.getState().setStreak(7)

// Desbloquear logro manualmente
useGamificationStore.getState().unlockAchievement('first-entry')

// Verificar logros por stats
useGamificationStore.getState().checkAchievements({
  totalEntries: 5,
  dailyStreak: 3,
  totalPoints: 150,
  totalWorkouts: 2,
  tasksCompleted: 1,
})
```

## API desde plugins

Usar `api.gamification` en `init()` o en handlers de eventos:

```typescript
// Sin verificación de logros
api.gamification.addPoints(5, 'Entrada diaria guardada')

// Con verificación de logros
api.gamification.addPoints(25, 'Entrenamiento completado')
// Internamente llama checkAchievements con stats actuales
```

## Historial de transacciones

Cada llamada a `addPoints` registra una entrada en el historial:

```typescript
interface XPEntry {
  amount: number    // puede ser negativo
  reason: string    // descripción legible
  date: string      // ISO 8601
}
```

El componente `GlobalProgress` muestra el historial agrupado por categoría (Fitness / Work / General) calculado a partir del campo `reason`.

## Componentes de UI

### `GamificationBar`

Barra compacta en el sidebar con nivel, puntos, racha y barra de progreso.

### `GlobalProgress`

Panel expandido en el Dashboard que incluye:
- Nivel y puntos totales
- Racha de días
- Barra de progreso con marcadores en 25/50/75%
- Desglose de XP por categoría (chips)
- Grid de todos los logros (grises si no desbloqueados)

## Extensión del sistema

Para añadir un nuevo logro:

1. Agregar la entrada en el array `DEFAULT_ACHIEVEMENTS` dentro de `gamificationStore.ts`.
2. Añadir el ícono correspondiente en `ACH_ICON_MAP` en `GlobalProgress.tsx`.
3. Agregar la condición en `checkAchievements()` dentro del store.

```typescript
// En gamificationStore.ts — DEFAULT_ACHIEVEMENTS:
{
  id: 'focus-master',
  title: 'Maestro del foco',
  description: 'Completá 20 sesiones de foco',
  icon: 'TimerReset',
  condition: (stats) => (stats.completedFocusSessions ?? 0) >= 20,
}
```
