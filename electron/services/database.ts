import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

const CORE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY DEFAULT 1,
    name TEXT,
    height REAL,
    age INTEGER,
    start_date TEXT,
    weight_goal REAL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS events_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    source TEXT NOT NULL,
    payload TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS plugin_state (
    plugin_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    PRIMARY KEY (plugin_id, key)
  );

  CREATE TABLE IF NOT EXISTS _migrations (
    plugin_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    applied_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (plugin_id, version)
  );
`

export class DatabaseService {
  private static instance: DatabaseService
  private db: Database.Database | null = null

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  initialize(): void {
    const userDataPath = app.getPath('userData')
    const dbDir = join(userDataPath, 'data')

    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true })
    }

    const dbPath = join(dbDir, 'personal-os.db')
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.db.exec(CORE_SCHEMA)
  }

  query(sql: string, params: unknown[] = []): unknown[] {
    if (!this.db) throw new Error('Database not initialized')
    const stmt = this.db.prepare(sql)
    return stmt.all(...params)
  }

  execute(sql: string, params: unknown[] = []): { changes: number; lastInsertRowid: number } {
    if (!this.db) throw new Error('Database not initialized')
    const stmt = this.db.prepare(sql)
    const result = stmt.run(...params)
    return {
      changes: result.changes,
      lastInsertRowid: Number(result.lastInsertRowid),
    }
  }

  runMigrations(pluginId: string, migrations: { version: number; up: string }[]): void {
    if (!this.db) throw new Error('Database not initialized')

    const applied = this.db
      .prepare('SELECT version FROM _migrations WHERE plugin_id = ?')
      .all(pluginId) as { version: number }[]

    const appliedVersions = new Set(applied.map((r) => r.version))

    const pending = migrations
      .filter((m) => !appliedVersions.has(m.version))
      .sort((a, b) => a.version - b.version)

    const runInTransaction = this.db.transaction(() => {
      for (const migration of pending) {
        this.db!.exec(migration.up)
        this.db!
          .prepare('INSERT INTO _migrations (plugin_id, version) VALUES (?, ?)')
          .run(pluginId, migration.version)
      }
    })

    runInTransaction()
  }

  close(): void {
    this.db?.close()
  }
}
