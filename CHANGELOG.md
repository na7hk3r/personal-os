# Changelog - Personal OS

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
