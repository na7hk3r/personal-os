# Plan de Refactorización UX/UI — Nora OS

> Documento vivo. Última revisión: 3 de mayo de 2026.

## I. Diagnóstico

### Problema raíz
**Sobrecarga cognitiva por feature parity.** El producto creció por capas; cada feature está bien construida individualmente, pero ninguna fue editada en relación al todo. La interfaz comunica *cuánto puede hacer* antes de comunicar *qué debería hacer el usuario ahora mismo*. Resultado: todo tiene el mismo peso visual, entonces nada tiene peso.

### Síntomas concretos verificados
- **Lenguaje mezclado** dentro de un mismo componente (`DailyMissions` muestra `"Daily Missions"` y `"Misiones del día"` en la misma card).
- **Íconos duplicados** en `Sidebar` (Planner y Calendario usan ambos `CalendarDays`).
- **Íconos semánticamente incorrectos** (Review usa `Flame`).
- **Framing invertido** en `SystemStatusHero`: habla del sistema en vez del usuario ("En ritmo / Inestable / Desconectado").
- **Nomenclatura de SO/corporativa** en una herramienta personal (`Control Center`, `Executive Suite`).
- **Gamificación fragmentada en 6 superficies**: widget sidebar, `GlobalProgress`, `DailyMissions`, `GamificationBar`, `DailyScoreScreen`, `GamificationNotificationHub`.
- **8 secciones visuales** en el Dashboard sin un único punto de entrada.
- **`SystemSuggestions` flotando** en la esquina superior derecha del Shell sin contexto.
- **`QuickActionsBar` hardcodeada** que no se adapta a los plugins activos del usuario.
- **3 controles de widget** (Ver módulo / Expandir / Colapsar) compitiendo en 40px.

---

## II. Heurísticas de Nielsen — estado actual

| # | Heurística | Estado |
|---|---|---|
| 1 | Visibilidad del estado del sistema | ❌ Framing invertido (sistema vs usuario) |
| 2 | Correspondencia con el mundo real | ❌ Jerga corporativa/SO + idioma mezclado |
| 3 | Control y libertad del usuario | ❌ Demasiados controles compitiendo |
| 4 | Consistencia y estándares | ❌ Íconos duplicados, copy inconsistente |
| 5 | Prevención de errores | ⚠️ Sin onboarding progresivo |
| 6 | Reconocimiento antes que recuerdo | ⚠️ `CommandPalette` sin discovery |
| 7 | Flexibilidad y eficiencia | ❌ Quick actions hardcodeadas |
| 8 | Diseño estético y minimalista | ❌ Dashboard con 8 regiones de foco |

---

## III. Plan por etapas (con ajustes)

### 🟢 Etapa 0 — Instrumentación (prerequisito ligero)

Antes de eliminar componentes "que parecen no usarse", agregar tracking básico vía `eventBus`:
- Cuántas veces el usuario abre cada widget.
- Qué quick actions usa efectivamente.
- Tiempo en Dashboard vs otras páginas.
- Uso de `CommandPalette` (frecuencia, comandos top).

Sin esto, las decisiones de "esto sobra" son intuición. No bloquea las etapas siguientes pero alimenta la decisión final de qué eliminar vs qué mover.

---

### 🟢 Etapa 1 — Limpieza y semántica

Reducir ruido sin tocar arquitectura. Bajo riesgo, alto impacto perceptual.

**1.1 — Unificar idioma a 100% español** (salvo términos técnicos sin traducción natural).

| Actual | Propuesto |
|---|---|
| `"Daily Missions"` | `"Misiones"` |
| `"Control Center"` | `"Configuración"` |
| `"Executive Suite"` | Nombre del usuario (`profileName`) |
| `"Review"` | `"Balance"` |

**1.2 — Corregir íconos en `Sidebar`**
- Planner: `CalendarDays` → `ListTodo`
- Review/Balance: `Flame` → `TrendingUp`

**1.3 — Mover "Atajos" fuera del nav primario** (al footer del sidebar o a Configuración).

**1.4 — Reframe de `SystemStatusHero` hacia el usuario**
- Quitar label "Estado del Sistema".
- Badges: `"Tu día va bien"` / `"Tenés pendientes"` / `"Sin registros hoy"`.

**Archivos:**
- [src/core/ui/Sidebar.tsx](src/core/ui/Sidebar.tsx)
- [src/core/ui/SystemStatusHero.tsx](src/core/ui/SystemStatusHero.tsx)
- [src/core/ui/DailyMissions.tsx](src/core/ui/DailyMissions.tsx)
- [src/core/ui/messages.ts](src/core/ui/messages.ts)

---

### 🟡 Etapa 2 — Jerarquía del Dashboard (con ajustes)

Objetivo: que el Dashboard responda una sola pregunta — **"¿Qué hago hoy?"**.

**2.1 — Reubicar `GlobalProgress` fuera del Dashboard.** Vive en la nueva página `Progreso` (ver 4.1). El Dashboard hereda solo el estado mínimo (ya visible en sidebar widget).

**2.2 — Fusionar `DailyMissions` + `MainDayTasks` en `TodayFocus`.**
> **Ajuste:** usar **secciones apiladas dentro de una sola card**, NO tabs. Tabs ocultan información y matarían el efecto de las misiones diarias como mecanismo de gamificación. Misiones más compactas si hace falta ahorrar altura.

**2.3 — `QuickActionsBar` filtrada por plugins activos (no dinámica por frecuencia).**
> **Ajuste:** descartar el ordenamiento por uso (genera UI inestable y rompe memoria muscular). Mantener acciones fijas pero filtrar por plugins activos. Considerar integrar dentro del Hero como botones secundarios.

**2.4 — `RecentActivityFeed` — versión mínima en Dashboard, completa en Progreso.**
> **Ajuste:** no eliminarlo del Dashboard del todo. Dejar feed colapsado mínimo (últimas 3 entradas, una línea cada una) porque "qué hice hoy" suele ser parte de "qué hago ahora". El feed completo vive en Progreso.

**Resultado del Dashboard:**
```
┌─────────────────────────────────────────────┐
│  Hero (saludo + estado del usuario + CTA)   │
│  [Quick actions integradas]                 │
├─────────────────────────────────────────────┤
│  TodayFocus (Tareas + Misiones)             │
├───────────────────┬─────────────────────────┤
│  Widget plugin 1  │  Widget plugin 2        │
├───────────────────┴─────────────────────────┤
│  Feed reciente (3 entradas, colapsable)     │
└─────────────────────────────────────────────┘
```

**Archivos:**
- [src/core/ui/Dashboard.tsx](src/core/ui/Dashboard.tsx)
- [src/core/ui/GlobalProgress.tsx](src/core/ui/GlobalProgress.tsx)
- [src/core/ui/DailyMissions.tsx](src/core/ui/DailyMissions.tsx) + [src/core/ui/MainDayTasks.tsx](src/core/ui/MainDayTasks.tsx) → nuevo `TodayFocus.tsx`
- [src/core/ui/QuickActionsBar.tsx](src/core/ui/QuickActionsBar.tsx)
- [src/core/ui/RecentActivityFeed.tsx](src/core/ui/RecentActivityFeed.tsx)

---

### 🟡 Etapa 3 — Navegación y Shell

**3.1 — Sidebar con grupos explícitos:**
```
Principal
  Dashboard
  Progreso       ← (ex Review/Balance)

Módulos
  [plugins activos]

Herramientas
  Notas, Enlaces, Planner, Calendario
```

**3.2 — Mover Configuración al footer del sidebar** (junto al logout, ícono `Settings`).

**3.3 — `SystemSuggestions` — darle un lugar propio** (integrar en Hero o mover al CopilotPanel; eliminar si Copilot ya cubre el rol).

**Archivos:**
- [src/core/ui/Sidebar.tsx](src/core/ui/Sidebar.tsx)
- [src/core/ui/Shell.tsx](src/core/ui/Shell.tsx)
- `src/core/ui/pages/ProgressPage.tsx` (nueva)

---

### 🔴 Etapa 4 — Gamificación cohesiva

**Pre-trabajo obligatorio:** mapear el grafo de eventos de gamificación. Qué emite XP, qué componente lo escucha, qué renderiza qué. Sin este mapa, mover componentes rompe plugins.

**4.1 — Página canónica `Progreso`.** (Nombre elegido sobre "Balance" para evitar ambigüedad financiera.) Hogar único de XP, nivel, logros, racha, historial, feed completo. Debe tener jerarquía interna propia — no ser cajón de sastre.

**4.2 — Minimizar widget sidebar de gamificación.** De 6 elementos a 3: badge de nivel + barra XP + ícono de racha (si streak > 0).

**4.3 — `DailyScoreScreen` como momento gamificación principal.** Inversión visual concentrada acá.

**4.4 — Comunicar el cambio.** Cuando movemos `GlobalProgress` del Dashboard a Progreso, mostrar toast la primera vez ("Tu progreso ahora vive en Progreso →") y nota en changelog visible.

**Archivos:**
- [src/core/ui/Sidebar.tsx](src/core/ui/Sidebar.tsx)
- [src/core/ui/GlobalProgress.tsx](src/core/ui/GlobalProgress.tsx)
- [src/core/ui/DailyScoreScreen.tsx](src/core/ui/DailyScoreScreen.tsx)
- [src/core/ui/GamificationNotificationHub.tsx](src/core/ui/GamificationNotificationHub.tsx)
- [src/core/ui/GamificationBar.tsx](src/core/ui/GamificationBar.tsx)

---

### 🟢 Etapa 5 — Polish continuo

- **5.1** Empty states con propósito en todas las listas vacías.
- **5.2** Skeletons en lugar de "Cargando…" en `Suspense` fallbacks.
- **5.3** Micro-interacciones en `DailyScoreScreen` (escala/brillo al desbloquear logro).
- **5.4** Escala tipográfica de 4 tamaños fijos (`xs`, `sm`, `base`, `lg`). Eliminar `text-[10px]`/`text-[11px]` ad-hoc.
- **5.5** Hint de discovery del `CommandPalette` (`⌘K para acceso rápido`) tras N sesiones sin uso.

---

### 🟢 Etapa 6 — Transversales (no cubiertas en versión original)

**6.1 — Responsive / breakpoints.** Auditar el Shell de 4 paneles a 1024px y abajo. Probable colapso del CopilotPanel a drawer.

**6.2 — Accesibilidad (a11y).** Aprovechar la refactorización para auditar:
- Contraste WCAG AA mínimo.
- Foco visible en todos los interactivos.
- Atajos de teclado documentados.
- `aria-label` en íconos sin texto.
- Pruebas con lector de pantalla en flujos clave (login, dashboard, command palette).

---

## IV. Resumen ejecutivo

| Etapa | Qué resuelve | Esfuerzo | Impacto |
|---|---|---|---|
| **0 — Instrumentación** | Decisiones basadas en datos | Bajo | Habilitador |
| **1 — Limpieza semántica** | Lenguaje, íconos, nav ruidoso | Bajo | Alto |
| **2 — Dashboard simplificado** | Sobrecarga cognitiva | Medio (~1 semana) | Muy alto |
| **3 — Sidebar y Shell** | Jerarquía del nav | Medio | Medio |
| **4 — Gamificación cohesiva** | Fragmentación de 6 superficies | Alto | Medio-Alto |
| **5 — Polish continuo** | Percepción de profesionalismo | Continuo | Acumulativo |
| **6 — Responsive + a11y** | Calidad transversal | Medio | Alto en su público |

**Secuencia obligatoria:** 1 → 2 → 3. Etapa 0 corre en paralelo. Etapa 4 requiere pre-mapeo de eventos. Etapa 5 es continua. Etapa 6 puede inyectarse en cualquier etapa que toque componentes relevantes.
