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
    const boards = await api.storage.query('SELECT * FROM work_boards') as Board[]
    const columns = await api.storage.query('SELECT * FROM work_columns ORDER BY position ASC') as Column[]
    const cardsRaw = await api.storage.query('SELECT * FROM work_cards ORDER BY position ASC') as any[]
    const notesRaw = await api.storage.query('SELECT * FROM work_notes ORDER BY updated_at DESC') as any[]
    const links = await api.storage.query('SELECT * FROM work_links') as Link[]
    const focusSessionsRaw = await api.storage.query('SELECT * FROM work_focus_sessions ORDER BY start_time DESC') as any[]

    const cards: Card[] = cardsRaw.map((row) => ({
      id: row.id,
      columnId: row.column_id,
      title: row.title,
      description: row.description,
      content: row.content ?? '',
      labels: JSON.parse(row.labels || '[]'),
      dueDate: row.due_date,
      position: row.position,
    }))

    const notes: Note[] = notesRaw.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      tags: JSON.parse(row.tags || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    const focusSessions: FocusSession[] = focusSessionsRaw.map((row) => ({
      id: row.id,
      taskId: row.task_id ?? null,
      startTime: Number(row.start_time),
      endTime: row.end_time == null ? undefined : Number(row.end_time),
      duration: row.duration == null ? undefined : Number(row.duration),
      interrupted: Boolean(row.interrupted),
    }))

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
