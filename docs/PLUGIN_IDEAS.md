# Plugin Ideas — Roadmap del ecosistema

> Documento vivo. Cada bloque sirve como brief inicial para construir un plugin nuevo. Se completa con esquema de datos, eventos, vistas y cross-plugin antes de pasar a implementación.

## Convenciones

Todos los plugins deben respetar la guía base:
- Migraciones versionadas con tablas prefijadas `<pluginId>_*`
- Eventos emitidos con prefijo del dominio (ej. `FINANCE_TRANSACTION_ADDED`)
- Registro de páginas/widgets/navItems vía `CoreAPI.ui.*`
- Configuración persistida bajo `pluginSettings:<pluginId>`
- Integración con gamificación vía `CoreAPI.gamification.addPoints`
- Si producen entidades reutilizables, exponer hooks/eventos para que otros plugins (incluido Ollama) las consuman

Ver `docs/PLUGIN_BASE_STRUCTURE.md` y `docs/PLUGIN_API.md` para detalles.

---

## Prioridad 1 · Hábitos

**Objetivo**: trackear hábitos atómicos con rachas, heatmap anual y multiplicadores de XP.

**Entidades**:
- `habits_habits`: id, name, description, frequency_type ('daily'|'weekly'|'x_per_week'), target_value, unit, color, archived
- `habits_checkins`: id, habit_id, date, value, note
- `habits_reminders`: id, habit_id, time_of_day, weekdays

**Vistas**:
- Heatmap anual estilo GitHub (commit graph)
- Grid "Don't break the chain"
- Ranking de rachas activas
- Dashboard del día con check-in rápido

**Cross-plugin**:
- "10k pasos" puede leer dato de Fitness automáticamente
- "Deep work 2h" valida contra Focus Engine de Work
- "Leer 20min" cruza con Knowledge (futuro)

**Gamificación**:
- XP por check-in: +3
- Multiplicador por racha (x1.0/x1.5/x2.0/x3.0 a partir de 7/30/100 días)
- Logros: 7d, 30d, 100d, 365d, "Habit master" (10 hábitos con racha simultánea)

**Eventos**:
- `HABITS_CHECKIN_ADDED`, `HABITS_STREAK_BROKEN`, `HABITS_STREAK_MILESTONE`

**Plantillas iniciales**: rutina mañana, rutina noche, hábitos atómicos (Atomic Habits), hábitos de salud mental.

---

## Prioridad 2 · Finanzas (modo personal)

**Objetivo**: gestión de finanzas personales con cashflow, presupuestos y net worth.

**Entidades**:
- `finance_accounts`: id, name, type ('cash'|'bank'|'card'|'crypto'|'other'), currency, balance, archived
- `finance_categories`: id, name, kind ('income'|'expense'), color, icon
- `finance_transactions`: id, account_id, category_id, amount, currency, date, note, recurring_id
- `finance_recurring`: id, account_id, category_id, amount, cadence ('monthly'|'weekly'|'yearly'), next_run, active
- `finance_budgets`: id, category_id, period ('monthly'), amount, rollover
- `finance_debts`: id, name, principal, interest_rate, due_date, status

**Vistas**:
- Dashboard cashflow (ingresos vs gastos del mes)
- Calendario de vencimientos (alimenta core calendar)
- Presupuesto vs real con alertas
- Net worth histórico
- Top categorías mensual / forecast

**Cross-plugin**:
- Gasto en categoría "delivery" → evento que Fitness puede correlacionar
- Vencimiento de servicio → tarea automática en Planner
- Hábito "no gastar en X" se valida con datos reales de Finanzas
- Ollama: alerta proactiva si gasto del mes excede patrón histórico

**Gamificación**:
- XP por registrar día completo: +5
- Racha "días bajo presupuesto"
- Logros: primer mes con presupuesto cumplido, año sin descubierto

**Eventos**:
- `FINANCE_TRANSACTION_ADDED`, `FINANCE_BUDGET_EXCEEDED`, `FINANCE_RECURRING_DUE`

**Importación**: CSV bancario, OFX, plantillas por banco argentino.

---

## Prioridad 3 · Finanzas (modo empresa, extensión opcional del personal)

> Activación opt-in desde Control Center. Misma DB pero tablas adicionales y vistas paralelas.

**Entidades extra**:
- `finance_clients`, `finance_providers`
- `finance_invoices`: id, client_id, number, issue_date, due_date, status, total, tax, currency
- `finance_invoice_lines`: id, invoice_id, description, qty, unit_price
- `finance_projects`: id, name, client_id, hourly_rate (link a Time Tracking)

**Vistas extra**:
- Profitability por proyecto/cliente (cruza con Time Tracking)
- Multi-moneda con conversión histórica
- Export contable CSV / PDF facturas
- Dashboard A/R y A/P
- IVA acumulado por período

---

## Prioridad 4 · Journal & Mood (salud mental)

**Objetivo**: registro emocional diario con análisis de patrones.

**Entidades**:
- `journal_entries`: id, date, mood (1-5), energy (1-5), sleep_quality (1-5), gratitudes (json), text, tags
- `journal_emotions`: id, entry_id, emotion, intensity
- `journal_prompts`: id, prompt_text, category, last_used_at

**Vistas**:
- Heatmap de mood anual
- Timeline emocional con prompts
- Correlación mood ↔ sueño/ejercicio/foco/finanzas
- Resumen mensual generado por Ollama
- Quick check-in (5 segundos)

**Cross-plugin**:
- Lee sueño y peso de Fitness, sesiones de Focus Engine, gastos de Finanzas
- Ollama hace análisis de sentimiento local + resumen + detección de patrones
- Encriptación adicional opcional con passphrase secundaria

**Gamificación**:
- XP por entrada diaria: +5
- Racha "días con check-in emocional"
- Logros: 30/100 días de auto-conocimiento

**Eventos**:
- `JOURNAL_ENTRY_ADDED`, `JOURNAL_LOW_MOOD_STREAK` (3 días consecutivos mood ≤2 → Ollama sugiere acción)

---

## Prioridad 5 · Goals / OKRs (meta-plugin)

**Objetivo**: capa meta que vincula KPIs de otros plugins en objetivos trimestrales/anuales.

**Entidades**:
- `goals_objectives`: id, title, period ('q1'|'q2'|'q3'|'q4'|'year'), year, status
- `goals_key_results`: id, objective_id, name, source ('fitness.weight'|'finance.savings'|'habits.streak'|'work.focus_hours'|'manual'), target_value, current_value
- `goals_milestones`: id, kr_id, value, achieved_at

**Vistas**:
- Dashboard OKR con progreso visual
- Vista trimestral
- Histórico de cumplimiento

**Cross-plugin**: lee KPIs de cualquier plugin registrado vía `CoreAPI.metrics.publish(metricId, value)` (futuro core).

**Gamificación**: bonus XP grande al cumplir un OKR; multiplicador por OKR completado en período.

---

## Prioridad 6 · Knowledge / Learning (PKM ligero)

**Objetivo**: organizar aprendizaje con cursos, libros, highlights y SRS.

**Entidades**:
- `knowledge_resources`: id, type ('book'|'course'|'paper'|'article'|'video'), title, author, source_url, status, started_at, finished_at
- `knowledge_highlights`: id, resource_id, text, page, note, tags
- `knowledge_flashcards`: id, front, back, deck, ease, interval, next_review (algoritmo SM-2)
- `knowledge_reviews`: id, flashcard_id, reviewed_at, quality

**Vistas**:
- Reading queue
- Highlight stream
- Flashcard review diario
- Stats de aprendizaje

**Cross-plugin**:
- Highlight → tarea Work
- Review diario → hábito (Habits)
- Tiempo de estudio → Focus Engine
- Ollama: genera flashcards desde highlights, resúmenes de libros

---

## Prioridad 7 · Time Tracking + Calendario externo

**Objetivo**: time tracking manual o automático desde Focus Engine, con import/export de calendarios.

**Entidades**:
- `time_entries`: id, project_id, task_id, start, end, duration, billable, source ('manual'|'focus')
- `time_projects`: id, name, client_id, hourly_rate
- `time_calendar_events` (cache de import): id, source ('ics'|'gcal'), external_id, title, start, end, attendees

**Vistas**:
- Timesheet semanal
- Reporte facturable mensual (alimenta Finanzas empresa)
- Heatmap de horas productivas
- Calendar import (.ics / Google Calendar opcional con OAuth offline)

**Cross-plugin**:
- Auto-entries desde sesiones de Focus
- Reporte facturable → factura draft en Finanzas
- Eventos importados → core calendar unificado

---

## Prioridad 8 · Inventario / Mantenimiento

**Objetivo**: tracking de posesiones con vencimientos.

**Entidades**:
- `inventory_items`: id, name, category, purchase_date, warranty_end, location, value, notes
- `inventory_maintenances`: id, item_id, type, last_done, frequency_days, next_due

**Vistas**:
- Catálogo con filtros
- Calendario de mantenimientos (alimenta core calendar)
- Alertas de garantía próxima a vencer

**Cross-plugin**:
- Mantenimiento próximo → tarea Planner + gasto previsto Finanzas

---

## Prioridad 9 · CRM personal / Relaciones

**Objetivo**: mantener relaciones con frecuencia deseada.

**Entidades**:
- `crm_contacts`: id, name, relation_type, email, phone, birthday, last_contact_at, desired_frequency_days, notes
- `crm_interactions`: id, contact_id, date, type ('call'|'message'|'meeting'), note

**Vistas**:
- Contactos por "tiempo desde último contacto"
- Birthdays / aniversarios
- Timeline por persona

**Cross-plugin**:
- "No hablás con X hace Nd" → sugerencia Ollama o tarea Planner
- Birthdays → core calendar

---

## Prioridad 10 · Salud médica

**Objetivo**: complementar Fitness (performance) con salud clínica.

**Entidades**:
- `health_medications`: id, name, dose, frequency, start_date, end_date, active
- `health_med_intakes`: id, medication_id, taken_at
- `health_symptoms`: id, date, name, intensity, note
- `health_appointments`: id, doctor, specialty, date, location, notes
- `health_studies`: id, name, date, file_path, results

**Vistas**:
- Recordatorios de toma de medicación (notificaciones nativas)
- Próximos turnos
- Historial de síntomas

**Cross-plugin**:
- Recordatorio de toma → notificación nativa (core notifications)
- Síntoma severo → entrada Journal automática
- Turno → core calendar

---

## Prioridad 11 · Travel / Viajes

**Objetivo**: planificar y vivenciar viajes.

**Entidades**:
- `travel_trips`: id, name, destination, start_date, end_date, budget, status
- `travel_itinerary`: id, trip_id, day, time, title, location, notes, type
- `travel_packing`: id, trip_id, item, packed
- `travel_memories`: id, trip_id, date, text, file_path

**Cross-plugin**:
- Presupuesto del viaje → cuenta o categoría dedicada en Finanzas
- Itinerario → core calendar
- Checklist pre-viaje → Planner
- Memorias → Journal

---

## Plantillas de ideas (futuro)

- **Reading Tracker** (subset de Knowledge si se quiere algo más liviano)
- **Workshop / Eventos asistidos** (subset de Knowledge)
- **Recetas + Meal Planner** (extensión Fitness alimentación)
- **Música / Listening Habits** (cuantificado del yo expandido)
- **Plant Care / Mascotas** (cuidado periódico tipo inventario)

---

## Decisiones globales del ecosistema

- **AI (Ollama)**: pieza central. Cualquier plugin nuevo debe definir qué métricas / texto puede aportar al contexto que se envía a Ollama para sugerencias.
- **Sync**: roadmap lejano. Plugins deben ser idempotentes para soportar futura sync.
- **Modo empresa de Finanzas**: opt-in desde Control Center. No se carga si el usuario no lo activa.
- **Marketplace**: catálogo curado por ahora; sin instalación dinámica de plugins de terceros.
- **Mobile**: roadmap lejano; plugins deben mantener UI desacoplada de lógica para facilitar reuso.
- **i18n**: ES por ahora. Los strings nuevos quedan hardcoded en español; se centralizarán cuando se abra a EN.
