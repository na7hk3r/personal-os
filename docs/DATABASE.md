# Esquema de base de datos

Base de datos SQLite con WAL mode. Archivo: `{userData}/data/personal-os.db`.

## Tablas del core

### `profile`

Perfil del usuario. Siempre existe la fila con `id = 1`.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INTEGER PK | Siempre 1 |
| `name` | TEXT | Nombre del usuario |
| `height` | REAL | Altura en cm |
| `age` | INTEGER | Edad |
| `start_date` | TEXT | Fecha de inicio (ISO 8601) |
| `weight_goal` | REAL | Peso objetivo en kg |
| `created_at` | TEXT | Timestamp de creación |
| `updated_at` | TEXT | Timestamp de última actualización |

### `settings`

Pares clave-valor para configuración persistida.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `key` | TEXT PK | Clave de la configuración |
| `value` | TEXT | Valor serializado (JSON si es complejo) |

**Claves conocidas:**

| Clave | Tipo de valor | Descripción |
|-------|---------------|-------------|
| `theme` | string | Tema visual activo |
| `sidebarCollapsed` | `"true"` / `"false"` | Estado del sidebar |
| `onboardingComplete` | `"true"` / `"false"` | Si completó el onboarding |
| `activePlugins` | JSON array | IDs de plugins activos |
| `gamificationState` | JSON object | Snapshot persistido de gamificación (`points`, `level`, `streak`, `history`, `unlockedIds`) |

### `events_log`

Registro inmutable de todos los eventos emitidos con persistencia activa.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INTEGER PK AUTOINCREMENT | ID del evento |
| `event_type` | TEXT NOT NULL | Nombre del evento (ej. `WORK_TASK_COMPLETED`) |
| `source` | TEXT NOT NULL | Plugin o sistema de origen |
| `payload` | TEXT | JSON con datos del evento |
| `created_at` | TEXT | Timestamp de emisión |

### `plugin_state`

Estado genérico clave-valor por plugin. Clave compuesta `(plugin_id, key)`.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `plugin_id` | TEXT NOT NULL | ID del plugin |
| `key` | TEXT NOT NULL | Clave del estado |
| `value` | TEXT | Valor serializado |

### `_migrations`

Tracking de migraciones aplicadas. Clave compuesta `(plugin_id, version)`.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `plugin_id` | TEXT NOT NULL | ID del plugin |
| `version` | INTEGER NOT NULL | Número de versión de la migración |
| `applied_at` | TEXT | Timestamp de aplicación |

---

## Tablas del plugin Fitness

### `fitness_daily_entries`

Una fila por día de registro.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INTEGER PK AUTOINCREMENT | ID del registro |
| `date` | TEXT UNIQUE NOT NULL | Fecha YYYY-MM-DD |
| `day_name` | TEXT | Nombre del día (ej. "Lunes") |
| `weight` | REAL | Peso en kg (nullable) |
| `breakfast` | INTEGER DEFAULT 0 | 1 si desayunó, 0 si no |
| `lunch` | INTEGER DEFAULT 0 | 1 si almorzó, 0 si no |
| `snack` | INTEGER DEFAULT 0 | 1 si meriendó, 0 si no |
| `dinner` | INTEGER DEFAULT 0 | 1 si cenó, 0 si no |
| `workout` | TEXT | `'A'`, `'B'`, `'R'` (descanso) o `''` |
| `cigarettes` | INTEGER DEFAULT 0 | Cantidad de cigarrillos |
| `sleep` | REAL | Horas de sueño |
| `notes` | TEXT | Notas libres |
| `created_at` | TEXT | Timestamp de creación |

### `fitness_measurements`

Medidas corporales. Una fila por fecha (UNIQUE en date).

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INTEGER PK AUTOINCREMENT | ID del registro |
| `date` | TEXT UNIQUE NOT NULL | Fecha YYYY-MM-DD |
| `weight` | REAL | Peso en kg (nullable) |
| `arm_relaxed` | REAL | Bíceps relajado en cm |
| `arm_flexed` | REAL | Bíceps contraído en cm |
| `chest` | REAL | Pecho en cm |
| `waist` | REAL | Cintura en cm |
| `leg` | REAL | Pierna en cm |
| `created_at` | TEXT | Timestamp de creación |

---

## Tablas del plugin Work

### `work_boards`

Tableros Kanban.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | TEXT PK | UUID o identificador |
| `name` | TEXT NOT NULL | Nombre del tablero |

**Dato semilla (migración v2):** `id='default', name='Principal'`

### `work_columns`

Columnas dentro de un tablero.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | TEXT PK | UUID |
| `board_id` | TEXT NOT NULL | FK a `work_boards.id` |
| `name` | TEXT NOT NULL | Nombre de la columna |
| `position` | INTEGER DEFAULT 0 | Orden de izquierda a derecha |

**Columnas semilla (migración v2):**

| id | name | position |
|----|------|----------|
| `col-backlog` | Backlog | 0 |
| `col-todo` | Por hacer | 1 |
| `col-progress` | En progreso | 2 |
| `col-done` | Hecho | 3 |

### `work_cards`

Tarjetas / tareas.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | TEXT PK | UUID |
| `column_id` | TEXT NOT NULL | FK a `work_columns.id` |
| `title` | TEXT NOT NULL | Título de la tarea |
| `description` | TEXT DEFAULT '' | Descripción breve |
| `content` | TEXT DEFAULT '' | Contenido extendido (Markdown) |
| `labels` | TEXT DEFAULT '[]' | JSON array de strings |
| `due_date` | TEXT | Fecha límite ISO 8601 (nullable) |
| `position` | INTEGER DEFAULT 0 | Orden dentro de la columna |

### `work_notes`

Notas de trabajo.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | TEXT PK | UUID |
| `title` | TEXT NOT NULL | Título |
| `content` | TEXT DEFAULT '' | Contenido (Markdown) |
| `tags` | TEXT DEFAULT '[]' | JSON array de strings |
| `created_at` | TEXT | Timestamp de creación |
| `updated_at` | TEXT | Timestamp de última edición |

### `work_links`

Bookmarks de trabajo.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | TEXT PK | UUID |
| `title` | TEXT NOT NULL | Nombre del enlace |
| `url` | TEXT NOT NULL | URL completa |
| `category` | TEXT DEFAULT '' | Categoría libre |

### `work_focus_sessions`

Sesiones de foco del motor de ejecución. Creada en migración v4.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | TEXT PK | UUID de la sesión |
| `task_id` | TEXT | FK a `work_cards.id` (nullable — foco libre) |
| `start_time` | INTEGER NOT NULL | Timestamp inicio en ms (Unix epoch) |
| `end_time` | INTEGER | Timestamp fin en ms (nullable si activa) |
| `duration` | INTEGER | Duración calculada en ms (nullable si activa) |
| `interrupted` | INTEGER DEFAULT 0 | 1 si fue interrumpida, 0 si completada |

**Índices:**
- `idx_work_focus_sessions_task_id` — búsquedas por tarea
- `idx_work_focus_sessions_start_time` — ordenamiento cronológico y filtro por día

**Regla de negocio:** Solo puede haber una sesión activa global (sin `end_time`) a la vez. Iniciar una nueva sesión interrumpe automáticamente la anterior.

---

## Notas sobre tipos de datos

- **Fechas en texto** (`TEXT`): formato ISO 8601 (`YYYY-MM-DD` o datetime completo). SQLite no tiene tipo DATE nativo.
- **Timestamps de foco** (`INTEGER`): milisegundos Unix (`Date.now()`), para aritmética de duración eficiente.
- **Booleans** (`INTEGER 0/1`): SQLite no tiene tipo BOOLEAN. Se mapea en TypeScript a `boolean` con `Boolean(row.interrupted)`.
- **Arrays JSON** (`TEXT`): etiquetas y tags se serializan como JSON. Se parsean con `JSON.parse(row.labels || '[]')`.
- **IDs de work**: `crypto.randomUUID()` — UUID v4.
- **IDs de fitness**: `INTEGER AUTOINCREMENT`.
