# Sistema de Plugins

Guía complementaria obligatoria:
- [PLUGIN_BASE_STRUCTURE.md](PLUGIN_BASE_STRUCTURE.md) para plantilla base estandarizada e integración end-to-end.

## Estructura de un plugin

Un plugin es un objeto que implementa `PluginManifest` exportado desde `src/plugins/<nombre>/index.ts`.

```typescript
import type { PluginManifest } from '@core/types'

export const myPlugin: PluginManifest = {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  description: 'Descripción breve',
  icon: 'Boxes',                 // nombre del ícono Lucide

  migrations: [
    {
      version: 1,
      up: `CREATE TABLE IF NOT EXISTS my_items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );`,
    },
  ],

  widgets: [
    {
      id: 'my-widget',
      name: 'Mi widget',
      component: MyWidget,
    },
  ],

  pages: [
    {
      path: '/my-plugin',
      component: MyPage,
      label: 'Mi Plugin',
    },
  ],

  navItems: [
    {
      label: 'My Plugin',
      path: '/my-plugin',
      icon: 'Boxes',
      pluginId: 'my-plugin',
      order: 20,
    },
  ],

  events: {
    emits: ['MY_PLUGIN_ITEM_CREATED'],
    listens: ['CORE_PROFILE_UPDATED'],
  },

  async init(api) {
    // 1. Cargar datos desde SQLite
    const rows = await api.storage.query('SELECT * FROM my_items') as any[]
    useMyStore.getState().setItems(rows)

    // 2. Escuchar eventos
    api.events.on('MY_PLUGIN_ITEM_CREATED', () => {
      api.gamification.addPoints(5, 'Item creado')
    })
  },
}
```

## Registrar el plugin

En `src/App.tsx`, importar el manifest y llamar a `pluginManager.register()` antes de `initPlugin()`:

```typescript
import { myPlugin } from './plugins/my-plugin'

// dentro del useEffect de bootstrap:
pluginManager.register(myPlugin)
await pluginManager.initPlugin('my-plugin')
```

## CoreAPI de referencia

El objeto `api` disponible en `init()`:

### `api.storage`

| Método | Descripción |
|--------|-------------|
| `query<T>(sql, params?)` | SELECT. Devuelve `T[]` |
| `execute(sql, params?)` | INSERT / UPDATE / DELETE |
| `migrate(pluginId, migrations)` | Aplicar migraciones pendientes |

Las tablas y columnas accesibles deben estar declaradas en el allowlist de `StorageAPI.ts`.

### `api.events`

| Método | Descripción |
|--------|-------------|
| `emit(event, payload)` | Emite evento (persiste en events_log) |
| `on(event, handler)` | Suscribirse. Devuelve función de cleanup |
| `off(event, handler)` | Desuscribirse manualmente |

Los eventos se persisten automáticamente en la tabla `events_log`.

### `api.ui`

| Método | Descripción |
|--------|-------------|
| `registerWidget(def)` | Añade widget al Dashboard |
| `registerPage(def)` | Añade ruta al router |
| `registerNavItem(def)` | Añade ítem a la Sidebar |

### `api.gamification`

| Método | Descripción |
|--------|-------------|
| `addPoints(amount, reason)` | Suma/resta XP al usuario |
| `checkAchievement(stats)` | Verifica si corresponde desbloquear logros |

### `api.getProfile()`

Devuelve el `UserProfile` actual: `{ name, height, age, startDate, weightGoal }`.

## Convenciones de nombres

| Elemento | Convención | Ejemplo |
|----------|------------|---------|
| Plugin ID | kebab-case | `my-plugin` |
| Tablas SQL | snake_case con prefijo | `my_plugin_items` |
| Eventos | SCREAMING_SNAKE con prefijo | `MY_PLUGIN_ITEM_CREATED` |
| Store Zustand | `useMyPluginStore` | `useMyStore` |
| Archivos de eventos | `events.ts` en raíz del plugin | `MY_EVENTS.ITEM_CREATED` |

## Migraciones

Las migraciones son **idempotentes** — se aplican una sola vez y se trackean en `_migrations(plugin_id, version)`.

```typescript
migrations: [
  { version: 1, up: 'CREATE TABLE …' },
  { version: 2, up: 'ALTER TABLE my_items ADD COLUMN priority INTEGER DEFAULT 0' },
]
```

- `version` debe ser entero positivo creciente.
- Solo se ejecutan versiones no aplicadas previamente.
- Se ejecutan en transacción — si falla, se hace rollback.
- El SQL de `up` puede contener múltiples statements separados por `;`.

## Añadir columnas al allowlist de StorageAPI

Para que `StorageAPI` permita acceso a la nueva tabla, añadir la entrada en `src/core/storage/StorageAPI.ts`:

```typescript
const ALLOWED_TABLES: Record<string, Set<string>> = {
  // … tablas existentes …
  my_plugin_items: new Set(['id', 'title', 'priority', 'created_at']),
}
```

## Plugins incluidos

### fitness
- **ID**: `fitness`
- **Tablas**: `fitness_daily_entries`, `fitness_measurements`
- **Páginas**: `/fitness`, `/fitness/tracking`, `/fitness/measurements`
- **Eventos emitidos**: ver [EVENTS.md](EVENTS.md#fitness)
- **Configuración centralizada en core**: `settings['pluginSettings:fitness']`

### work
- **ID**: `work`
- **Tablas**: `work_boards`, `work_columns`, `work_cards`, `work_notes`, `work_links`, `work_focus_sessions`
- **Páginas**: `/work`
- **Eventos emitidos**: ver [EVENTS.md](EVENTS.md#work)
- **Focus Engine**: sesión activa global con `pause`/`resume` reales (`paused_at`, `paused_total`), switch limpio (<1 min descarta sin XP penalty), cleanup automático de sesiones zombie (>8h), y Pomodoro con objetivo configurable y notificación nativa del SO.
- **Tarjetas enriquecidas** (v7): `priority` (low/medium/high/urgent), `estimate_minutes`, `checklist` (JSON), `archived` + `archived_at` (auto-archivado en Done >7 días sin actividad).
- **Columnas**: edición inline (renombrar) + `wip_limit` con indicador visual.
- **Configuración centralizada en core**: `settings['pluginSettings:work']`
- **Quick action**: escucha `core:focus-request` desde la barra global del Core para iniciar foco libre.

## Configuración por plugin desde el core

Desde `Control Center`, el core permite guardar preferencias por plugin sin modificar código del plugin:

- `pluginSettings:fitness`:
  - entrenos/semana
  - sueño objetivo
  - límite de cigarrillos
  - objetivo de comidas
  - recordatorio de mediciones

- `pluginSettings:work`:
  - duración de foco y break
  - alerta de vencimiento
  - límite WIP
  - vista predeterminada de tablero

Estas preferencias se guardan en `settings` y pueden ser consumidas por componentes/plugins para ajustar su comportamiento.

Regla de visibilidad en `Control Center`:

- Si un plugin está desactivado, su bloque de configuración no se renderiza.
- Si no hay plugins activos con configuración, la sección completa desaparece.

## Capa visual premium de plugins

Las páginas de plugins comparten una base visual premium desde `src/index.css`:

- `plugin-shell`: contenedor con animación de entrada.
- `plugin-shell-fitness`: atmósfera visual fitness (verde/teal).
- `plugin-shell-work`: atmósfera visual work (cian/azul).
- `plugin-panel`: paneles con hover y transición consistentes.

Esto permite que cada plugin tenga identidad propia sin perder coherencia con la app principal.
