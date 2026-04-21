# Personal OS

Versión actual: `1.2.0`

Sistema operativo personal — aplicación de escritorio para productividad y salud, construida con Electron + React + SQLite.

## ¿Qué es?

Personal OS es una aplicación modular que centraliza el seguimiento de hábitos de salud (fitness) y la gestión del trabajo (kanban, notas, foco) en una interfaz unificada con gamificación integrada.

## Novedades recientes

- Dashboard principal reequilibrado y colapso de módulos corregido para `KPIs Fitness` y `Resumen Trabajo`.
- Nuevo módulo core `Planner` (`/planner`) con:
	- to-do diario por categorías,
	- vista mensual y semanal,
	- filtros por estado y categoría,
	- drag and drop de tareas entre días.
- Las tareas del Planner core se integran con gamificación como misión diaria y otorgan XP por complejidad.
- `Control Center` incorpora configuración por plugin (Fitness y Work), persistida en `settings`.
- `Actividad Reciente` y la capa de gamificación consumen eventos de Fitness, Work y Core, incluyendo `CORE_PLANNER_TASK_COMPLETED`.

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

- Node.js 18+
- npm 9+

## Instalación y desarrollo

```bash
# Instalar dependencias
npm install

# Modo desarrollo (abre ventana Electron con HMR)
npm run dev

# Build de producción
npm run build

# Preview del build
npm start

# Verificación de tipos TypeScript
npm run typecheck
```

## Estructura del proyecto

```
personal-os/
├── electron/                    # Proceso principal Electron
│   ├── main.ts                  # Inicialización de ventana y servicios
│   ├── preload.ts               # Context Bridge (window.storage)
│   └── services/
│       ├── database.ts          # Singleton DatabaseService (SQLite)
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
│   │   │   └── coreStore.ts     # Perfil, ajustes, plugins activos
│   │   ├── storage/
│   │   │   └── StorageAPI.ts    # Helpers seguros sobre window.storage
│   │   └── ui/                  # Componentes de shell
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

## Seguridad

- **Context Isolation**: el renderer no tiene acceso directo a Node.js
- **Sandbox**: proceso renderer con sandbox habilitado
- **Validación IPC**: toda SQL enviada al main process se valida (tipo, operación, parámetros)
- **Allowlist de tablas/columnas**: `StorageAPI` solo permite acceso a columnas explícitamente declaradas
- **Sin eval ni innerHTML**: UI construida con JSX declarativo

## Base de datos

SQLite con WAL mode. El archivo se guarda en `userData/data/personal-os.db`. Las migraciones son versionadas por plugin y se aplican automáticamente en el arranque.

Ver [docs/DATABASE.md](docs/DATABASE.md) para el esquema completo.

## Documentación técnica

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Arquitectura general del sistema
- [docs/PLUGINS.md](docs/PLUGINS.md) — Sistema de plugins y cómo crear uno
- [docs/DATABASE.md](docs/DATABASE.md) — Esquema SQL completo
- [docs/EVENTS.md](docs/EVENTS.md) — Catálogo de eventos del sistema
- [docs/GAMIFICATION.md](docs/GAMIFICATION.md) — Sistema de gamificación
