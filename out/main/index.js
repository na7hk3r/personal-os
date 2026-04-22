"use strict";
const electron = require("electron");
const path = require("path");
const Database = require("better-sqlite3");
const fs = require("fs");
const crypto = require("crypto");
const CHANNELS$1 = {
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
  if (typeof pluginId !== "string" || !/^[a-z0-9_-]+$/i.test(pluginId)) {
    throw new Error("pluginId is invalid");
  }
}
function assertMigrations(migrations) {
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
  electron.ipcMain.handle(CHANNELS$1.query, (_event, sql, params) => {
    return withStorageErrorHandling(() => {
      assertSqlString(sql);
      assertParamsArray(params);
      assertSingleStatement(sql);
      assertAllowedOperation(sql, QUERY_OPERATIONS, CHANNELS$1.query);
      return db.query(sql, params ?? []);
    });
  });
  electron.ipcMain.handle(CHANNELS$1.execute, (_event, sql, params) => {
    return withStorageErrorHandling(() => {
      assertSqlString(sql);
      assertParamsArray(params);
      assertSingleStatement(sql);
      assertAllowedOperation(sql, EXECUTE_OPERATIONS, CHANNELS$1.execute);
      return db.execute(sql, params ?? []);
    });
  });
  electron.ipcMain.handle(CHANNELS$1.migrate, (_event, pluginId, migrations) => {
    return withStorageErrorHandling(() => {
      assertPluginId(pluginId);
      assertMigrations(migrations);
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
const CHANNELS = {
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
    const message = error instanceof Error ? error.message : "unknown auth error";
    throw new Error(`Auth IPC failed: ${message}`);
  });
}
function registerAuthIpc(authService) {
  electron.ipcMain.handle(CHANNELS.register, (_event, payload) => {
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
  electron.ipcMain.handle(CHANNELS.login, (_event, username, password) => {
    return withAuthErrorHandling(async () => {
      assertString(username, "username");
      assertString(password, "password");
      return authService.login(username, password);
    });
  });
  electron.ipcMain.handle(CHANNELS.logout, () => {
    return withAuthErrorHandling(async () => {
      await authService.logout();
    });
  });
  electron.ipcMain.handle(CHANNELS.me, () => {
    return withAuthErrorHandling(async () => authService.getCurrentUser());
  });
  electron.ipcMain.handle(CHANNELS.getRecoveryQuestion, (_event, username) => {
    return withAuthErrorHandling(async () => {
      assertString(username, "username");
      return authService.getRecoveryQuestion(username);
    });
  });
  electron.ipcMain.handle(
    CHANNELS.resetPasswordWithRecovery,
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
let mainWindow = null;
const rendererUrl = process.env.ELECTRON_RENDERER_URL;
const isDebugDevtoolsEnabled = process.env.ELECTRON_DEBUG_DEVTOOLS === "true";
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
electron.app.whenReady().then(() => {
  const db = DatabaseService.getInstance();
  db.initialize();
  const authService = new AuthService(db);
  registerStorageIpc(db);
  registerAuthIpc(authService);
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
