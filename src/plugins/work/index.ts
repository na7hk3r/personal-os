import type { PluginManifest, CoreAPI } from '@core/types'
import { registerPlugin } from '@core/plugins/PluginRegistry'
import { useWorkStore } from './store'
import { WORK_EVENTS } from './events'
import { WorkDashboard } from './pages/WorkDashboard'
import { WorkSummaryWidget } from './components/WorkSummaryWidget'
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
      ? cardsRaw.map((row) => ({
        id: (row as Record<string, unknown>).id,
        columnId: (row as Record<string, unknown>).column_id,
        title: (row as Record<string, unknown>).title,
        description: (row as Record<string, unknown>).description,
        content: ((row as Record<string, unknown>).content ?? '') as string,
        labels: JSON.parse(((row as Record<string, unknown>).labels || '[]') as string),
        dueDate: (row as Record<string, unknown>).due_date,
        position: (row as Record<string, unknown>).position,
      }))
      : []

    const notes: Note[] = Array.isArray(notesRaw)
      ? notesRaw.map((row) => ({
        id: (row as Record<string, unknown>).id,
        title: (row as Record<string, unknown>).title,
        content: (row as Record<string, unknown>).content,
        tags: JSON.parse(((row as Record<string, unknown>).tags || '[]') as string),
        createdAt: (row as Record<string, unknown>).created_at,
        updatedAt: (row as Record<string, unknown>).updated_at,
      }))
      : []

    const focusSessions: FocusSession[] = Array.isArray(focusSessionsRaw)
      ? focusSessionsRaw.map((row) => ({
        id: (row as Record<string, unknown>).id,
        taskId: ((row as Record<string, unknown>).task_id ?? null) as string | null,
        startTime: Number((row as Record<string, unknown>).start_time),
        endTime: (row as Record<string, unknown>).end_time == null ? undefined : Number((row as Record<string, unknown>).end_time),
        duration: (row as Record<string, unknown>).duration == null ? undefined : Number((row as Record<string, unknown>).duration),
        interrupted: Boolean((row as Record<string, unknown>).interrupted),
      }))
      : []

    const store = useWorkStore.getState()
    store.setBoards(boards)
    store.setColumns(columns)
    store.setCards(cards)
    store.setNotes(notes)
    store.setLinks(links)
    store.setFocusSessions(focusSessions)

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
  },
}

registerPlugin(workPlugin)

export default workPlugin
