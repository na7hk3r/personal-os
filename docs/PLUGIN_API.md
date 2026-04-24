# Plugin API — Personal OS

Esta guía documenta la superficie del CoreAPI que reciben los plugins en su `init(api)`.

> Última actualización: v1.5.0

## 1. Manifiesto

Cada plugin exporta un `PluginManifest` (ver `src/core/types.ts`):

```ts
export const myPlugin: PluginManifest = {
  id: 'mi-plugin',          // kebab-case, único, prefijo de tablas SQLite
  name: 'Mi Plugin',
  version: '1.0.0',
  description: '…',
  icon: '🧩',
  navItems: [{ id, label, path, icon }],
  pages: [{ id, path, component, title, pluginId }],
  async init(api) { /* registro de listeners, migraciones, etc. */ },
  async deactivate(api) { /* cleanup opcional */ },
}
```

## 2. Storage (SQLite local)

`api.storage` (alias de `window.storage`) expone:

| Método | Descripción |
| --- | --- |
| `query<T>(sql, params?)` | SELECT, devuelve filas tipadas |
| `execute(sql, params?)` | INSERT/UPDATE/DELETE |
| `migrate(pluginId, sqlBatch)` | Aplica DDL. **Debe** prefijarse con `<pluginId>_` |
| `getSetting(key)` / `setSetting(key, value)` | Settings clave/valor |
| `getRecentEvents(limit?)` | Eventos persistidos del EventBus |

Reglas:

- Las tablas del plugin se llaman `<pluginId>_<tabla>` (ej. `finanzas_movimientos`).
- Para tablas core (`core_*`) usá los servicios listados en §6, no SQL crudo.
- El allowlist de columnas se aplica solo a helpers; `query/execute` aceptan SQL parametrizado.

## 3. EventBus

`api.events` (`eventBus`) provee pub/sub global con persistencia opcional:

```ts
const off = api.events.on('FITNESS_WORKOUT_COMPLETED', (payload) => { /* … */ })
api.events.emit('MI_EVENTO', { foo: 1 }, { source: 'mi-plugin', persist: true })
```

Eventos core: ver `src/core/events/events.ts` (`CORE_EVENTS`, `GAMIFICATION_EVENTS`).

Convención: nombres `MAYUS_CON_GUION_BAJO`. Si el evento es del plugin, prefijalo (`FINANZAS_*`).

## 4. UI — Navegación y páginas

Se registran vía manifiesto. Para inyectar widgets en el dashboard u otras zonas, usar `api.ui.registerWidget` (si está disponible en tu versión). Cada nav item soporta `parentId` para anidamiento visual.

## 5. Gamificación

```ts
import { useGamificationStore } from '@core/gamification/gamificationStore'
useGamificationStore.getState().addPoints(25, 'mi-acción')
```

Eventos gamificados se distribuyen por reglas en `src/core/gamification/gamificationUtils.ts`.

## 6. Servicios core nuevos (v1.5.0)

| Servicio | Import | Para qué |
| --- | --- | --- |
| `tagsService` | `@core/services/tagsService` | Tags globales y links polimórficos a entidades de cualquier plugin |
| `templatesService` | `@core/services/templatesService` | Plantillas reusables (notas, mails, briefs) por plugin + kind |
| `automationsService` | `@core/services/automationsService` | If‑this‑then‑that sobre el EventBus (notify, add_xp, emit_event, log) |
| `notificationsService` | `@core/services/notificationsService` | Notificaciones nativas + cola programable + horas de silencio |
| `ollamaService` | `@core/services/ollamaService` | Llamadas a Ollama local con settings (modelo, prompt, temperatura) |
| `aiContextService` | `@core/services/aiContextService` | Snapshot del usuario (fitness, work, planner, gamif) listo para LLM |
| `aiSuggestionsService` | `@core/services/aiSuggestionsService` | Tareas predefinidas: dailyCoach, weeklyReview, focusNudge |
| `calendarAggregator` | `@core/services/calendarAggregator` | Eventos unificados (planner, work, fitness, focus) por rango |

## 7. Backup

`window.backup` ofrece `exportPlain`, `exportEncrypted`, `importPlain`, `importEncrypted`. Toda la base de datos del usuario activo se respalda como un único archivo (cifrado con AES‑256‑GCM si se elige).

## 8. Crear un plugin nuevo

```bash
npm run create-plugin -- mi-plugin
```

El script genera la estructura mínima en `src/plugins/<id>/`. Acordate de:

1. Importarlo en `src/App.tsx`: `import './plugins/<id>'`
2. Registrarlo en `src/core/plugins/PluginRegistry.ts`
3. Definir migraciones SQL con prefijo `<id>_` antes de leer/escribir.

## 9. Buenas prácticas

- **Nunca** hardcodees rutas de filesystem; usá `window.storage` o `window.backup`.
- **Validá inputs** antes de persistir (regex, rangos numéricos, longitudes máx).
- **Emití eventos** ante cambios relevantes — habilita gamificación, automations y review semanal.
- **No bloqueés el render** con I/O síncrono pesado; siempre `async`.
- **Respeta el idioma**: toda la UI debe estar en español rioplatense.
