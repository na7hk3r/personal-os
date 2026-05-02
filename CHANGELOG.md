# Changelog - Personal OS

## [1.10.0] - 2026-05-01

### 🛡 Consistency Auditor

Sistema de validación cruzada entre el core y los plugins. Detecta logros y misiones huérfanas, eventos sin emisor, notificaciones de plugins inactivos, UI fantasma, iconografía incoherente con el dominio, listeners cruzados rotos, quick actions inconsistentes y residuos de onboarding/persistencia.

- Nuevo módulo `src/core/audit/` con 10 reglas (R1–R10), catálogo de íconos por dominio (`DOMAIN_ICON_CATALOG` cubriendo 20 dominios) y store reactivo (`useAuditStore`).
- `PluginManifest` extendido con `domain`, `domainKeywords` y `iconography: { primary, gallery? }` (campos opcionales, retrocompatibles).
- Ejecución automática en boot (`App.tsx`) y al togglear plugins (`coreStore.setPluginEnabled`).
- `notificationsService.processQueue` filtra notificaciones cuya `source` es un plugin conocido pero inactivo.
- Nueva sección **Audit Panel** en el Control Center con filtros por regla / plugin / severidad, contador en el header y autofix `replaceIcon` para plugins oficiales.
- 5 plugins oficiales migrados con `domain` + `iconography`.
- Documentación: [docs/CONSISTENCY_AUDITOR.md](docs/CONSISTENCY_AUDITOR.md), update en [docs/PLUGIN_BASE_STRUCTURE.md](docs/PLUGIN_BASE_STRUCTURE.md), template `scripts/create-plugin.mjs` actualizado.
- 24 tests unitarios cubriendo cada regla + catálogo + autofix.

## [1.9.0] - 2026-05-01

Wave 4 (Sprints 6–10): **plugin Knowledge** (PKM con SM-2), **plugin Tiempo** (time tracking con auto-entries desde Focus), **onboarding mejorado** con objetivo personal y datos demo opcionales, y **export/import de perfil** con cifrado opcional.

### ✨ Nuevo plugin — Knowledge (Sprint 6)

PKM ligero local-first: recursos, highlights y flashcards con algoritmo SM-2.

- Esquema v1: `knowledge_resources` (book/course/paper/article/video con status y progress 0–100), `knowledge_highlights` (FK a recursos, soft-delete por cascade), `knowledge_flashcards` (ease, interval, repetitions, next_review) y `knowledge_reviews` (auditoría de cada repaso con quality 0–5).
- **Algoritmo SM-2** completo: `sm2Schedule` calcula nuevo `(ease, interval, repetitions, nextReview)` para cada quality; floor de ease en 1.3, secuencia 1d → 6d → ease·interval. Reset a 0 con quality < 3.
- `dueFlashcards` filtra archivadas y trae sólo las que vencen hoy o antes; `isMastered` marca tarjetas con repeticiones ≥4 e interval ≥21 días.
- Páginas: `KnowledgeDashboard`, `KnowledgeResourcesPage` (biblioteca con quick-add), `KnowledgeHighlightsPage` y `KnowledgeReviewPage` (sesión de repaso con quality buttons 0–5).
- Widget `KnowledgeSummaryWidget` 1x1 con due hoy + recursos en progreso.
- `knowledgeAIProvider`: total recursos, terminados, en progreso, due hoy, tarjetas mastered, top tags.
- Eventos: `RESOURCE_CREATED|UPDATED|FINISHED|DELETED`, `HIGHLIGHT_ADDED|DELETED`, `FLASHCARD_CREATED|REVIEWED|DELETED`.
- Métricas publicadas: `knowledge.resources_finished`, `resources_finished_month`, `resources_in_progress`, `flashcards_due`, `flashcards_mastered`, `highlights_total`.
- Gamificación: +3 XP por highlight, +2 XP por flashcard repasada, +15 XP por recurso terminado.
- 10 tests unitarios cubriendo SM-2, due window, mastered detection y serialización de tags.

### ✨ Nuevo plugin — Tiempo (Sprint 10)

Cronómetro y timesheet local con auto-entries desde sesiones de Focus.

- Esquema v1: `time_projects` (cliente, hourly_rate, color) y `time_entries` (FK a proyecto con `ON DELETE SET NULL`, `source` = 'manual' | 'focus', `billable`).
- **Single-running guard**: `startEntry` detiene cualquier entrada en curso antes de crear una nueva — nunca hay dos cronómetros simultáneos.
- Páginas: `TimeDashboard` (timer en vivo + entradas recientes + entrada manual), `TimeProjectsPage` (CRUD con tarifa por hora) y `TimesheetPage` (grid lun–dom con totales por proyecto / día / total).
- Widget `TimeSummaryWidget` 1x1 con total de hoy + botón start/stop in-place.
- **Auto-entries desde Focus**: el plugin escucha `WORK_FOCUS_COMPLETED` y crea automáticamente una `time_entry` con `source='focus'` usando `durationMin` del payload.
- `timeAIProvider`: horas hoy, horas semana, facturable semana e ingresos proyectados (suma `hourlyRate × horas` de entradas billable).
- Eventos: `PROJECT_CREATED|UPDATED|DELETED`, `ENTRY_STARTED|STOPPED|CREATED|UPDATED|DELETED`.
- Métricas publicadas: `time.tracked_today_sec`, `tracked_week_sec`, `billable_week_sec`, `billable_week_revenue`, `active_running`.
- Gamificación: +2 XP al detener una entrada de ≥5 min.
- Eliminar un proyecto desvincula sus entries (`projectId → null`) en vez de borrarlas — la historia se preserva.

### 🚀 Onboarding mejorado (Sprint 8)

- **Objetivo personal del año**: nuevo textarea en `StepName` ("¿Cuál es tu gran objetivo este año?"). Se persiste como `settings.profile.bigGoal` para evitar migración de la tabla `profile`. El payload de `PROFILE_UPDATED` incluye `hasBigGoal`.
- **Datos de ejemplo opcionales** desde `StepSummary`: toggle "Cargar datos de ejemplo" que invoca `seedDemoData(activeIds)` para los plugins Work, Habits, Journal y Knowledge. Cada seeder está guardeado por `tableIsEmpty(table)` — nunca pisa data del usuario.
- El objetivo se muestra en `StepSummary` como un item destacado antes de finalizar.

### 🔄 Export / Import de perfil (Sprint 9)

Transferí tu perfil entre máquinas o respaldalo en un archivo aparte del backup completo.

- Nuevo IPC `profile-ipc.ts` con 4 canales: `profile:export-plain` (`.posprof.json`), `profile:export-encrypted` (`.posprof`, AES-256-GCM con scrypt y passphrase ≥8), `profile:import-plain` y `profile:import-encrypted`.
- Formato del snapshot: `{ schemaVersion, exportedAt, app: { name: 'personal-os' }, profile, settings (whitelist), activePlugins, gamification }`. **Nunca se exportan** `password_hash`, sesiones, recovery ni datos de plugins.
- `MAGIC` header `POS-PRF1` (8 bytes) + salt(16) + iv(12) + tag(16) + ciphertext.
- Allowlist explícita de settings: `theme`, `sidebarCollapsed`, `activePlugins`, `profile.bigGoal`.
- Validación al importar: `app.name === 'personal-os'` y `schemaVersion === 1`. Datos inválidos → error tipado, no upsert parcial.
- Nueva página `/profile` (`ProfilePage`) con secciones Datos personales, Exportar (plain / encrypted) e Importar (plain / encrypted) con banner de estado idle/busy/success/error.
- Acceso rápido vía Command Palette: "Perfil (export/import)".

### 🧱 Capa Repository — extensión

- Allowlist de `StorageAPI` extendida para los nuevos plugins: `time_projects`, `time_entries`, `knowledge_resources`, `knowledge_highlights`, `knowledge_flashcards`, `knowledge_reviews`.

## [1.8.0] - 2026-05-01

Wave 3: **plugin Hábitos**, **plugin Journal**, **capa Repository** sobre `StorageAPI`, **cifrado de la DB de usuario en reposo opt-in**, **catálogo de atajos in-app** y **pasada de accesibilidad ARIA** sobre los componentes core.

### ✨ Nuevo plugin — Habits

Tracking de hábitos con metas diarias / semanales / mensuales y rachas reales.

- Esquema v1: `habits_definitions` y `habits_logs` con índices por `habit_id` + `date`.
- Operaciones: crear / editar / archivar / borrar (cascade a logs vía `deleteWhere`), `logHabit` / `unlogHabit` / `toggleTodayLog` con detección del filo de cumplimiento de meta.
- `computeStats`: streak actual, mejor streak, % cumplimiento del período activo y "en riesgo" si no se loggeó hoy y faltan ≤ 2 días para cerrar el período.
- Páginas: `HabitsDashboard` (overview + quick add), `HabitsManagePage`, `HabitsHistoryPage`.
- Widget `HabitsSummaryWidget` 1x1 para el Dashboard core.
- `habitsAIProvider` registrado en el snapshot global: total, completados hoy, top streaks, en riesgo.
- Eventos: `HABIT_CREATED|UPDATED|ARCHIVED|LOGGED|UNLOGGED|GOAL_MET|STREAK_BROKEN`.
- Gamificación: +2 XP por log, +5 XP al cumplir meta del período.

### ✨ Nuevo plugin — Journal

Diario personal con prompts, mood, tags, búsqueda y pin. **Privacy-first**: el contenido nunca se manda al LLM.

- Esquema v1: `journal_entries` (única por fecha, FTS-friendly) y `journal_prompts`.
- Esquema v2: seed de prompts builtin (`morning_intent`, `morning_energy`, `evening_review`, `gratitude`, `lesson`, `blocker`, `free`).
- Editor con `Ctrl/Cmd + S`, mood (1–5), prompt picker, tags, contador de palabras y undo al borrar.
- Páginas: `JournalDashboard` (date picker), `JournalHistoryPage` (search + tag filter + pinned-only).
- `journalAIProvider` expone **sólo agregados** (total, últimos 7 días, mood promedio 7d, top tags, escribió hoy). Nunca el contenido literal.
- Eventos: `ENTRY_CREATED|UPDATED|DELETED|PINNED|MOOD_LOGGED`.
- Gamificación: +5 XP por entrada nueva, +2 por update, +1 por mood logged.

### 🧱 Capa Repository sobre StorageAPI

Refactor A5: introducir un patrón Repository tipado para que los plugins eviten escribir SQL crudo manteniendo intactos el sandbox y la allowlist del core.

- Nuevo `defineRepository<TEntity, TRow>({ table, mapRow, toRow, primaryKey? })` en `src/core/storage/Repository.ts`.
- API: `find`, `findOne`, `findById`, `count`, `create`, `update`, `delete`, `deleteWhere` con `WhereClause` que soporta operadores `= != < <= > >= LIKE IS IS NOT IN`.
- `assertIdentifier` + reuso del allowlist del `StorageAPI` para no abrir nuevos vectores de SQL injection.
- `deleteWhere` exige `where` no vacío para impedir borrados full-table accidentales.
- Plugins **Habits** y **Journal** ya estrenan el patrón con repos dedicados (`habitDefinitionsRepo`, `habitLogsRepo`, `journalEntriesRepo`, `journalPromptsRepo`) que mapean snake_case ↔ camelCase y serializan booleanos / JSON.

### 🔒 Cifrado de la DB de usuario en reposo (opt-in)

Activable y desactivable desde Control Center. AES-256-GCM con KDF scrypt, **sin dependencias nativas extra** (no requiere SQLCipher).

- `electron/services/encryption.ts`: `encryptFile` / `decryptFile` / `isEncryptedFile` / `isPassphraseStrongEnough`. Layout `MAGIC(4) | VERSION(1) | SALT(16) | IV(12) | TAG(16) | CIPHERTEXT`.
- Política de fortaleza: mínimo 12 caracteres y al menos 2 categorías (minúsculas, mayúsculas, dígitos, símbolos).
- `DatabaseService` cifra el archivo del usuario activo en `clearActiveUser()` / `close()` y lo descifra en `setActiveUser(userId, passphrase)`. Si al login existe un `.enc` y todavía no se proveyó passphrase, la sesión queda **lockeada** (`isLocked()`) sin abrir conexión.
- IPC `dbencryption:status | enable | disable | check-strength | unlock` en `electron/services/db-encryption-ipc.ts`. Bridge `window.dbEncryption` expuesto vía preload.
- UI: nueva sección **Cifrado de base en reposo** en Control Center con prompt de passphrase + confirm + medidor de fortaleza, y nueva pantalla intermedia `UnlockScreen` que pide la passphrase tras el login cuando la DB está cifrada.
- Si perdés la passphrase no hay recuperación. La passphrase nunca se persiste a disco; vive solo en memoria mientras la sesión está abierta.
- Limitación documentada: mientras la app está corriendo, el archivo `.db` queda en claro en disco. La promesa es estrictamente "en reposo".

### ⌨ Catálogo de atajos in-app

- Nueva fuente única `src/core/ui/shortcuts.ts` con `SHORTCUT_GROUPS` (global, palette, modal, journal, kanban) — sincronizada con `docs/SHORTCUTS.md`.
- Nueva página `/shortcuts` con búsqueda por tecla o acción y chips `<kbd>` por combinación.
- Entradas en sidebar y Command Palette (`Atajos de teclado`).

### ♿ Pasada de accesibilidad ARIA

- `Shell` ahora expone `<main role="main" id="main-content" tabIndex={-1}>` y un **skip-link** "Saltar al contenido principal" visible al recibir foco.
- `Sidebar` con `role="complementary"` + `aria-label`, `<nav aria-label>` y `aria-expanded` en el botón de colapsar.
- **Command Palette** convertido a patrón **combobox + listbox** real: `aria-modal`, `aria-controls`, `aria-activedescendant`, `aria-selected` por opción y `aria-autocomplete="list"`.
- **ToastProvider** distingue severidad: errores como `role="alert" aria-live="assertive"`, el resto `role="status" aria-live="polite"` con `aria-atomic`.
- `OnboardingWizard` y `CardDetailModal` con `role="dialog" aria-modal="true"` y label.
- `GamificationNotificationHub` como `region` con `aria-live="polite"`.
- Iconos puramente decorativos marcados `aria-hidden`, botones de cierre con `aria-label` real.

### 🛠 Cambios técnicos

- `StorageAPI` allowlist ampliado con `habits_definitions`, `habits_logs`, `journal_entries`, `journal_prompts`.
- `PLUGIN_IDS` y `PLUGIN_NAMES` actualizados con `habits` y `journal`.
- `DbEncryptionBridge`, `DbEncryptionStatus` y `DbEncryptionResult` agregados a `src/core/types.ts` y a `window` en `src/global.d.ts`.
- `messages.ts`: nuevas claves para `habits`, `journal`, `dbEncryption` y `shortcuts` siguiendo el tono rioplatense del resto de la app.

## [1.7.0] - 2026-05-01

Wave 2: **plugin Finanzas v1.0** completo, **Daily Brief contextual**, **Smart Focus Nudge**, **extracción Note → Task con IA**, registry de proveedores de contexto IA y carga lazy + virtualización de listas largas.

### ✨ Nuevas características — core

#### AIContextProvider registry
- Nueva API `registerAIContextProvider({ id, collect, render })` para que cualquier plugin enriquezca el snapshot que recibe Ollama sin que el core conozca su esquema.
- `aiContextService.snapshot()` ejecuta los providers en paralelo y `asPromptContext()` renderiza cada slice como `Plugin {id}: ...`.
- Fundamento para insights contextuales por plugin sin acoplar el core.

#### Daily Brief
- Nuevo `dailyBriefService` que entrega **una línea accionable** al abrir la app.
- Cache diario en `settings` (`core:dailyBrief:YYYYMMDD`); regenerable manualmente con un click.
- Cuando Ollama está activo combina el `userContextSnapshot` con un prompt corto en español rioplatense (máx. 14 palabras, sin emojis, sin moralizar).
- Fallback determinístico cuando Ollama está off o no responde.
- Banner `DailyBriefBanner` montado en el Dashboard, dismissable por el día actual.

### ✨ Nuevas características — plugin Work

#### Smart Focus Nudge
- Detecta 45 s sin actividad del usuario en `/work` y, si la última `FocusSession` cerró hace más de 4 h, ofrece arrancar foco con la tarea más prioritaria (vencimiento más cercano o mejor posición).
- Una sola disparación por sesión de la app, vía toast con CTA **Empezar foco** que llama a `startWorkFocusSession`.

#### Note → Task extraction
- Nuevo `noteExtractionService` que pide a Ollama un JSON estricto `{ tasks: [{ title, dueDate? }] }` y crea cards en la primera columna del primer board.
- Botón **Extraer tareas** visible en el editor de Notas sólo cuando la nota supera los 200 caracteres.
- Parser tolerante: si el modelo agrega texto fuera del JSON, se recortan los delimitadores.

### ✨ Nuevo plugin — Finance

Movimientos, cuentas, presupuestos y gastos recurrentes con awareness IA opcional. Default en **UYU** (configurable por cuenta), formato `es-UY`.

#### Esquema y operaciones
- Migraciones v1: `finance_accounts`, `finance_categories`, `finance_transactions`, `finance_recurring`, `finance_budgets`, `finance_merchant_aliases` con FKs (`account_id ON DELETE RESTRICT`, `category_id ON DELETE SET NULL`) e índices `idx_finance_tx_account_date` / `idx_finance_tx_category_date`.
- Migración v2: seed de categorías por defecto (Comida, Transporte, Hogar, Salud, Entretenimiento, Suscripciones, Sueldo, etc.).
- Allowlist de tablas y columnas finance agregada al `StorageAPI` para mantener el SQL sandbox cerrado.

#### Páginas y componentes
- **FinanceDashboard** con balance total, KPIs del mes (ingresos, gastos, neto con delta vs mes anterior), QuickAdd inline y movimientos recientes agrupados por día.
- **TransactionsPage** con filtros por rango, cuenta, categoría, búsqueda y kind. Lista virtualizada con `@tanstack/react-virtual` cuando hay más de 50 movimientos.
- **CategoriesPage** con conteo de uso y borrado seguro.
- **BudgetsPage** con editor inline por categoría de gasto, barra de progreso (rosa al pasar el límite) y **Sugerir desde mediana 3 meses**.
- **RecurringPage** con creación de plantillas RRULE-light (`DAILY`/`WEEKLY`/`MONTHLY` + `INTERVAL` + `BYMONTHDAY`), pausa/activación y **Ejecutar ahora**.
- **InsightsPage** con resumen mensual narrativo (vía IA o fallback determinístico) y deltas vs mes anterior.
- Widget `FinanceSummaryWidget` 1x1 para el Dashboard core.

#### IA opcional
- `financeAIProvider` registrado en el `aiContextRegistry`: aporta totales del mes, top categorías y recurrentes próximos al snapshot global.
- **Detección de anomalías**: cada `TRANSACTION_CREATED` con categoría se compara contra el p90 de los últimos 5+ samples; si supera 1.5× se notifica vía toast informativo.
- **Resumen mensual** con narrativa Ollama (máx. 4 oraciones, rioplatense) o fallback estructurado.
- **Sugerencia de presupuestos** por mediana de los últimos 3 meses por categoría.

#### Eventos y gamificación
- Eventos: `FINANCE_TRANSACTION_CREATED`, `FINANCE_RECURRING_CREATED`, `FINANCE_BUDGET_CREATED`, `FINANCE_ANOMALY_DETECTED`.
- Gamificación: +2 XP por transacción, +5 por recurrente, +5 por presupuesto.

### ⚡ Performance

#### Suspense por ruta
- Páginas core pesadas (`ControlCenter`, `CalendarPage`, `ReviewPage`, `PlannerPage`, `NotesPage`, `LinksPage`) y todas las páginas de plugins ahora usan `React.lazy` + `Suspense` con fallback liviano.
- Bundle inicial más liviano y arranque más rápido en el Dashboard.

#### Virtualización
- `@tanstack/react-virtual` agregado como dependencia.
- `TransactionsPage` virtualiza filas a partir de 50 movimientos para mantener 60 fps con datasets largos.

### 🐛 Fixes

- Selectores Zustand del plugin Finance que devolvían arrays nuevos en cada render (`(s) => s.accounts.filter(...)`) provocaban *Maximum update depth exceeded*. Refactor a selector crudo + `useMemo`.
- `QuickAddTransaction` y `RecurringPage` ahora sincronizan `accountId` cuando se crean cuentas tras el primer render (eliminando el falso "Elegí una cuenta").
- `FinanceDashboard` pierde imports muertos y mantiene únicamente lo usado.

### 🔧 Operativo

- Bump a `1.7.0`.
- Nueva dependencia: `@tanstack/react-virtual ^3.13`.
- Nuevo plugin id `finance` registrado en `core/config/plugins.ts`.
- README, CHANGELOG y versión en pantalla actualizados.

---

## [1.6.0] - 2026-05-01

Wave 1 de pulido **enterprise**: backups programados, auto-update integrado, exportación de diagnósticos, onboarding con primera acción, undo en operaciones destructivas, retención de eventos y endurecimiento general de la UI.

### ✨ Nuevas características — core

#### Backup programado
- Servicio `scheduled-backup` en main process: corre en intervalos configurables (diario / semanal / mensual) hacia un destino elegido por el usuario.
- Cifrado opcional con passphrase persistido en safeStorage del SO (`safeStorage.encryptString`).
- Sección dedicada en Control Center: estado, próximo run, último run, ejecutar ahora, configurar destino y passphrase.

#### Auto-update integrado (electron-updater)
- IPC `app-update` con `checkForUpdates`, `downloadUpdate`, `quitAndInstall` y stream de status (`available`, `downloading`, `downloaded`, `error`).
- **Banner global** en Shell que aparece cuando hay update disponible o ya descargado, con acción para descargar o reiniciar e instalar.
- Sección de Control Center con estado actual, versión disponible y controles manuales.
- Fallback transparente cuando `electron-updater` no está instalado o la app no está empaquetada.

#### Diagnóstico exportable
- IPC `diagnostic:export` empaqueta info de versión, plataforma, perfil activo, conteos de tablas y últimos eventos a un JSON local (sin datos sensibles).
- Pensado para troubleshooting asistido sin exponer la base completa.

#### Onboarding con primera acción
- Nuevo paso `StepFirstAction` después de la configuración: el usuario crea su primera tarea de Work o registra su primer peso de Fitness antes de entrar al Dashboard.
- Si elige saltear, el wizard lo permite. La primera acción se persiste y se muestra en el Step de resumen.

### 🛡️ Robustez

#### Retención del log de eventos
- `events_log` ahora se purga al activar usuario: descarta filas > 90 días y aplica un cap duro de 50.000 filas.
- Índices nuevos sobre `created_at` y `(event_type, created_at)` para queries rápidas en feed reciente y agregados.

#### Toast undo en operaciones destructivas
- Eliminar nota o card del Kanban dispara un toast con acción **Deshacer** (5 s): el snapshot completo se reinserta en SQLite y el evento de creación se re-emite.
- Glosario de mensajes centralizado en `src/core/ui/messages.ts` (`messages.confirm.deleteNote(...)`, `deleteCard(...)`, `deleteTag(...)`, etc.).

#### Global Error Boundary
- Captura excepciones de React en cualquier vista del Shell y muestra una pantalla de recuperación con stack y botón de recarga, evitando que un plugin tire toda la app.

#### Toast Provider unificado
- Provider `ToastProvider` montado en `App.tsx`. API: `toast.success`, `toast.error`, `toast.info`, `toast.undo`, `toast.dismiss`.
- Variante `undo` con timeout extendido (5 s) y action button.

### 🎨 UI

#### Componente compartido `PluginIcon`
- Mapa único de strings de manifest (`"BriefcaseBusiness"`, `"NotebookPen"`, etc.) a componentes de `lucide-react`.
- Refactor de Sidebar y del **Module Manager** del Control Center: antes mostraban literalmente el nombre del icono como texto, ahora renderizan el icono real.

#### Mojibake en Notas — corregido
- Strings doble-codificados de UTF-8 (`Aâ€"Z`, `TÃ­tulo`, `âœ•`) reemplazados por su forma correcta y por íconos `lucide-react` cuando aplica.

#### Inyección de versión vía Vite
- `__APP_VERSION__` se inyecta en build/dev a partir de `package.json`. Ya no hace falta mantenerla a mano en strings.

### 🐛 Fixes

- Stubs de `window.*` en `test/setup.ts` ahora usan un cast tipado en vez de `@ts-expect-error`, eliminando warnings al sumar bridges.
- Botones de eliminar en `NoteEditor` perdieron el patrón "doble click para confirmar" en favor del nuevo undo, más rápido y reversible.

### 🔧 Operativo

- Bump a `1.6.0`.
- README, CHANGELOG y versión en pantalla actualizados.

---

## [1.5.0] - 2026-04-30

Salto cualitativo del **core**: IA local con Ollama, backups cifrados, calendario unificado, automatizaciones por evento, Command Palette, review semanal y plantillas.

### ✨ Nuevas características — core

#### IA local con Ollama (privacidad total)
- Integración con `http://127.0.0.1:11434` por canal IPC (sin CORS, sin telemetría).
- Configuración en Control Center: enable, modelo (autocomplete con `/api/tags`), system prompt, temperatura.
- `aiContextService` arma un snapshot real del usuario (fitness 7d, work, planner, gamificación, eventos recientes) y lo entrega al LLM.
- Tareas predefinidas: **dailyCoach**, **weeklyReview**, **focusNudge** — todas en español rioplatense, sin emojis.
- El Centro de Notificaciones muestra una sugerencia diaria del coach IA cuando Ollama está activo.

#### Backup cifrado
- Export/import de la base de datos del usuario activo.
- Cifrado AES‑256‑GCM con derivación scrypt (passphrase ≥ 8 caracteres).
- Checkpoint WAL antes de copiar para garantizar integridad.

#### Calendario unificado
- Nueva ruta `/calendar` con grid mensual y filtros por fuente.
- Agrega eventos de Planner, Work (vencimientos), Fitness (entrenos) y sesiones de foco.

#### Review semanal/mensual
- Nueva ruta `/review` con KPIs reales (fitness/work/gamificación) y botón para generar el análisis con IA.

#### Command Palette (Ctrl/Cmd + K)
- Búsqueda global instantánea en notas, tareas, enlaces y rutas (incluye páginas de plugins activos).
- Navegación por teclado (↑ ↓ Enter Esc).

#### Automatizaciones (no‑code)
- CRUD desde Control Center: trigger event + condición opcional + acción (`notify`, `add_xp`, `emit_event`, `log`).
- Condiciones evaluadas en sandbox restringido por whitelist de caracteres.

#### Tags globales
- Etiquetas reusables entre módulos con links polimórficos (notas, cards, links, fitness, etc.).

#### Plantillas
- Tabla `core_templates` + `templatesService` para que cualquier plugin guarde y reutilice contenido (notas, mails, briefs).

#### Notificaciones nativas y horas de silencio
- Cola persistente (`core_notifications_queue`), processor cada 30s, respeta horas de silencio (con wrap de medianoche).

### 🛠 Plataforma

- Tablas core nuevas: `core_tags`, `core_tag_links`, `core_templates`, `core_automations`, `core_notifications_queue`.
- Bridges nuevos en preload: `window.backup`, `window.ollama`, `window.notifications`.
- `docs/PLUGIN_API.md`: documentación completa de la API.
- `docs/PLUGIN_IDEAS.md`: 11 plugins priorizados como roadmap (Hábitos, Finanzas, Journal, OKRs, Knowledge, Time Tracking, Inventario, CRM, Salud, Travel).
- `docs/SHORTCUTS.md`: atajos de teclado.
- Script `npm run create-plugin -- <id>` para scaffolding.
- Vitest + jsdom + Testing Library configurados (`npm test`).

## [1.4.0] - 2026-04-23

Mejoras integrales del plugin **Work**: motor de foco con pause real, capacidades de tarea avanzadas, Pomodoro con notificación nativa y fix completo del drag & drop del kanban.

### ✨ Nuevas características — plugin Work

#### Focus Engine 2.0
- **Pause / Resume reales**: el tiempo se congela sin penalizar XP. La sesión queda persistida en SQLite (`paused_at`, `paused_total`) y sobrevive a reinicios.
- **Switch limpio**: cambiar de tarea con menos de 1 minuto de foco descarta la sesión silenciosamente, sin XP penalty ni evento.
- **Cleanup de sesiones zombie**: si la app se cerró con una sesión abierta hace más de 8 horas, al iniciar se cierra automáticamente como interrumpida (cap de 8h).
- **Pomodoro con objetivo configurable**: 15 / 25 / 45 / 60 / 90 min, persistido por usuario. Barra de progreso en el Now Panel y **notificación nativa del sistema operativo** al alcanzar la meta + auto-cierre de la sesión como completada.
- **Quick action "Iniciar foco"** en la barra global del Core (emite `core:focus-request`).

#### Tarjetas (Kanban) enriquecidas
- **Prioridad** Baja / Media / Alta / Urgente con badges de color.
- **Estimación en minutos** (formato `30m`, `1h 30m`).
- **Checklist embebida** con barra de progreso `N/M` que se pone verde al completarse.
- **Date picker nativo** para vencimientos (`<input type="date">`) con etiquetas relativas (`Hoy`, `Mañana`, `En 3d`, `Hace 2d`, vencidas en rojo).
- **Contador de sesiones de foco** por tarjeta.
- **Etiquetas visibles** (máx. 3 + "+N" indicator).

#### Columnas
- **Edición inline**: renombrar y setear `WIP limit` desde el header de la columna.
- **Indicador WIP**: contador `N / límite` que se pone rojo al excederse.
- **Archivado automático**: tarjetas en columnas tipo "Hecho/Done" sin actividad de foco por más de 7 días se archivan al iniciar la app (no se borran, quedan con `archived = 1`).

#### Notas
- **Búsqueda** por título, contenido o tags.
- **Orden configurable** (Recientes / A–Z) con preferencia de pinneadas.
- **Pin / Unpin** por nota.
- Confirmación doble click en eliminación.

#### Enlaces
- **Búsqueda** y **edición inline** (título, URL, categoría).
- **Iconos por dominio** offline-first (code repos, video, docs) — sin favicons remotos.
- **Agrupación por categoría** ordenada alfabéticamente.

### 🐛 Fixes críticos

- **Drag & Drop**: el `<DragOverlay>` ahora se renderiza vía portal a `document.body`, evitando que ancestros con `transform` (animación `plugin-enter`) lo descoloquen del puntero. La tarjeta original se oculta (`opacity: 0`) sin aplicar transform propio durante el drag, eliminando el offset visual y el flicker.
- **DnD posiciones inconsistentes**: nueva acción `reorderCards` en el store que aplica todas las mutaciones de columna origen + destino en una sola operación atómica. Eliminado `onDragOver` que mutaba el estado en cada hover y causaba flicker.
- **Persistencia DnD**: las posiciones de los hermanos se guardan en paralelo (`Promise.all`) y solo se actualizan los registros que realmente cambiaron.
- **Detección de drop**: cambiado `closestCenter` → `closestCorners` para más precisión en columnas vacías.
- Mensajes de error de autenticación con prefijo `Error invoking remote method ...` ahora se limpian antes de mostrarse al usuario.

### 🎨 Mejoras de UX

- **Now Panel**: botones separados Start / Pause / Resume / Stop (verde, +XP) / Cancel (rojo, −XP). El timer se pone amarillo y muestra `(pausado)` durante una pausa.
- **Confirmación doble-click** con auto-reset a 3 s en todos los borrados destructivos (tareas, notas, links).
- Eliminados wrappers `plugin-panel` redundantes en las páginas de Notas y Enlaces.
- Dashboard: la grilla de widgets se adapta para 0, 1 o 2 elementos sin huecos visuales.
- Activity feed limitado a los 5 eventos más recientes.

### 🗄️ Migraciones de base de datos

Las migraciones se aplican automáticamente al iniciar la app:

- **v5** — `work_focus_sessions`: `paused_at INTEGER`, `paused_total INTEGER DEFAULT 0`.
- **v6** — `work_notes`: `pinned INTEGER DEFAULT 0`.
- **v7** — `work_cards`: `priority TEXT`, `estimate_minutes INTEGER`, `checklist TEXT DEFAULT '[]'`, `archived INTEGER DEFAULT 0`, `archived_at INTEGER`. `work_columns`: `wip_limit INTEGER`.

### 🔐 Política de XP del Focus Engine

| Acción | XP |
| --- | --- |
| Completar sesión (Stop) | +5 |
| Completar tarea (mover a Done) | +10 |
| Crear nota | +3 |
| Pausa | 0 |
| Switch limpio (<1 min) | 0 |
| Interrupción (Cancel o switch ≥1 min) | −2 |

---

## [1.3.0] - 2026-04-22

### ✨ Nuevas características

#### Sistema de autenticación multiusuario
- **Autenticación local y segura**: Registro, login y recuperación de acceso completamente offline
- **Multiusuario con aislamiento total**: Cada usuario tiene su propia base de datos, configuración y plugins
- **Auto-login**: Sesiones persistentes que se restauran automáticamente en el siguiente inicio
- **Recuperación de acceso**: Reseteado de contraseña mediante pregunta secreta personalizada
- **IPC seguro**: Implementación de auth via preload script con context isolation
- **Criptografía robusta**: Hasheado con scrypt + salt aleatorio, timing-safe comparison

### 🎨 Mejoras de UX

#### Mensajes de error mejorados
- Todos los mensajes de error ahora son **claros, concisos y amigables**
- Validaciones progresivas con feedback inmediato
- Sugerencias útiles en cada paso (ej: "mínimo X caracteres")
- Distinciones entre errores de formato y errores de operación

#### Interfaz de autenticación
- UI moderna y responsive con 3 modos: Login, Registro, Recuperación
- Indicadores visuales mejorados con iconos (CheckCircle2 para éxito, AlertCircle para errores)
- Mejor diseño de inputs con placeholders descriptivos
- Animaciones y transiciones suaves
- Colores consistentes con tema de la aplicación

### 🔒 Seguridad

- **Bases de datos separadas**: `auth.db` (global) + `personal-os-user-{userId}.db` (por usuario)
- **Sesiones seguras**: Almacenadas con revocación explícita, no en localStorage
- **Validación robusta**: Todas las entradas validadas tanto frontend como backend
- **Preload script seguro**: Bridge entre main y renderer con APIs tipadas
- **No eval ni innerHTML**: UI construida 100% con JSX declarativo

### 📚 Documentación

- Nuevo archivo `docs/AUTH.md` con documentación técnica completa del sistema de autenticación
- Guías de arquitectura, flujos de usuario, migración legacy DB
- FAQ sobre recuperación, sincronización y seguridad
- Roadmap futuro (biometría, sincronización E2E, auditoría)

### 📝 Actualización de README

- Nueva sección "Autenticación y multiusuario" con descripción de características
- Datos técnicos resumidos de implementación
- Links a documentación técnica detallada

### 🔄 Migración automática

- Si existe `personal-os.db` (single-user legacy) al momento del primer registro, se reclaima automáticamente
- Todos los datos históricos quedan disponibles para el usuario que crea la primera cuenta
- Próximos usuarios crean sus propias bases de datos limpias

### 📦 Cambios técnicos

#### Nuevos archivos
- `electron/services/auth.ts` - Core service de autenticación
- `electron/services/auth-ipc.ts` - IPC handlers para operaciones auth
- `src/core/state/authStore.ts` - Zustand store para estado global de auth
- `src/core/ui/auth/AuthScreen.tsx` - Componente UI completo de autenticación
- `docs/AUTH.md` - Documentación técnica

#### Modificaciones principales
- `electron/main.ts` - Inicialización de AuthService y registro de IPC handlers
- `electron/preload.ts` - Exposición segura de auth bridge via contextBridge
- `src/core/types.ts` - Tipos para AuthUser, payloads y AuthBridge
- `src/global.d.ts` - Declaración de window.auth en tipos globales
- `src/App.tsx` - Gating de autenticación, carga de sesión al inicio
- `src/core/ui/Sidebar.tsx` - Botón de logout en navegación
- `package.json` - Versión incrementada a 1.3.0
- `README.md` - Sección nueva sobre autenticación

### 🧪 Testing

Manual testing completado:
- ✅ Crear cuenta nueva con múltiples usuarios
- ✅ Login/logout seguro
- ✅ Auto-login en siguiente inicio
- ✅ Aislamiento de datos entre usuarios
- ✅ Recuperación de contraseña via pregunta secreta
- ✅ Validaciones de todos los campos
- ✅ Mensajes de error en español
- ✅ Migración automática de legacy DB

### 📋 Requisitos de sistema

Sin cambios en requisitos:
- Node.js 20+
- npm 9+
- Windows: Visual Studio Build Tools 2022
- macOS: Command Line Tools
- Linux: build-essential

### 🚀 Deployment

**Procedimiento de liberación**:
1. ✅ Build de producción: `npm run build`
2. ✅ Typecheck: `npm run typecheck` (16 errores preexistentes no relacionados a auth)
3. ✅ Cambio de versión: actualizado en package.json y README.md
4. ✅ Documentación: AUTH.md + README.md actualizados
5. ✅ Changelog: este archivo
6. Pasos siguientes:
   - Commit: `git commit -m "Release v1.3.0: Sistema de autenticación multiusuario"`
   - Tag: `git tag v1.3.0`
   - Push: `git push origin main --tags`

### ⚠️ Consideraciones conocidas

- **No sincronización multi-dispositivo**: Por diseño local-first. Se puede agregar en futuro con E2E encryption
- **Sin OAuth/SSO**: Autenticación local únicamente por requisito del usuario
- **Session storage**: Sesiones persisten en auth.db. Logout explícito requerido para revocación
- **Offline-only**: No hay backend. Funciona 100% sin conexión a internet

### 🔮 Roadmap futuro

- [ ] Sincronización entre dispositivos con E2E encryption
- [ ] Autenticación biométrica (fingerprint/face)
- [ ] Auditoría de acceso (logs de login/logout)
- [ ] Configuración de políticas de contraseña
- [ ] Exportar/importar perfil de usuario

---

**Versión anterior**: [1.2.0] - 2026-04-XX

Ver commits individuales para historial completo de cambios.
