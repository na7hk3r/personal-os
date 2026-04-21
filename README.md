# Personal OS

Sistema operativo personal — aplicación de escritorio para productividad y salud, construida con Electron + React + SQLite.

## ¿Qué es?

Personal OS es una aplicación modular que centraliza el seguimiento de hábitos de salud (fitness) y la gestión del trabajo (kanban, notas, foco) en una interfaz unificada con gamificación integrada.

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
Kanban board, notas y enlaces, con un motor de sesiones de foco. Permite activar una sesión activa por tarea, registrar duración y eficiencia, y ver actividad reciente en tiempo real.

## Gamificación

El sistema asigna XP por acciones:

| Acción | Puntos |
|--------|--------|
| Entrada diaria fitness | +5 |
| Entrenamiento completado | +25 |
| Tarea de trabajo completada | +10 |
| Sesión de foco completada | +5 |
| Sesión de foco interrumpida | −2 |

Cada 100 puntos sube un nivel. Los logros se desbloquean por hitos acumulados.

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
