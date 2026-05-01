# Changelog - Personal OS

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
