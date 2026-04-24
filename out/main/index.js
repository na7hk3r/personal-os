"use strict";
const electron = require("electron");
const path = require("path");
const url = require("url");
const Database = require("better-sqlite3");
const fs = require("fs");
const crypto = require("crypto");
const CHANNELS$4 = {
  query: "storage:query",
  execute: "storage:execute",
  migrate: "storage:migrate"
};
const QUERY_OPERATIONS = /* @__PURE__ */ new Set(["SELECT", "WITH", "PRAGMA"]);
const EXECUTE_OPERATIONS = /* @__PURE__ */ new Set(["INSERT", "UPDATE", "DELETE"]);
const MIGRATION_OPERATIONS = /* @__PURE__ */ new Set(["CREATE", "ALTER", "DROP", "INSERT", "UPDATE", "DELETE"]);
function normalizeSql(sql) {
  return sql.trim().replace(/;+\s*$/, "");
}
function assertParamsArray(params) {
  if (params !== void 0 && !Array.isArray(params)) {
    throw new Error("params must be an array");
  }
}
function assertSqlString(sql) {
  if (typeof sql !== "string" || normalizeSql(sql).length === 0) {
    throw new Error("sql must be a non-empty string");
  }
}
function getSqlStatements(sql) {
  return normalizeSql(sql).split(";").map((part) => part.trim()).filter(Boolean);
}
function getSqlOperation(sql) {
  const token = normalizeSql(sql).split(/\s+/)[0];
  return (token ?? "").toUpperCase();
}
function assertSingleStatement(sql) {
  if (getSqlStatements(sql).length !== 1) {
    throw new Error("only a single SQL statement is allowed for this channel");
  }
}
function assertAllowedOperation(sql, allowed, channel) {
  const operation = getSqlOperation(sql);
  if (!allowed.has(operation)) {
    throw new Error(`${channel} does not allow '${operation || "UNKNOWN"}' statements`);
  }
}
function assertPluginId(pluginId) {
  if (typeof pluginId !== "string" || !/^[a-z][a-z0-9_-]*$/.test(pluginId)) {
    throw new Error("pluginId is invalid");
  }
}
function extractTableNames(statement) {
  const normalized = statement.replace(/\s+/g, " ").trim();
  const patterns = [
    /\bCREATE\s+(?:UNIQUE\s+)?INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+[`"']?([A-Za-z_][A-Za-z0-9_]*)[`"']?\s+ON\s+[`"']?([A-Za-z_][A-Za-z0-9_]*)[`"']?/i,
    /\bCREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+[`"']?([A-Za-z_][A-Za-z0-9_]*)[`"']?/i,
    /\bALTER\s+TABLE\s+[`"']?([A-Za-z_][A-Za-z0-9_]*)[`"']?/i,
    /\bDROP\s+(?:TABLE|INDEX)(?:\s+IF\s+EXISTS)?\s+[`"']?([A-Za-z_][A-Za-z0-9_]*)[`"']?/i,
    /\bINSERT\s+(?:OR\s+\w+\s+)?INTO\s+[`"']?([A-Za-z_][A-Za-z0-9_]*)[`"']?/i,
    /\bUPDATE\s+[`"']?([A-Za-z_][A-Za-z0-9_]*)[`"']?/i,
    /\bDELETE\s+FROM\s+[`"']?([A-Za-z_][A-Za-z0-9_]*)[`"']?/i
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      const table = match[2] ?? match[1];
      return table ? [table.toLowerCase()] : [];
    }
  }
  return [];
}
function assertTablesBelongToPlugin(statement, pluginId, version) {
  const tables = extractTableNames(statement);
  if (tables.length === 0) {
    throw new Error(`migration ${version} could not resolve target table for statement`);
  }
  const prefix = `${pluginId.toLowerCase()}_`;
  for (const table of tables) {
    if (!table.startsWith(prefix)) {
      throw new Error(
        `migration ${version} touches table '${table}' outside plugin namespace '${prefix}'`
      );
    }
  }
}
function assertMigrations(migrations, pluginId) {
  if (!Array.isArray(migrations) || migrations.length === 0) {
    throw new Error("migrations must be a non-empty array");
  }
  const seenVersions = /* @__PURE__ */ new Set();
  for (const migration of migrations) {
    if (typeof migration !== "object" || migration === null || typeof migration.version !== "number" || !Number.isInteger(migration.version) || migration.version <= 0) {
      throw new Error("each migration must contain a positive integer version");
    }
    const version = migration.version;
    if (seenVersions.has(version)) {
      throw new Error(`duplicate migration version ${version}`);
    }
    seenVersions.add(version);
    const up = migration.up;
    if (typeof up !== "string" || normalizeSql(up).length === 0) {
      throw new Error(`migration ${version} must define a non-empty up SQL string`);
    }
    const statements = getSqlStatements(up);
    if (statements.length === 0) {
      throw new Error(`migration ${version} does not contain executable SQL statements`);
    }
    for (const statement of statements) {
      const operation = getSqlOperation(statement);
      if (!MIGRATION_OPERATIONS.has(operation)) {
        throw new Error(`migration ${version} contains disallowed '${operation || "UNKNOWN"}' operation`);
      }
      assertTablesBelongToPlugin(statement, pluginId, version);
    }
  }
}
function withStorageErrorHandling(fn) {
  try {
    return fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown storage error";
    throw new Error(`Storage IPC validation failed: ${message}`);
  }
}
function registerStorageIpc(db) {
  electron.ipcMain.handle(CHANNELS$4.query, (_event, sql, params) => {
    return withStorageErrorHandling(() => {
      assertSqlString(sql);
      assertParamsArray(params);
      assertSingleStatement(sql);
      assertAllowedOperation(sql, QUERY_OPERATIONS, CHANNELS$4.query);
      return db.query(sql, params ?? []);
    });
  });
  electron.ipcMain.handle(CHANNELS$4.execute, (_event, sql, params) => {
    return withStorageErrorHandling(() => {
      assertSqlString(sql);
      assertParamsArray(params);
      assertSingleStatement(sql);
      assertAllowedOperation(sql, EXECUTE_OPERATIONS, CHANNELS$4.execute);
      return db.execute(sql, params ?? []);
    });
  });
  electron.ipcMain.handle(CHANNELS$4.migrate, (_event, pluginId, migrations) => {
    return withStorageErrorHandling(() => {
      assertPluginId(pluginId);
      assertMigrations(migrations, pluginId);
      db.runMigrations(pluginId, migrations);
    });
  });
}
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
`;
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
`;
class DatabaseService {
  static instance;
  authDb = null;
  userDb = null;
  dataDir = null;
  activeUserId = null;
  static getInstance() {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }
  initialize() {
    const userDataPath = electron.app.getPath("userData");
    const dbDir = path.join(userDataPath, "data");
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const authDbPath = path.join(dbDir, "auth.db");
    this.authDb = new Database(authDbPath);
    this.authDb.pragma("journal_mode = WAL");
    this.authDb.pragma("foreign_keys = ON");
    this.authDb.pragma("busy_timeout = 5000");
    this.authDb.exec(AUTH_SCHEMA);
    this.dataDir = dbDir;
  }
  getLegacyDbPath() {
    if (!this.dataDir) throw new Error("Database not initialized");
    return path.join(this.dataDir, "personal-os.db");
  }
  getUserDbPath(userId) {
    if (!this.dataDir) throw new Error("Database not initialized");
    return path.join(this.dataDir, `personal-os-user-${userId}.db`);
  }
  hasLegacySingleUserDb() {
    return fs.existsSync(this.getLegacyDbPath());
  }
  claimLegacyDbForUser(userId) {
    const legacyPath = this.getLegacyDbPath();
    const userDbPath = this.getUserDbPath(userId);
    if (!fs.existsSync(legacyPath) || fs.existsSync(userDbPath)) {
      return;
    }
    fs.renameSync(legacyPath, userDbPath);
  }
  setActiveUser(userId) {
    if (this.activeUserId === userId && this.userDb) {
      return;
    }
    this.userDb?.close();
    this.userDb = new Database(this.getUserDbPath(userId));
    this.userDb.pragma("journal_mode = WAL");
    this.userDb.pragma("foreign_keys = ON");
    this.userDb.pragma("busy_timeout = 5000");
    this.userDb.exec(CORE_SCHEMA);
    this.activeUserId = userId;
  }
  clearActiveUser() {
    this.userDb?.close();
    this.userDb = null;
    this.activeUserId = null;
  }
  getActiveUserId() {
    return this.activeUserId;
  }
  authQuery(sql, params = []) {
    if (!this.authDb) throw new Error("Auth database not initialized");
    const stmt = this.authDb.prepare(sql);
    return stmt.all(...params);
  }
  authExecute(sql, params = []) {
    if (!this.authDb) throw new Error("Auth database not initialized");
    const stmt = this.authDb.prepare(sql);
    const result = stmt.run(...params);
    return {
      changes: result.changes,
      lastInsertRowid: Number(result.lastInsertRowid)
    };
  }
  query(sql, params = []) {
    if (!this.userDb) throw new Error("No active user session");
    const stmt = this.userDb.prepare(sql);
    return stmt.all(...params);
  }
  execute(sql, params = []) {
    if (!this.userDb) throw new Error("No active user session");
    const stmt = this.userDb.prepare(sql);
    const result = stmt.run(...params);
    return {
      changes: result.changes,
      lastInsertRowid: Number(result.lastInsertRowid)
    };
  }
  runMigrations(pluginId, migrations) {
    if (!this.userDb) throw new Error("No active user session");
    const applied = this.userDb.prepare("SELECT version FROM _migrations WHERE plugin_id = ?").all(pluginId);
    const appliedVersions = new Set(applied.map((r) => r.version));
    const pending = migrations.filter((m) => !appliedVersions.has(m.version)).sort((a, b) => a.version - b.version);
    const runInTransaction = this.userDb.transaction(() => {
      for (const migration of pending) {
        this.userDb.exec(migration.up);
        this.userDb.prepare("INSERT INTO _migrations (plugin_id, version) VALUES (?, ?)").run(pluginId, migration.version);
      }
    });
    runInTransaction();
  }
  /**
   * Export the active user DB to a destination path.
   * Uses SQLite's online backup so it is safe even with active connections.
   */
  exportActiveUserDb(destinationPath) {
    if (!this.userDb) throw new Error("No active user session");
    const backupPath = destinationPath;
    try {
      this.userDb.pragma("wal_checkpoint(TRUNCATE)");
    } catch {
    }
    if (!this.activeUserId) throw new Error("No active user session");
    const sourcePath = this.getUserDbPath(this.activeUserId);
    fs.copyFileSync(sourcePath, backupPath);
  }
  /**
   * Replace the active user DB with the contents of the given file. Closes
   * the current connection, swaps the file, and reopens with CORE_SCHEMA.
   */
  importActiveUserDb(sourcePath) {
    if (!this.activeUserId) throw new Error("No active user session");
    const userId = this.activeUserId;
    this.userDb?.close();
    this.userDb = null;
    const targetPath = this.getUserDbPath(userId);
    const data = fs.readFileSync(sourcePath);
    fs.writeFileSync(targetPath, data);
    this.setActiveUser(userId);
  }
  close() {
    this.userDb?.close();
    this.authDb?.close();
  }
}
function normalizeUsername(username) {
  return username.trim().toLowerCase();
}
function assertUsername(username) {
  if (!username.trim()) {
    throw new Error("El nombre de usuario no puede estar vacío.");
  }
  if (username.length < 3) {
    throw new Error("El nombre de usuario debe tener al menos 3 caracteres.");
  }
  if (username.length > 32) {
    throw new Error("El nombre de usuario no puede exceder 32 caracteres.");
  }
  if (!/^[a-z0-9._-]+$/i.test(username)) {
    throw new Error("El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos.");
  }
}
function assertPassword(password) {
  if (!password) {
    throw new Error("La contraseña no puede estar vacía.");
  }
  if (password.length < 8) {
    throw new Error("La contraseña debe tener mínimo 8 caracteres.");
  }
}
function assertRecoveryQuestion(question) {
  const trimmed = question.trim();
  if (!trimmed) {
    throw new Error("La pregunta de recuperación no puede estar vacía.");
  }
  if (trimmed.length < 10) {
    throw new Error("La pregunta de recuperación debe tener mínimo 10 caracteres.");
  }
}
function assertRecoveryAnswer(answer) {
  const trimmed = answer.trim();
  if (!trimmed) {
    throw new Error("La respuesta de recuperación no puede estar vacía.");
  }
  if (trimmed.length < 2) {
    throw new Error("La respuesta de recuperación debe tener mínimo 2 caracteres.");
  }
}
function hashSecret(secret) {
  const salt = crypto.randomBytes(16);
  const digest = crypto.scryptSync(secret, salt, 64);
  return `${salt.toString("hex")}:${digest.toString("hex")}`;
}
function verifySecret(secret, encodedHash) {
  const [saltHex, digestHex] = encodedHash.split(":");
  if (!saltHex || !digestHex) {
    return false;
  }
  const computed = crypto.scryptSync(secret, Buffer.from(saltHex, "hex"), 64);
  const expected = Buffer.from(digestHex, "hex");
  if (computed.length !== expected.length) {
    return false;
  }
  return crypto.timingSafeEqual(computed, expected);
}
function mapAuthUser(row) {
  return {
    id: row.id,
    username: row.username,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at
  };
}
class AuthService {
  constructor(db) {
    this.db = db;
  }
  db;
  currentUser = null;
  currentSessionId = null;
  getUserByUsername(username) {
    const rows = this.db.authQuery(
      `SELECT id, username, password_hash, recovery_question, recovery_answer_hash, created_at, last_login_at
       FROM users
       WHERE username = ?
       LIMIT 1`,
      [normalizeUsername(username)]
    );
    return rows[0] ?? null;
  }
  activateSession(user) {
    this.currentUser = user;
    this.db.setActiveUser(user.id);
  }
  createSession(userId) {
    this.db.authExecute(
      `UPDATE sessions
       SET revoked_at = datetime('now')
       WHERE revoked_at IS NULL`,
      []
    );
    const sessionId = crypto.randomUUID();
    this.db.authExecute(
      `INSERT INTO sessions (id, user_id, created_at, last_seen_at)
       VALUES (?, ?, datetime('now'), datetime('now'))`,
      [sessionId, userId]
    );
    this.currentSessionId = sessionId;
  }
  touchSession(sessionId) {
    this.db.authExecute(
      `UPDATE sessions
       SET last_seen_at = datetime('now')
       WHERE id = ?`,
      [sessionId]
    );
  }
  async register(params) {
    const username = normalizeUsername(params.username);
    assertUsername(username);
    assertPassword(params.password);
    assertRecoveryQuestion(params.recoveryQuestion);
    assertRecoveryAnswer(params.recoveryAnswer);
    const existing = this.getUserByUsername(username);
    if (existing) {
      throw new Error("Este nombre de usuario ya está en uso. Elige otro.");
    }
    const usersCountRows = this.db.authQuery("SELECT COUNT(*) as count FROM users");
    const isFirstUser = (usersCountRows[0]?.count ?? 0) === 0;
    const userId = crypto.randomUUID();
    this.db.authExecute(
      `INSERT INTO users (
        id,
        username,
        password_hash,
        recovery_question,
        recovery_answer_hash,
        created_at,
        updated_at,
        last_login_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))`,
      [
        userId,
        username,
        hashSecret(params.password),
        params.recoveryQuestion.trim(),
        hashSecret(params.recoveryAnswer.trim().toLowerCase())
      ]
    );
    if (isFirstUser && this.db.hasLegacySingleUserDb()) {
      this.db.claimLegacyDbForUser(userId);
    }
    const userRows = this.db.authQuery(
      `SELECT id, username, password_hash, recovery_question, recovery_answer_hash, created_at, last_login_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );
    const row = userRows[0];
    if (!row) {
      throw new Error("No se pudo completar el registro. Intenta de nuevo.");
    }
    const user = mapAuthUser(row);
    this.createSession(user.id);
    this.activateSession(user);
    return user;
  }
  async login(username, password) {
    const userRow = this.getUserByUsername(username);
    if (!userRow || !verifySecret(password, userRow.password_hash)) {
      throw new Error("El nombre de usuario o contraseña es incorrecto.");
    }
    this.db.authExecute(
      `UPDATE users
       SET last_login_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`,
      [userRow.id]
    );
    const updatedRow = {
      ...userRow,
      last_login_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const user = mapAuthUser(updatedRow);
    this.createSession(user.id);
    this.activateSession(user);
    return user;
  }
  async getCurrentUser() {
    if (this.currentUser && this.currentSessionId) {
      this.touchSession(this.currentSessionId);
      return this.currentUser;
    }
    const sessionRows = this.db.authQuery(
      `SELECT id, user_id
       FROM sessions
       WHERE revoked_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      []
    );
    const session = sessionRows[0];
    if (!session) {
      return null;
    }
    const userRows = this.db.authQuery(
      `SELECT id, username, password_hash, recovery_question, recovery_answer_hash, created_at, last_login_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [session.user_id]
    );
    const userRow = userRows[0];
    if (!userRow) {
      return null;
    }
    this.currentSessionId = session.id;
    const user = mapAuthUser(userRow);
    this.activateSession(user);
    this.touchSession(session.id);
    return user;
  }
  async logout() {
    if (this.currentSessionId) {
      this.db.authExecute(
        `UPDATE sessions
         SET revoked_at = datetime('now')
         WHERE id = ?`,
        [this.currentSessionId]
      );
    }
    this.currentSessionId = null;
    this.currentUser = null;
    this.db.clearActiveUser();
  }
  async getRecoveryQuestion(username) {
    const user = this.getUserByUsername(username);
    return user?.recovery_question ?? null;
  }
  async resetPasswordWithRecovery(params) {
    assertPassword(params.newPassword);
    assertRecoveryAnswer(params.recoveryAnswer);
    const user = this.getUserByUsername(params.username);
    if (!user) {
      throw new Error("No encontramos ese nombre de usuario. Verifica e intenta de nuevo.");
    }
    const answerOk = verifySecret(params.recoveryAnswer.trim().toLowerCase(), user.recovery_answer_hash);
    if (!answerOk) {
      throw new Error("La respuesta de recuperación es incorrecta. Intenta de nuevo.");
    }
    this.db.authExecute(
      `UPDATE users
       SET password_hash = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [hashSecret(params.newPassword), user.id]
    );
    this.db.authExecute(
      `UPDATE sessions
       SET revoked_at = datetime('now')
       WHERE user_id = ? AND revoked_at IS NULL`,
      [user.id]
    );
    if (this.currentUser?.id === user.id) {
      this.currentSessionId = null;
      this.currentUser = null;
      this.db.clearActiveUser();
    }
  }
}
const CHANNELS$3 = {
  register: "auth:register",
  login: "auth:login",
  logout: "auth:logout",
  me: "auth:me",
  getRecoveryQuestion: "auth:get-recovery-question",
  resetPasswordWithRecovery: "auth:reset-password-with-recovery"
};
function assertString(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} is required`);
  }
}
function withAuthErrorHandling(fn) {
  return fn().catch((error) => {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(typeof error === "string" ? error : "Error de autenticación");
  });
}
function registerAuthIpc(authService) {
  electron.ipcMain.handle(CHANNELS$3.register, (_event, payload) => {
    return withAuthErrorHandling(async () => {
      if (typeof payload !== "object" || payload === null) {
        throw new Error("payload is required");
      }
      const data = payload;
      assertString(data.username, "username");
      assertString(data.password, "password");
      assertString(data.recoveryQuestion, "recoveryQuestion");
      assertString(data.recoveryAnswer, "recoveryAnswer");
      return authService.register({
        username: data.username,
        password: data.password,
        recoveryQuestion: data.recoveryQuestion,
        recoveryAnswer: data.recoveryAnswer
      });
    });
  });
  electron.ipcMain.handle(CHANNELS$3.login, (_event, username, password) => {
    return withAuthErrorHandling(async () => {
      assertString(username, "username");
      assertString(password, "password");
      return authService.login(username, password);
    });
  });
  electron.ipcMain.handle(CHANNELS$3.logout, () => {
    return withAuthErrorHandling(async () => {
      await authService.logout();
    });
  });
  electron.ipcMain.handle(CHANNELS$3.me, () => {
    return withAuthErrorHandling(async () => authService.getCurrentUser());
  });
  electron.ipcMain.handle(CHANNELS$3.getRecoveryQuestion, (_event, username) => {
    return withAuthErrorHandling(async () => {
      assertString(username, "username");
      return authService.getRecoveryQuestion(username);
    });
  });
  electron.ipcMain.handle(
    CHANNELS$3.resetPasswordWithRecovery,
    (_event, payload) => {
      return withAuthErrorHandling(async () => {
        if (typeof payload !== "object" || payload === null) {
          throw new Error("payload is required");
        }
        const data = payload;
        assertString(data.username, "username");
        assertString(data.recoveryAnswer, "recoveryAnswer");
        assertString(data.newPassword, "newPassword");
        await authService.resetPasswordWithRecovery({
          username: data.username,
          recoveryAnswer: data.recoveryAnswer,
          newPassword: data.newPassword
        });
      });
    }
  );
}
const CHANNELS$2 = {
  exportPlain: "backup:export-plain",
  exportEncrypted: "backup:export-encrypted",
  importPlain: "backup:import-plain",
  importEncrypted: "backup:import-encrypted"
};
const MAGIC = Buffer.from("POS-BAK1");
const ALGO = "aes-256-gcm";
const KEY_LEN = 32;
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;
function deriveKey(passphrase, salt) {
  return crypto.scryptSync(passphrase, salt, KEY_LEN, { N: 16384, r: 8, p: 1 });
}
function encrypt(payload, passphrase) {
  const salt = crypto.randomBytes(SALT_LEN);
  const iv = crypto.randomBytes(IV_LEN);
  const key = deriveKey(passphrase, salt);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([MAGIC, salt, iv, tag, encrypted]);
}
function decrypt(blob, passphrase) {
  if (blob.length < MAGIC.length + SALT_LEN + IV_LEN + TAG_LEN) {
    throw new Error("Backup file is too small or corrupted");
  }
  const magic = blob.subarray(0, MAGIC.length);
  if (!magic.equals(MAGIC)) {
    throw new Error("Invalid backup format");
  }
  let offset = MAGIC.length;
  const salt = blob.subarray(offset, offset + SALT_LEN);
  offset += SALT_LEN;
  const iv = blob.subarray(offset, offset + IV_LEN);
  offset += IV_LEN;
  const tag = blob.subarray(offset, offset + TAG_LEN);
  offset += TAG_LEN;
  const encrypted = blob.subarray(offset);
  const key = deriveKey(passphrase, salt);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}
async function pickSavePath(defaultName) {
  const focused = electron.BrowserWindow.getFocusedWindow();
  const result = await electron.dialog.showSaveDialog(focused ?? new electron.BrowserWindow({ show: false }), {
    title: "Guardar backup de Personal OS",
    defaultPath: defaultName
  });
  return result.canceled || !result.filePath ? null : result.filePath;
}
async function pickOpenPath() {
  const focused = electron.BrowserWindow.getFocusedWindow();
  const result = await electron.dialog.showOpenDialog(focused ?? new electron.BrowserWindow({ show: false }), {
    title: "Restaurar backup de Personal OS",
    properties: ["openFile"]
  });
  return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
}
function registerBackupIpc(db) {
  electron.ipcMain.handle(CHANNELS$2.exportPlain, async () => {
    const stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const dest = await pickSavePath(`personal-os-backup-${stamp}.db`);
    if (!dest) return { ok: false, canceled: true };
    db.exportActiveUserDb(dest);
    return { ok: true, path: dest };
  });
  electron.ipcMain.handle(CHANNELS$2.exportEncrypted, async (_event, passphrase) => {
    if (typeof passphrase !== "string" || passphrase.length < 8) {
      throw new Error("La passphrase debe tener al menos 8 caracteres");
    }
    const stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const dest = await pickSavePath(`personal-os-backup-${stamp}.posbak`);
    if (!dest) return { ok: false, canceled: true };
    const tmp = `${dest}.tmp.db`;
    db.exportActiveUserDb(tmp);
    try {
      const data = fs.readFileSync(tmp);
      const blob = encrypt(data, passphrase);
      fs.writeFileSync(dest, blob);
    } finally {
      try {
        if (fs.existsSync(tmp)) {
          fs.writeFileSync(tmp, "");
        }
      } catch {
      }
    }
    return { ok: true, path: dest };
  });
  electron.ipcMain.handle(CHANNELS$2.importPlain, async () => {
    const src = await pickOpenPath();
    if (!src) return { ok: false, canceled: true };
    db.importActiveUserDb(src);
    return { ok: true };
  });
  electron.ipcMain.handle(CHANNELS$2.importEncrypted, async (_event, passphrase) => {
    if (typeof passphrase !== "string" || passphrase.length < 1) {
      throw new Error("Ingresá la passphrase usada al exportar");
    }
    const src = await pickOpenPath();
    if (!src) return { ok: false, canceled: true };
    const blob = fs.readFileSync(src);
    const data = decrypt(blob, passphrase);
    const tmp = `${src}.decrypted.tmp.db`;
    fs.writeFileSync(tmp, data);
    db.importActiveUserDb(tmp);
    try {
      fs.writeFileSync(tmp, "");
    } catch {
    }
    return { ok: true };
  });
}
const CHANNELS$1 = {
  health: "ollama:health",
  generate: "ollama:generate",
  listModels: "ollama:list-models"
};
const DEFAULT_BASE = "http://127.0.0.1:11434";
function getBase() {
  return process.env.OLLAMA_BASE_URL?.trim() || DEFAULT_BASE;
}
function postJson(path2, body, timeoutMs = 6e4) {
  return new Promise((resolve, reject) => {
    const req = electron.net.request({
      method: "POST",
      url: `${getBase()}${path2}`
    });
    req.setHeader("Content-Type", "application/json");
    const chunks = [];
    const timer = setTimeout(() => {
      try {
        req.abort();
      } catch {
      }
      reject(new Error(`Ollama request timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    req.on("response", (response) => {
      response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      response.on("end", () => {
        clearTimeout(timer);
        const text = Buffer.concat(chunks).toString("utf-8");
        if (response.statusCode && response.statusCode >= 400) {
          reject(new Error(`Ollama HTTP ${response.statusCode}: ${text}`));
          return;
        }
        try {
          resolve(JSON.parse(text));
        } catch (err) {
          reject(new Error(`Ollama response is not valid JSON: ${err.message}`));
        }
      });
      response.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
    req.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    req.write(JSON.stringify(body));
    req.end();
  });
}
function getJson(path2, timeoutMs = 5e3) {
  return new Promise((resolve, reject) => {
    const req = electron.net.request({ method: "GET", url: `${getBase()}${path2}` });
    const chunks = [];
    const timer = setTimeout(() => {
      try {
        req.abort();
      } catch {
      }
      reject(new Error(`Ollama request timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    req.on("response", (response) => {
      response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      response.on("end", () => {
        clearTimeout(timer);
        const text = Buffer.concat(chunks).toString("utf-8");
        if (response.statusCode && response.statusCode >= 400) {
          reject(new Error(`Ollama HTTP ${response.statusCode}: ${text}`));
          return;
        }
        try {
          resolve(JSON.parse(text));
        } catch (err) {
          reject(new Error(`Ollama response is not valid JSON: ${err.message}`));
        }
      });
      response.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
    req.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    req.end();
  });
}
function registerOllamaIpc() {
  electron.ipcMain.handle(CHANNELS$1.health, async () => {
    try {
      await getJson("/api/tags", 3e3);
      return { ok: true, baseUrl: getBase() };
    } catch (err) {
      return { ok: false, baseUrl: getBase(), error: err.message };
    }
  });
  electron.ipcMain.handle(CHANNELS$1.listModels, async () => {
    const data = await getJson("/api/tags", 5e3);
    return data.models?.map((m) => ({ name: m.name, size: m.size, modifiedAt: m.modified_at })) ?? [];
  });
  electron.ipcMain.handle(CHANNELS$1.generate, async (_event, payload) => {
    if (!payload || typeof payload !== "object") {
      throw new Error("Payload inválido");
    }
    const req = payload;
    if (typeof req.model !== "string" || req.model.length === 0) {
      throw new Error("model requerido");
    }
    if (typeof req.prompt !== "string" || req.prompt.length === 0) {
      throw new Error("prompt requerido");
    }
    const body = {
      model: req.model,
      prompt: req.prompt,
      system: req.system,
      stream: false,
      options: req.options ?? {}
    };
    const result = await postJson(
      "/api/generate",
      body,
      12e4
    );
    return { text: result.response, durationMs: result.total_duration ? Math.round(result.total_duration / 1e6) : void 0 };
  });
}
const CHANNELS = {
  show: "notifications:show",
  isSupported: "notifications:supported"
};
function registerNotificationsIpc() {
  electron.ipcMain.handle(CHANNELS.isSupported, () => electron.Notification.isSupported());
  electron.ipcMain.handle(CHANNELS.show, (_event, payload) => {
    if (!electron.Notification.isSupported()) return { ok: false, reason: "not-supported" };
    if (!payload || typeof payload !== "object") {
      throw new Error("Payload inválido");
    }
    const p = payload;
    if (typeof p.title !== "string" || p.title.length === 0) {
      throw new Error("title requerido");
    }
    const n = new electron.Notification({
      title: p.title,
      body: p.body ?? "",
      silent: p.silent === true
    });
    n.show();
    return { ok: true };
  });
}
let mainWindow = null;
const rendererUrl = process.env.ELECTRON_RENDERER_URL;
const isDebugDevtoolsEnabled = process.env.ELECTRON_DEBUG_DEVTOOLS === "true";
const ALLOWED_EXTERNAL_PROTOCOLS = /* @__PURE__ */ new Set(["https:", "http:", "mailto:"]);
function isSafeExternalUrl(rawUrl) {
  try {
    const parsed = new url.URL(rawUrl);
    return ALLOWED_EXTERNAL_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}
function isAllowedNavigationTarget(rawUrl) {
  try {
    const parsed = new url.URL(rawUrl);
    if (parsed.protocol === "file:") return true;
    if (rendererUrl) {
      const dev = new url.URL(rendererUrl);
      return parsed.origin === dev.origin;
    }
    return false;
  } catch {
    return false;
  }
}
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    titleBarStyle: "hiddenInset",
    show: false
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });
  if (rendererUrl && isDebugDevtoolsEnabled) {
    mainWindow.webContents.openDevTools();
  }
  if (rendererUrl) {
    mainWindow.loadURL(rendererUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.on("web-contents-created", (_event, contents) => {
  contents.setWindowOpenHandler(({ url: url2 }) => {
    if (isSafeExternalUrl(url2)) {
      void electron.shell.openExternal(url2);
    }
    return { action: "deny" };
  });
  contents.on("will-navigate", (event, url2) => {
    if (!isAllowedNavigationTarget(url2)) {
      event.preventDefault();
      if (isSafeExternalUrl(url2)) {
        void electron.shell.openExternal(url2);
      }
    }
  });
  contents.on("will-attach-webview", (event) => {
    event.preventDefault();
  });
});
electron.app.whenReady().then(() => {
  const db = DatabaseService.getInstance();
  db.initialize();
  const authService = new AuthService(db);
  registerStorageIpc(db);
  registerAuthIpc(authService);
  registerBackupIpc(db);
  registerOllamaIpc();
  registerNotificationsIpc();
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
