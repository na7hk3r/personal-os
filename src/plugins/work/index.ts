import type { PluginManifest, CoreAPI } from '@core/types'
import { registerPlugin } from '@core/plugins/PluginRegistry'
import { useWorkStore } from './store'
import { WORK_EVENTS } from './events'
import { WorkDashboard } from './pages/WorkDashboard'
import { NotesPage } from './pages/NotesPage'
import { LinksPage } from './pages/LinksPage'
import { WorkSummaryWidget } from './components/WorkSummaryWidget'
import type { Board, Column, Card, Note, Link } from './types'

const workPlugin: PluginManifest = {
  id: 'work',
  name: 'Work',
  version: '1.0.0',
  description: 'Kanban boards, notas y enlaces de trabajo',
  icon: '💼',

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
      icon: '💼',
      component: WorkDashboard,
    },
    {
      id: 'work-notes',
      pluginId: 'work',
      path: '/work/notes',
      title: 'Notas',
      icon: '📝',
      component: NotesPage,
    },
    {
      id: 'work-links',
      pluginId: 'work',
      path: '/work/links',
      title: 'Enlaces',
      icon: '🔗',
      component: LinksPage,
    },
  ],

  navItems: [
    { id: 'work-nav', pluginId: 'work', label: 'Work', icon: '💼', path: '/work', order: 20 },
    { id: 'work-notes-nav', pluginId: 'work', label: 'Notas', icon: '📝', path: '/work/notes', order: 21 },
    { id: 'work-links-nav', pluginId: 'work', label: 'Enlaces', icon: '🔗', path: '/work/links', order: 22 },
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

    const cards: Card[] = cardsRaw.map((row) => ({
      id: row.id,
      columnId: row.column_id,
      title: row.title,
      description: row.description,
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

    const store = useWorkStore.getState()
    store.setBoards(boards)
    store.setColumns(columns)
    store.setCards(cards)
    store.setNotes(notes)
    store.setLinks(links)

    api.events.on(WORK_EVENTS.TASK_COMPLETED, () => {
      api.gamification.addPoints(10, 'Tarea completada')
    })
  },
}

registerPlugin(workPlugin)

export default workPlugin
