"use strict";
const electron = require("electron");
const storageBridge = {
  query: (sql, params) => electron.ipcRenderer.invoke("storage:query", sql, params),
  execute: (sql, params) => electron.ipcRenderer.invoke("storage:execute", sql, params),
  migrate: (pluginId, migrations) => electron.ipcRenderer.invoke("storage:migrate", pluginId, migrations)
};
electron.contextBridge.exposeInMainWorld("storage", storageBridge);
