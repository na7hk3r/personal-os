import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, renameSync } from 'fs'

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

const AUTH_SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    recovery_question TEXT NOT NULL,
    recovery_answer_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    last_login_at TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    revoked_at TEXT,
    last_seen_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_revoked_at ON sessions(revoked_at);
`

export class DatabaseService {
  private static instance: DatabaseService
  private authDb: Database.Database | null = null
  private userDb: Database.Database | null = null
  private dataDir: string | null = null
  private activeUserId: string | null = null

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

    const authDbPath = join(dbDir, 'auth.db')
    this.authDb = new Database(authDbPath)
    this.authDb.pragma('journal_mode = WAL')
    this.authDb.pragma('foreign_keys = ON')
    this.authDb.pragma('busy_timeout = 5000')
    this.authDb.exec(AUTH_SCHEMA)
    this.dataDir = dbDir
  }

  getLegacyDbPath(): string {
    if (!this.dataDir) throw new Error('Database not initialized')
    return join(this.dataDir, 'personal-os.db')
  }

  getUserDbPath(userId: string): string {
    if (!this.dataDir) throw new Error('Database not initialized')
    return join(this.dataDir, `personal-os-user-${userId}.db`)
  }

  hasLegacySingleUserDb(): boolean {
    return existsSync(this.getLegacyDbPath())
  }

  claimLegacyDbForUser(userId: string): void {
    const legacyPath = this.getLegacyDbPath()
    const userDbPath = this.getUserDbPath(userId)
    if (!existsSync(legacyPath) || existsSync(userDbPath)) {
      return
    }

    renameSync(legacyPath, userDbPath)
  }

  setActiveUser(userId: string): void {
    if (this.activeUserId === userId && this.userDb) {
      return
    }

    this.userDb?.close()
    this.userDb = new Database(this.getUserDbPath(userId))
    this.userDb.pragma('journal_mode = WAL')
    this.userDb.pragma('foreign_keys = ON')
    this.userDb.pragma('busy_timeout = 5000')
    this.userDb.exec(CORE_SCHEMA)
    this.activeUserId = userId
  }

  clearActiveUser(): void {
    this.userDb?.close()
    this.userDb = null
    this.activeUserId = null
  }

  getActiveUserId(): string | null {
    return this.activeUserId
  }

  authQuery(sql: string, params: unknown[] = []): unknown[] {
    if (!this.authDb) throw new Error('Auth database not initialized')
    const stmt = this.authDb.prepare(sql)
    return stmt.all(...params)
  }

  authExecute(sql: string, params: unknown[] = []): { changes: number; lastInsertRowid: number } {
    if (!this.authDb) throw new Error('Auth database not initialized')
    const stmt = this.authDb.prepare(sql)
    const result = stmt.run(...params)
    return {
      changes: result.changes,
      lastInsertRowid: Number(result.lastInsertRowid),
    }
  }

  query(sql: string, params: unknown[] = []): unknown[] {
    if (!this.userDb) throw new Error('No active user session')
    const stmt = this.userDb.prepare(sql)
    return stmt.all(...params)
  }

  execute(sql: string, params: unknown[] = []): { changes: number; lastInsertRowid: number } {
    if (!this.userDb) throw new Error('No active user session')
    const stmt = this.userDb.prepare(sql)
    const result = stmt.run(...params)
    return {
      changes: result.changes,
      lastInsertRowid: Number(result.lastInsertRowid),
    }
  }

  runMigrations(pluginId: string, migrations: { version: number; up: string }[]): void {
    if (!this.userDb) throw new Error('No active user session')

    const applied = this.userDb
      .prepare('SELECT version FROM _migrations WHERE plugin_id = ?')
      .all(pluginId) as { version: number }[]

    const appliedVersions = new Set(applied.map((r) => r.version))

    const pending = migrations
      .filter((m) => !appliedVersions.has(m.version))
      .sort((a, b) => a.version - b.version)

    const runInTransaction = this.userDb.transaction(() => {
      for (const migration of pending) {
        this.userDb!.exec(migration.up)
        this.userDb!
          .prepare('INSERT INTO _migrations (plugin_id, version) VALUES (?, ?)')
          .run(pluginId, migration.version)
      }
    })

    runInTransaction()
  }

  close(): void {
    this.userDb?.close()
    this.authDb?.close()
  }
}
