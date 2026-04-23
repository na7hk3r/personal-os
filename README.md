# Personal OS

Versión actual: `1.3.0`

Sistema operativo personal — aplicación de escritorio para productividad y salud, construida con Electron + React + SQLite.

> [!NOTE]
> Convención del README: cada feature nueva debe marcarse con **NEW** en la sección de novedades para que sea fácil identificar cambios recientes.

## ¿Qué es?

Personal OS es una aplicación modular que centraliza el seguimiento de hábitos de salud (fitness) y la gestión del trabajo (kanban, notas, foco) en una interfaz unificada con gamificación integrada.

## Novedades recientes (v1.3.0)

- **NEW · Sistema de autenticación multiusuario**: registro, login y recuperación de acceso completamente local con SQLite.
- **NEW · Aislamiento total por usuario**: cada usuario tiene sus propios datos, configuración, plugins y sesión persistente.
- **NEW · Recuperación de acceso**: reset de contraseña mediante pregunta secreta, sin backend y sin comprometer seguridad.
- **NEW · Mensajes UX-friendly**: validaciones y errores en español con feedback más claro para login, registro y recuperación.
- **NEW · Módulo core Planner**: vista diaria, semanal y mensual, filtros por estado y categoría, y drag and drop entre días.
- **NEW · Integración Planner + gamificación**: las tareas del planner cuentan como misión diaria y otorgan XP por complejidad.
- **NEW · Control Center por plugin**: configuración de Fitness y Work persistida en `settings`, visible solo cuando el plugin está activo.
- **NEW · Capa visual premium por plugin**: fondos diferenciados, animaciones de entrada y paneles con transiciones por dominio.
- **NEW · Actividad reciente expandida**: eventos de Fitness, Work y Core, incluyendo `CORE_PLANNER_TASK_COMPLETED`.
- **NEW · Dashboard principal reequilibrado**: mejoras en layout y corrección del colapso de `KPIs Fitness` y `Resumen Trabajo`.

Ver [docs/AUTH.md](docs/AUTH.md) para detalles técnicos de autenticación.

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Desktop | Electron 41 |
| Frontend | React 19 + TypeScript 5.7 |
| Routing | React Router DOM v7 |
| Estado | Zustand v5 |
| Build | Electron-Vite 5 + Vite 7 |
| Estilos | Tailwind CSS 3.4 + CSS Variables |
| Base de datos | SQLite (better-sqlite3) |
| Seguridad IPC | Preload script + Context Isolation + Sandbox |
| Íconos | Lucide React |
| Gráficos | Recharts |
| Drag & Drop | @dnd-kit |

## Requisitos

- Node.js 20+ (recomendado: LTS)
- npm 9+
- **Windows**: Visual Studio Build Tools 2022 (para compilar módulos nativos como `better-sqlite3`)
- **macOS**: Command Line Tools (incluye compilador C++)
- **Linux**: build-essential o equivalente

## Instalación y desarrollo

```bash
# Clonar y instalar (incluye rebuild automático de better-sqlite3)
git clone <repo>
cd personal-os
npm ci

# Modo desarrollo (abre ventana Electron con HMR)
npm run dev

# Build de producción
npm run build

# Preview del build
npm start

# Verificación de tipos TypeScript
npm run typecheck
```

### Notas sobre reproducibilidad

- **`npm ci` vs `npm install`**: En clon nuevo, usa siempre `npm ci` para instalar exactamente las versiones del `package-lock.json`. Esto garantiza que todos trabajen con las mismas dependencias.
- **Rebuild de módulos nativos**: El script `postinstall` ejecuta automáticamente `electron-rebuild` para `better-sqlite3`, compilando los binarios nativos para tu Electron y SO. No necesitas hacer nada extra; sucede al correr `npm ci`.
- **`.nvmrc`**: Si usas `nvm`, corre `nvm use` antes de clonar el proyecto para garantizar Node 20.
- **Commit de `package-lock.json`**: Siempre commiteá el lockfile; es lo que garantiza reproducibilidad.

## Estructura del proyecto

```
personal-os/
├── electron/                    # Proceso principal Electron
│   ├── main.ts                  # Inicialización de ventana y servicios
│   ├── preload.ts               # Context Bridge (window.storage, window.auth)
│   └── services/
│       ├── database.ts          # Singleton DatabaseService (SQLite)
│       ├── auth.ts              # Servicio de autenticación y sesiones
│       ├── auth-ipc.ts          # Handlers IPC de autenticación
│       └── storage-ipc.ts       # Handlers IPC con validación SQL
├── src/
│   ├── App.tsx                  # Bootstrap, rutas, registro de plugins
│   ├── core/                    # Kernel del sistema
│   │   ├── types.ts             # Interfaces centrales (CoreAPI, PluginManifest…)
│   │   ├── events/
│   │   │   ├── EventBus.ts      # Singleton pub/sub con persistencia
│   │   │   └── events.ts        # Constantes de eventos del sistema
│   │   ├── gamification/
│   │   │   └── gamificationStore.ts  # XP, niveles, logros
│   │   ├── plugins/
│   │   │   ├── PluginManager.ts # Ciclo de vida, migraciones, CoreAPI
│   │   │   ├── PluginRegistry.ts # Registro estático build-time
│   │   │   └── PluginContext.tsx # React Context + hook usePluginAPI
│   │   ├── state/
│   │   │   ├── authStore.ts     # Estado global de autenticación
│   │   │   └── coreStore.ts     # Perfil, ajustes, plugins activos
│   │   ├── storage/
│   │   │   └── StorageAPI.ts    # Helpers seguros sobre window.storage
│   │   └── ui/                  # Componentes de shell
│   │       ├── auth/            # Pantallas de autenticación
│   │       ├── Shell.tsx        # Layout principal
│   │       ├── Sidebar.tsx      # Navegación colapsable
│   │       ├── Dashboard.tsx    # Panel principal con widgets
│   │       ├── QuickActionsBar.tsx
│   │       ├── SystemStatusHero.tsx
│   │       ├── GamificationBar.tsx
│   │       ├── GlobalProgress.tsx
│   │       ├── RecentActivityFeed.tsx
│   │       ├── SystemSuggestions.tsx
│   │       ├── pages/
│   │       │   ├── PlannerPage.tsx
│   │       │   ├── NotesPage.tsx
│   │       │   └── LinksPage.tsx
│   │       └── onboarding/      # Wizard de configuración inicial
│   └── plugins/                 # Plugins cargados dinámicamente
│       ├── fitness/             # Plugin de salud y hábitos
│       └── work/                # Plugin de productividad y foco
├── electron.vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Plugins disponibles

### Fitness
Seguimiento diario de peso, comidas, ejercicios, sueño y cigarrillos. Incluye gráficos históricos, tabla de medidas corporales y resumen mensual.

### Work (Execution Engine)
Kanban board, notas y enlaces, con un motor de sesiones de foco. Permite activar una sesión activa por tarea, registrar duración y eficiencia, y ver actividad reciente en tiempo real. El widget `Resumen Trabajo` sintetiza estado del tablero, foco del día y señales operativas clave.

## Gamificación

El sistema asigna XP por acciones:

| Acción | Puntos |
|--------|--------|
| Entrada diaria fitness | +5 |
| Entrenamiento completado | +25 |
| Tarea de trabajo completada | +10 |
| Sesión de foco completada | +5 |
| Sesión de foco interrumpida | −2 |
| Misión Planner core (baja) | +5 |
| Misión Planner core (media) | +10 |
| Misión Planner core (alta) | +16 |

Cada 100 puntos sube un nivel. Los logros se desbloquean por hitos acumulados.

Desde la versión `1.2.0`, el sistema incluye misión diaria core del Planner y persistencia extendida de estado de misión/racha.

## Autenticación y multiusuario

Desde v1.3.0, Personal OS incluye un **sistema de autenticación completamente local** con soporte multiusuario:

- **NEW · Registro seguro**: username, contraseña (8+ chars) y pregunta secreta personalizada.
- **NEW · Aislamiento total**: cada usuario tiene su propia base de datos, configuración y plugins.
- **NEW · Auto-login**: las sesiones persistentes se restauran automáticamente al abrir la app.
- **NEW · Recuperación**: reset de contraseña mediante pregunta secreta.
- **NEW · Sin backend**: funcionamiento 100% local y offline.
- **NEW · UX-friendly**: mensajes de error claros en español y validación progresiva.

### Datos técnicos

- **Hasheado**: `scrypt` + salt aleatorio (16 bytes), digest de 64 bytes.
- **Sesiones**: persistidas en `auth.db` con revocación explícita.
- **Bases de datos**: `auth.db` (global) + `personal-os-user-{userId}.db` (por usuario).
- **Seguridad**: `timingSafeEqual`, context isolation y preload script.

Ver [docs/AUTH.md](docs/AUTH.md) para documentación completa.

## Dashboard y observabilidad

- `SystemStatusHero`: estado contextual del sistema con CTA dinámico según el siguiente paso pendiente.
- `SystemSuggestions`: sugerencias accionables sincronizadas con el estado real del sistema.
- `RecentActivityFeed`: timeline reciente con eventos persistidos de `fitness`, `work` y `core`, además de filtros por fuente y por últimas 24h.
- `GlobalProgress`: resumen expandido de gamificación.

## Planner core

El módulo `Planner` forma parte del core (no es plugin) y centraliza tareas diarias domésticas, recordatorios y pendientes personales.

- Ruta: `/planner`
- Persistencia: clave `corePlannerTasksV1` en `settings`
- Campos de tarea: título, categoría, complejidad, fecha y nota
- Integración con gamificación: al completar una tarea por primera vez emite evento core y asigna XP según complejidad

## Configuración por plugin en Control Center

`Control Center` incluye un panel para ajustar configuración de `Fitness` y `Work` desde el core.

- Claves de persistencia:
  - `pluginSettings:fitness`
  - `pluginSettings:work`

Esto permite centralizar configuración operativa sin entrar a páginas internas de cada plugin.

La sección aparece únicamente para plugins activos y cada bloque se oculta automáticamente cuando su plugin está desactivado.

## Evolución de documentación

A medida que crece la documentación técnica, el proyecto incluye un plan para migrar a una knowledge base web versionada.

- Plan: [docs/KNOWLEDGE_BASE_PLAN.md](docs/KNOWLEDGE_BASE_PLAN.md)
- Guía de estructura base de plugins: [docs/PLUGIN_BASE_STRUCTURE.md](docs/PLUGIN_BASE_STRUCTURE.md)

## Seguridad

- **Context Isolation**: el renderer no tiene acceso directo a Node.js
- **Sandbox**: proceso renderer con sandbox habilitado
- **Validación IPC**: toda SQL enviada al main process se valida (tipo, operación, parámetros)
- **Allowlist de tablas/columnas**: `StorageAPI` solo permite acceso a columnas explícitamente declaradas
- **Sin eval ni innerHTML**: UI construida con JSX declarativo

## Base de datos

SQLite con WAL mode.

- `auth.db`: usuarios y sesiones globales.
- `personal-os-user-{userId}.db`: datos aislados por usuario.
- Migraciones versionadas por plugin y aplicadas automáticamente al arranque.
- Si existe una base legacy `personal-os.db`, el primer usuario registrado la reclama automáticamente.

Ver [docs/DATABASE.md](docs/DATABASE.md) para el esquema completo.

## Documentación técnica

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Arquitectura general del sistema
- [docs/AUTH.md](docs/AUTH.md) — Sistema de autenticación multiusuario y seguridad
- [docs/PLUGINS.md](docs/PLUGINS.md) — Sistema de plugins y cómo crear uno
- [docs/PLUGIN_BASE_STRUCTURE.md](docs/PLUGIN_BASE_STRUCTURE.md) — Estructura base estándar e integración de plugins
- [docs/DATABASE.md](docs/DATABASE.md) — Esquema SQL completo
- [docs/EVENTS.md](docs/EVENTS.md) — Catálogo de eventos del sistema
- [docs/GAMIFICATION.md](docs/GAMIFICATION.md) — Sistema de gamificación
- [docs/KNOWLEDGE_BASE_PLAN.md](docs/KNOWLEDGE_BASE_PLAN.md) — Roadmap para llevar documentación a sitio web
