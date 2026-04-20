"use strict";
const electron = require("electron");
const path = require("path");
const Database = require("better-sqlite3");
const fs = require("fs");
const CHANNELS = {
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
  electron.ipcMain.handle(CHANNELS.query, (_event, sql, params) => {
    return withStorageErrorHandling(() => {
      assertSqlString(sql);
      assertParamsArray(params);
      assertSingleStatement(sql);
      assertAllowedOperation(sql, QUERY_OPERATIONS, CHANNELS.query);
      return db.query(sql, params ?? []);
    });
  });
  electron.ipcMain.handle(CHANNELS.execute, (_event, sql, params) => {
    return withStorageErrorHandling(() => {
      assertSqlString(sql);
      assertParamsArray(params);
      assertSingleStatement(sql);
      assertAllowedOperation(sql, EXECUTE_OPERATIONS, CHANNELS.execute);
      return db.execute(sql, params ?? []);
    });
  });
  electron.ipcMain.handle(CHANNELS.migrate, (_event, pluginId, migrations) => {
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
class DatabaseService {
  static instance;
  db = null;
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
    const dbPath = path.join(dbDir, "personal-os.db");
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.db.exec(CORE_SCHEMA);
  }
  query(sql, params = []) {
    if (!this.db) throw new Error("Database not initialized");
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }
  execute(sql, params = []) {
    if (!this.db) throw new Error("Database not initialized");
    const stmt = this.db.prepare(sql);
    const result = stmt.run(...params);
    return {
      changes: result.changes,
      lastInsertRowid: Number(result.lastInsertRowid)
    };
  }
  runMigrations(pluginId, migrations) {
    if (!this.db) throw new Error("Database not initialized");
    const applied = this.db.prepare("SELECT version FROM _migrations WHERE plugin_id = ?").all(pluginId);
    const appliedVersions = new Set(applied.map((r) => r.version));
    const pending = migrations.filter((m) => !appliedVersions.has(m.version)).sort((a, b) => a.version - b.version);
    const runInTransaction = this.db.transaction(() => {
      for (const migration of pending) {
        this.db.exec(migration.up);
        this.db.prepare("INSERT INTO _migrations (plugin_id, version) VALUES (?, ?)").run(pluginId, migration.version);
      }
    });
    runInTransaction();
  }
  close() {
    this.db?.close();
  }
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
  registerStorageIpc(db);
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
