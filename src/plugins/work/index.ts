import type { PluginManifest, CoreAPI } from '@core/types'
import { registerPlugin } from '@core/plugins/PluginRegistry'
import { useWorkStore } from './store'
import { WORK_EVENTS } from './events'
import { WorkDashboard } from './pages/WorkDashboard'
import { WorkSummaryWidget } from './components/WorkSummaryWidget'
import { startWorkFocusSession } from './focus'
import type { Board, Column, Card, Note, Link, FocusSession } from './types'

const workPlugin: PluginManifest = {
  id: 'work',
  name: 'Work',
  version: '1.0.0',
  description: 'Kanban boards, notas y enlaces de trabajo',
  icon: 'BriefcaseBusiness',

  migrations: [
    {
      version: 1,
      up: `
        CREATE TABLE IF NOT EXISTS work_boards (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS work_columns (
          id TEXT PRIMARY KEY,
          board_id TEXT NOT NULL,
          name TEXT NOT NULL,
          position INTEGER DEFAULT 0,
          FOREIGN KEY (board_id) REFERENCES work_boards(id)
        );
        CREATE TABLE IF NOT EXISTS work_cards (
          id TEXT PRIMARY KEY,
          column_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT DEFAULT '',
          labels TEXT DEFAULT '[]',
          due_date TEXT,
          position INTEGER DEFAULT 0,
          FOREIGN KEY (column_id) REFERENCES work_columns(id)
        );
        CREATE TABLE IF NOT EXISTS work_notes (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT DEFAULT '',
          tags TEXT DEFAULT '[]',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS work_links (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          url TEXT NOT NULL,
          category TEXT DEFAULT ''
        );
      `,
    },
    {
      version: 2,
      up: `
        INSERT OR IGNORE INTO work_boards (id, name) VALUES ('default', 'Principal');
        INSERT OR IGNORE INTO work_columns (id, board_id, name, position) VALUES
          ('col-backlog', 'default', 'Backlog', 0),
          ('col-todo', 'default', 'Por hacer', 1),
          ('col-progress', 'default', 'En progreso', 2),
          ('col-done', 'default', 'Hecho', 3);
      `,
    },
    {
      version: 3,
      up: `ALTER TABLE work_cards ADD COLUMN content TEXT DEFAULT '';`,
    },
    {
      version: 4,
      up: `
        CREATE TABLE IF NOT EXISTS work_focus_sessions (
          id TEXT PRIMARY KEY,
          task_id TEXT,
          start_time INTEGER NOT NULL,
          end_time INTEGER,
          duration INTEGER,
          interrupted INTEGER DEFAULT 0,
          FOREIGN KEY (task_id) REFERENCES work_cards(id)
        );
        CREATE INDEX IF NOT EXISTS idx_work_focus_sessions_task_id ON work_focus_sessions(task_id);
        CREATE INDEX IF NOT EXISTS idx_work_focus_sessions_start_time ON work_focus_sessions(start_time);
      `,
    },
    {
      version: 5,
      up: `
        ALTER TABLE work_focus_sessions ADD COLUMN paused_at INTEGER;
        ALTER TABLE work_focus_sessions ADD COLUMN paused_total INTEGER DEFAULT 0;
      `,
    },
    {
      version: 6,
      up: `ALTER TABLE work_notes ADD COLUMN pinned INTEGER DEFAULT 0;`,
    },
    {
      version: 7,
      up: `
        ALTER TABLE work_cards ADD COLUMN priority TEXT;
        ALTER TABLE work_cards ADD COLUMN estimate_minutes INTEGER;
        ALTER TABLE work_cards ADD COLUMN checklist TEXT DEFAULT '[]';
        ALTER TABLE work_cards ADD COLUMN archived INTEGER DEFAULT 0;
        ALTER TABLE work_cards ADD COLUMN archived_at INTEGER;
        ALTER TABLE work_columns ADD COLUMN wip_limit INTEGER;
      `,
    },
    {
      version: 8,
      up: `
        ALTER TABLE work_columns ADD COLUMN is_done INTEGER DEFAULT 0;
        UPDATE work_columns SET is_done = 1 WHERE id = 'col-done';
        UPDATE work_columns
           SET is_done = 1
         WHERE is_done = 0
           AND board_id NOT IN (SELECT DISTINCT board_id FROM work_columns WHERE is_done = 1)
           AND (LOWER(name) LIKE '%hecho%' OR LOWER(name) LIKE '%done%' OR LOWER(name) LIKE '%completad%');
      `,
    },
  ],

  widgets: [
    {
      id: 'work-summary',
      pluginId: 'work',
      title: 'Resumen Trabajo',
      component: WorkSummaryWidget,
      defaultSize: { w: 1, h: 1 },
    },
  ],

  pages: [
    {
      id: 'work-dashboard',
      pluginId: 'work',
      path: '/work',
      title: 'Work',
      icon: 'BriefcaseBusiness',
      component: WorkDashboard,
    },
  ],

  navItems: [
    { id: 'work-nav', pluginId: 'work', label: 'Work', icon: 'BriefcaseBusiness', path: '/work', order: 20 },
  ],

  events: {
    emits: Object.values(WORK_EVENTS),
    listens: [],
  },

  async init(api: CoreAPI) {
    const boards = await api.storage.query('SELECT * FROM work_boards')
    const columns = await api.storage.query('SELECT * FROM work_columns ORDER BY position ASC')
    const cardsRaw = await api.storage.query('SELECT * FROM work_cards ORDER BY position ASC')
    const notesRaw = await api.storage.query('SELECT * FROM work_notes ORDER BY updated_at DESC')
    const links = await api.storage.query('SELECT * FROM work_links')
    const focusSessionsRaw = await api.storage.query('SELECT * FROM work_focus_sessions ORDER BY start_time DESC')

    const cards: Card[] = Array.isArray(cardsRaw)
      ? cardsRaw.map((raw) => {
        const row = raw as Record<string, unknown>
        return {
          id: row.id as string,
          columnId: row.column_id as string,
          title: row.title as string,
          description: (row.description ?? '') as string,
          content: (row.content ?? '') as string,
          labels: JSON.parse((row.labels || '[]') as string) as string[],
          dueDate: (row.due_date ?? null) as string | null,
          position: row.position as number,
          priority: (row.priority ?? null) as Card['priority'],
          estimateMinutes: row.estimate_minutes == null ? null : Number(row.estimate_minutes),
          checklist: JSON.parse((row.checklist || '[]') as string) as Card['checklist'],
          archived: Boolean(row.archived),
          archivedAt: row.archived_at == null ? null : Number(row.archived_at),
        }
      })
      : []

    const parsedColumns: Column[] = Array.isArray(columns)
      ? (columns as Record<string, unknown>[]).map((row) => ({
        id: row.id as string,
        boardId: row.board_id as string,
        name: row.name as string,
        position: row.position as number,
        wipLimit: row.wip_limit == null ? null : Number(row.wip_limit),
        isDone: Boolean(row.is_done),
      }))
      : []

    const notes: Note[] = Array.isArray(notesRaw)
      ? notesRaw.map((raw) => {
        const row = raw as Record<string, unknown>
        return {
          id: row.id as string,
          title: row.title as string,
          content: (row.content ?? '') as string,
          tags: JSON.parse((row.tags || '[]') as string) as string[],
          createdAt: row.created_at as string,
          updatedAt: row.updated_at as string,
          pinned: Boolean(row.pinned),
        }
      })
      : []

    const focusSessions: FocusSession[] = Array.isArray(focusSessionsRaw)
      ? focusSessionsRaw.map((raw) => {
        const row = raw as Record<string, unknown>
        return {
          id: row.id as string,
          taskId: (row.task_id ?? null) as string | null,
          startTime: Number(row.start_time),
          endTime: row.end_time == null ? undefined : Number(row.end_time),
          duration: row.duration == null ? undefined : Number(row.duration),
          interrupted: Boolean(row.interrupted),
          pausedAt: row.paused_at == null ? null : Number(row.paused_at),
          pausedTotal: row.paused_total == null ? 0 : Number(row.paused_total),
        }
      })
      : []

    // Limpieza de sesiones "zombie": si la app se cerró con una sesión abierta
    // hace más de 8 horas, la cerramos como interrumpida con cap de 8h.
    const ZOMBIE_THRESHOLD_MS = 8 * 60 * 60 * 1000
    const now = Date.now()
    for (const session of focusSessions) {
      if (session.endTime != null) continue
      const elapsed = now - session.startTime
      if (elapsed > ZOMBIE_THRESHOLD_MS) {
        const cappedEnd = session.startTime + ZOMBIE_THRESHOLD_MS
        session.endTime = cappedEnd
        session.duration = ZOMBIE_THRESHOLD_MS
        session.interrupted = true
        session.pausedAt = null
        await api.storage.execute(
          `UPDATE work_focus_sessions
           SET end_time = ?, duration = ?, interrupted = 1, paused_at = NULL
           WHERE id = ?`,
          [cappedEnd, ZOMBIE_THRESHOLD_MS, session.id],
        )
      }
    }

    const store = useWorkStore.getState()
    store.setBoards(boards as Board[])
    store.setColumns(parsedColumns)
    store.setCards(cards)
    store.setNotes(notes)
    store.setLinks(links as Link[])
    store.setFocusSessions(focusSessions)

    // Auto-archivado: tarjetas en columna "Done/Hecho" con >7 días sin modificar.
    const DONE_ARCHIVE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000
    const doneColumnIds = parsedColumns
      .filter((col) => col.isDone || col.id === 'col-done' || /hecho|done|completad/i.test(col.name))
      .map((col) => col.id)
    const focusByTask = new Map<string, number>()
    focusSessions.forEach((s) => {
      if (!s.taskId) return
      const ts = s.endTime ?? s.startTime
      const prev = focusByTask.get(s.taskId) ?? 0
      if (ts > prev) focusByTask.set(s.taskId, ts)
    })

    const toArchive: string[] = []
    for (const card of cards) {
      if (card.archived) continue
      if (!doneColumnIds.includes(card.columnId)) continue
      const lastActivity = focusByTask.get(card.id) ?? 0
      // Si la última actividad conocida es >7d, archivar. Sin actividad => archivar igual.
      if (now - lastActivity > DONE_ARCHIVE_THRESHOLD_MS) {
        toArchive.push(card.id)
      }
    }
    if (toArchive.length > 0) {
      await Promise.all(
        toArchive.map((id) =>
          api.storage.execute(
            `UPDATE work_cards SET archived = 1, archived_at = ? WHERE id = ?`,
            [now, id],
          ),
        ),
      )
      // Reflejar en el store
      const archivedSet = new Set(toArchive)
      const updatedCards = cards.map((c) =>
        archivedSet.has(c.id) ? { ...c, archived: true, archivedAt: now } : c,
      )
      store.setCards(updatedCards)
    }

    api.events.on(WORK_EVENTS.TASK_COMPLETED, () => {
      api.gamification.addPoints(10, 'Tarea completada')
    })
    api.events.on(WORK_EVENTS.FOCUS_COMPLETED, () => {
      api.gamification.addPoints(5, 'Sesión de foco completada')
    })
    api.events.on(WORK_EVENTS.FOCUS_INTERRUPTED, () => {
      api.gamification.addPoints(-2, 'Sesión de foco interrumpida')
    })
    api.events.on(WORK_EVENTS.NOTE_CREATED, () => {
      api.gamification.addPoints(3, 'Nota creada')
    })

    // Quick action del Core: iniciar foco libre si no hay sesión.
    api.events.on('core:focus-request', () => {
      const state = useWorkStore.getState()
      if (state.currentFocusSession) return
      void startWorkFocusSession(null)
    })
  },
}

registerPlugin(workPlugin)

export default workPlugin
