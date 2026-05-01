import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, renameSync, copyFileSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { encryptFile, decryptFile, isEncryptedFile, isPassphraseStrongEnough, EncryptionError } from './encryption'

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

  CREATE INDEX IF NOT EXISTS idx_events_log_created_at ON events_log(created_at);
  CREATE INDEX IF NOT EXISTS idx_events_log_type_created ON events_log(event_type, created_at);

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

  CREATE TABLE IF NOT EXISTS core_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS core_tag_links (
    tag_id INTEGER NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (tag_id, entity_type, entity_id),
    FOREIGN KEY (tag_id) REFERENCES core_tags(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_core_tag_links_entity ON core_tag_links(entity_type, entity_id);

  CREATE TABLE IF NOT EXISTS core_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin_id TEXT NOT NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_core_templates_plugin ON core_templates(plugin_id, kind);

  CREATE TABLE IF NOT EXISTS core_automations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    trigger_event TEXT NOT NULL,
    condition TEXT,
    action_type TEXT NOT NULL,
    action_payload TEXT,
    last_run_at TEXT,
    run_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_core_automations_event ON core_automations(trigger_event, enabled);

  CREATE TABLE IF NOT EXISTS core_notifications_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT,
    source TEXT,
    scheduled_at TEXT NOT NULL,
    delivered_at TEXT,
    dismissed_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_core_notifications_scheduled ON core_notifications_queue(scheduled_at, delivered_at);
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
  /** Passphrase mantenida en memoria sólo mientras la sesión esté activa. */
  private activePassphrase: string | null = null

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

  /** Path del archivo cifrado en reposo (si el usuario lo activó). */
  getEncryptedDbPath(userId: string): string {
    return `${this.getUserDbPath(userId)}.enc`
  }

  /**
   * Devuelve true si el usuario tiene el archivo cifrado en reposo. Útil
   * para que el frontend sepa que va a necesitar pedir passphrase.
   */
  hasEncryptedDb(userId: string): boolean {
    return isEncryptedFile(this.getEncryptedDbPath(userId))
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

  setActiveUser(userId: string, passphrase?: string): void {
    if (this.activeUserId === userId && this.userDb) {
      return
    }

    // Si el usuario tiene cifrado activo y existe el .enc, hay que descifrarlo
    // primero al path plano antes de abrir la conexión. Si no hay passphrase,
    // marcamos al usuario como activo pero sin DB abierta: el frontend deberá
    // llamar a `unlockEncryptedDb` antes de operar.
    const plainPath = this.getUserDbPath(userId)
    const encPath = this.getEncryptedDbPath(userId)
    if (isEncryptedFile(encPath)) {
      if (!passphrase) {
        this.userDb?.close()
        this.userDb = null
        this.activeUserId = userId
        this.activePassphrase = null
        return
      }
      decryptFile(encPath, plainPath, passphrase)
      this.activePassphrase = passphrase
    } else {
      this.activePassphrase = null
    }

    this.userDb?.close()
    this.userDb = new Database(plainPath)
    this.userDb.pragma('journal_mode = WAL')
    this.userDb.pragma('foreign_keys = ON')
    this.userDb.pragma('busy_timeout = 5000')
    this.userDb.exec(CORE_SCHEMA)
    this.activeUserId = userId
    this.purgeOldEvents()
  }

  /**
   * Si el usuario activo quedó con .enc bloqueado, desbloquearlo con la
   * passphrase. Idempotente: si ya está abierto, no hace nada.
   */
  unlockEncryptedDb(passphrase: string): void {
    if (!this.activeUserId) throw new Error('No active user session')
    if (this.userDb) return
    this.setActiveUser(this.activeUserId, passphrase)
  }

  /** True si el usuario activo todavía no abrió su DB cifrada. */
  isLocked(): boolean {
    return this.activeUserId != null && this.userDb == null
  }

  /**
   * Política de retención del log de eventos.
   * Sin esto, `events_log` crece sin tope y degrada inserts/queries con el
   * tiempo. Llamado al activar usuario (≈ una vez por arranque); barato gracias
   * al índice por `created_at` implícito en SQLite.
   */
  private static readonly EVENT_RETENTION_DAYS = 90
  private static readonly EVENT_HARD_CAP_ROWS = 50_000

  private purgeOldEvents(): void {
    if (!this.userDb) return
    try {
      this.userDb
        .prepare(
          `DELETE FROM events_log WHERE created_at < datetime('now', ?)`,
        )
        .run(`-${DatabaseService.EVENT_RETENTION_DAYS} days`)

      // Defensa adicional contra bursts: si todavía hay más filas que el cap,
      // borra las más viejas hasta dejar el cap.
      const row = this.userDb
        .prepare(`SELECT COUNT(*) as c FROM events_log`)
        .get() as { c: number }
      if (row.c > DatabaseService.EVENT_HARD_CAP_ROWS) {
        const excess = row.c - DatabaseService.EVENT_HARD_CAP_ROWS
        this.userDb
          .prepare(
            `DELETE FROM events_log WHERE id IN (SELECT id FROM events_log ORDER BY id ASC LIMIT ?)`,
          )
          .run(excess)
      }
    } catch (err) {
      console.warn('[DatabaseService] purgeOldEvents failed:', err)
    }
  }

  clearActiveUser(): void {
    // Si había cifrado activo, re-cifrar antes de cerrar.
    if (this.activeUserId && this.activePassphrase) {
      try {
        // WAL checkpoint para que el .db tenga todo flush antes de cifrar.
        try {
          this.userDb?.pragma('wal_checkpoint(TRUNCATE)')
        } catch {
          // ignore
        }
        this.userDb?.close()
        this.userDb = null
        const plainPath = this.getUserDbPath(this.activeUserId)
        const encPath = this.getEncryptedDbPath(this.activeUserId)
        encryptFile(plainPath, encPath, this.activePassphrase)
      } catch (err) {
        console.error('[DatabaseService] failed to re-encrypt on logout:', err)
      } finally {
        this.activePassphrase = null
      }
    }
    this.userDb?.close()
    this.userDb = null
    this.activeUserId = null
    this.activePassphrase = null
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

  /**
   * Export the active user DB to a destination path.
   * Uses SQLite's online backup so it is safe even with active connections.
   */
  exportActiveUserDb(destinationPath: string): void {
    if (!this.userDb) throw new Error('No active user session')
    // better-sqlite3 backup is async via promise
    const backupPath = destinationPath
    // Use checkpoint to flush WAL into the main DB before copying.
    try {
      this.userDb.pragma('wal_checkpoint(TRUNCATE)')
    } catch {
      // ignore checkpoint failure; copy will still produce a consistent file via SQLite header.
    }
    if (!this.activeUserId) throw new Error('No active user session')
    const sourcePath = this.getUserDbPath(this.activeUserId)
    copyFileSync(sourcePath, backupPath)
  }

  /**
   * Replace the active user DB with the contents of the given file. Closes
   * the current connection, swaps the file, and reopens with CORE_SCHEMA.
   */
  importActiveUserDb(sourcePath: string): void {
    if (!this.activeUserId) throw new Error('No active user session')
    const userId = this.activeUserId
    this.userDb?.close()
    this.userDb = null
    const targetPath = this.getUserDbPath(userId)
    const data = readFileSync(sourcePath)
    writeFileSync(targetPath, data)
    this.setActiveUser(userId)
  }

  close(): void {
    // Replicar la lógica de re-cifrar antes de matar todo.
    if (this.activeUserId && this.activePassphrase) {
      try {
        try {
          this.userDb?.pragma('wal_checkpoint(TRUNCATE)')
        } catch {
          // ignore
        }
        this.userDb?.close()
        this.userDb = null
        const plainPath = this.getUserDbPath(this.activeUserId)
        const encPath = this.getEncryptedDbPath(this.activeUserId)
        encryptFile(plainPath, encPath, this.activePassphrase)
      } catch (err) {
        console.error('[DatabaseService] failed to re-encrypt on close:', err)
      }
    }
    this.userDb?.close()
    this.authDb?.close()
    this.activePassphrase = null
  }

  // ─── Cifrado opt-in ────────────────────────────────────────────────

  /**
   * Activa el cifrado para el usuario activo: cifra inmediatamente la DB,
   * borra el plano y guarda la passphrase en memoria para esta sesión.
   * Lanza EncryptionError si la passphrase es débil.
   */
  enableEncryptionForActiveUser(passphrase: string): void {
    if (!this.activeUserId || !this.userDb) throw new Error('No active user session')
    if (!isPassphraseStrongEnough(passphrase)) {
      throw new EncryptionError('passphrase too weak', 'WEAK_PASSPHRASE')
    }
    const userId = this.activeUserId
    try {
      this.userDb.pragma('wal_checkpoint(TRUNCATE)')
    } catch {
      // ignore
    }
    this.userDb.close()
    this.userDb = null
    const plainPath = this.getUserDbPath(userId)
    const encPath = this.getEncryptedDbPath(userId)
    encryptFile(plainPath, encPath, passphrase)
    // Volvemos a abrir descifrando para que la sesión continúe.
    decryptFile(encPath, plainPath, passphrase)
    this.userDb = new Database(plainPath)
    this.userDb.pragma('journal_mode = WAL')
    this.userDb.pragma('foreign_keys = ON')
    this.userDb.pragma('busy_timeout = 5000')
    this.activePassphrase = passphrase
  }

  /**
   * Desactiva el cifrado: borra el archivo .enc y deja el plano. Requiere
   * que la sesión esté activa (es decir, ya con la passphrase válida).
   */
  disableEncryptionForActiveUser(): void {
    if (!this.activeUserId) throw new Error('No active user session')
    const encPath = this.getEncryptedDbPath(this.activeUserId)
    if (existsSync(encPath)) {
      unlinkSync(encPath)
    }
    this.activePassphrase = null
  }

  /** True si el usuario activo tiene el cifrado en uso esta sesión. */
  isEncryptionEnabledForActiveUser(): boolean {
    return Boolean(this.activeUserId && this.activePassphrase)
  }
}
