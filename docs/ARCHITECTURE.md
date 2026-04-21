# Arquitectura del sistema

## Visión general

Personal OS sigue una arquitectura de **kernel + plugins** donde un núcleo (`core/`) provee servicios compartidos y los plugins se registran en tiempo de build para extender la funcionalidad.

```
┌─────────────────────────────────────────────────────────┐
│                    Electron Main Process                │
│  ┌─────────────────┐   ┌──────────────────────────────┐ │
│  │ DatabaseService │   │    Storage IPC Handlers      │ │
│  │  (SQLite WAL)   │◄──│  query / execute / migrate   │ │
│  └─────────────────┘   └──────────────────────────────┘ │
└───────────────────────────────┬─────────────────────────┘
                    IPC (context bridge)
┌───────────────────────────────▼─────────────────────────┐
│                  Renderer Process (React)                │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │                     CORE                        │   │
│  │  EventBus ◄─── PluginManager ────► CoreAPI      │   │
│  │     │               │                │          │   │
│  │  coreStore    Plugin Registry   StorageAPI      │   │
│  │  gamifStore       Shell UI                      │   │
│  └──────────────────────────────────────────────────┘   │
│                         │                               │
│  ┌──────────────────────▼──────────────────────────┐   │
│  │                   PLUGINS                       │   │
│  │   fitness/       work/       (futuros…)         │   │
│  │   store.ts       store.ts                       │   │
│  │   index.ts       index.ts                       │   │
│  │   components/    components/                    │   │
│  │   pages/         pages/                         │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Proceso de arranque

```
App.tsx
  1. loadFromStorage()         → carga perfil, ajustes, plugins activos desde SQLite
  2. gamificationStore.loadFromStorage() → restaura puntos, nivel, racha, historial y logros
  3. import fitness plugin     → registra manifest en PluginRegistry
  4. import work plugin        → registra manifest en PluginRegistry
  5. pluginManager.initPlugin('fitness')
       → runMigrations (v1)
       → builds CoreAPI
       → plugin.init(api)
           → api.storage.query('SELECT * FROM fitness_daily_entries …')
           → store.setEntries(…)
           → api.events.on(FITNESS_EVENTS.DAILY_ENTRY_SAVED, …)
  6. pluginManager.initPlugin('work')    [mismo patrón]
  7. coreStore.setActivePlugins([…])
  8. setReady(true)  → renderiza Shell + rutas
```

## Capas del sistema

### 1. Proceso principal (Electron Main)

- `main.ts` — Crea la BrowserWindow, inicia `DatabaseService`, registra IPC.
- `preload.ts` — Expone `window.storage` (query/execute/migrate) via `contextBridge`. No expone ninguna otra API de Node.
- `services/database.ts` — Singleton `DatabaseService`. Abre/crea el archivo SQLite en `userData/data/personal-os.db`, activa WAL y foreign keys, crea el schema core.
- `services/storage-ipc.ts` — Tres handlers IPC con validación estricta de SQL. Toda operación debe pasar el filtro de tipo (SELECT-only para query, INSERT/UPDATE/DELETE para execute).

### 2. Core — EventBus

`EventBus` es un singleton pub/sub en memoria con las siguientes características:

- Registro de handlers por nombre de evento.
- Historial en memoria de los últimos 100 eventos.
- Callback de persistencia configurable: cuando PluginManager conecta el EventBus al `events_log` de SQLite, cada `emit()` se persiste automáticamente.
- Inferencia de `source` por prefijo (`FITNESS_`, `WORK_`, `CORE_`, `GAMIFICATION_`) cuando el emisor no lo especifica manualmente.
- Devuelve función de cleanup (`UnsubscribeFn`) en cada `on()`.

```typescript
eventBus.emit('WORK_TASK_CREATED', { taskId: '…' })
const unsub = eventBus.on('WORK_TASK_CREATED', (payload) => { … })
unsub()  // cleanup
```

### 3. Core — PluginManager

Responsable de:

1. **Registrar** manifests (`register(manifest)`).
2. **Inicializar** plugins: ejecuta migraciones, construye `CoreAPI` con scope del plugin, llama `plugin.init(api)`.
3. **Registrar UI**: widgets, páginas y nav items que los plugins declaran en su manifest.
4. **Desactivar** plugins: remueve UI registrada, llama `plugin.deactivate?.()`.
5. **Proveer listas activas**: `getActiveWidgets()`, `getActivePages()`, `getActiveNavItems()`.

### 4. Core — CoreAPI

Interfaz inyectada en cada plugin al hacer `init(api)`. Provee:

```typescript
interface CoreAPI {
  storage: {
    query<T>(sql, params?): Promise<T[]>
    execute(sql, params?): Promise<{ changes, lastInsertRowid }>
    migrate(pluginId, migrations): Promise<void>
  }
  events: {
    emit(event, payload): void
    on(event, handler): UnsubscribeFn
    off(event, handler): void
  }
  ui: {
    registerWidget(def: WidgetDefinition): void
    registerPage(def: PageDefinition): void
    registerNavItem(def: NavItemDefinition): void
  }
  getProfile(): UserProfile
  gamification: {
    addPoints(amount: number, reason: string): void
    checkAchievement(stats): void
  }
}
```

### 5. Core — Estado global (Zustand)

#### `coreStore`
- Perfil de usuario (`name`, `height`, `age`, `startDate`, `weightGoal`).
- Ajustes (`theme`, `sidebarCollapsed`).
- Lista de plugins activos.
- Flag `onboardingComplete`.
- Persistencia a/desde SQLite.

#### `gamificationStore`
- Puntos totales, nivel calculado (puntos / 100 + 1), racha de días.
- Historial de transacciones de puntos.
- Logros desbloqueados.
- Persistencia del snapshot en `settings.gamificationState`.
- `addPoints(amount, reason)` actualiza nivel, emite eventos y guarda el snapshot persistido.

### 6. Storage API

`StorageAPI` es un wrapper de conveniencia sobre `window.storage` que:

- Valida que la tabla esté en el allowlist.
- Valida que las columnas en INSERT/UPDATE estén en el allowlist de esa tabla.
- Limita lecturas a 500 filas como máximo.
- Provee helpers: `getAll`, `getById`, `insert`, `update`, `deleteRow`, `logEvent`, `getRecentEvents`.

### 7. Plugins

Cada plugin es un módulo TypeScript que exporta un `PluginManifest`. Internamente los plugins pueden tener:

- `store.ts` — Zustand store local (datos en memoria, cargados desde SQLite en `init`).
- `types.ts` — Tipos de dominio.
- `events.ts` — Constantes de eventos con prefijo del plugin.
- `components/` — Componentes React de UI.
- `pages/` — Páginas completas montadas por el router.

### 8. Capa de dashboard

El dashboard principal combina componentes del core y widgets de plugins:

- `SystemStatusHero` y `SystemSuggestions` consumen una lógica compartida (`systemGuidance.ts`) para derivar estado, próximo paso y situación `todo activo y OK`.
- `RecentActivityFeed` consulta `events_log` y se refresca con eventos persistidos del sistema.
- Los widgets principales del dashboard pueden reordenarse condicionalmente para optimizar distribución visual, como ocurre con `KPIs Fitness` + `Resumen Trabajo` junto al feed de actividad.

## Flujo de datos típico

```
Usuario interactúa (ej. drag card a columna "Hecho")
  │
  ▼
KanbanBoard.handleDragEnd()
  ├─ store.moveCard(cardId, toColumnId, position)    [estado Zustand]
  ├─ window.storage.execute('UPDATE work_cards …')   [SQLite]
  ├─ eventBus.emit(WORK_EVENTS.TASK_MOVED, {…})      [EventBus]
  └─ if isDoneColumn → eventBus.emit(WORK_EVENTS.TASK_COMPLETED, {…})
                           │
                           ▼
                     PluginManager persistence callback
                           │
                           ▼
                     INSERT INTO events_log
                           │
                           ▼
                     Listener en index.ts
                           │
                           ▼
                     api.gamification.addPoints(10, '…')
                           │
                           ▼
                     gamificationStore.addPoints()
                           │
                           ▼
                     GamificationBar re-renderiza
```

## Temas visuales

El sistema soporta 5 temas configurados con CSS variables en `src/index.css`:

| Clave | Descripción |
|-------|-------------|
| `default` | Oscuro con acentos violeta/azul |
| `light` | Claro |
| `cyberpunk` | Neón amarillo sobre negro |
| `calma` | Tonos suaves azul/verde |
| `bosque` | Verdes naturales |

El tema se aplica via atributo `data-theme` en el elemento raíz y `Shell.tsx` lo sincroniza con el `coreStore`.

## Seguridad del IPC

Todos los datos que fluyen entre el renderer y el main process pasan por validación en `storage-ipc.ts`:

1. **Tipo de SQL**: query solo acepta SELECT/WITH/PRAGMA; execute solo INSERT/UPDATE/DELETE.
2. **Statement único**: se rechaza SQL con múltiples sentencias.
3. **Parámetros tipados**: deben ser array de primitivos.
4. **PluginId**: solo alfanumérico + guiones + underscores.
5. **Versiones de migración**: enteros positivos.

El renderer nunca puede ejecutar SQL arbitrario ni acceder al filesystem directamente.
