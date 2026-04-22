"use strict";
const electron = require("electron");
const storageBridge = {
  query: (sql, params) => electron.ipcRenderer.invoke("storage:query", sql, params),
  execute: (sql, params) => electron.ipcRenderer.invoke("storage:execute", sql, params),
  migrate: (pluginId, migrations) => electron.ipcRenderer.invoke("storage:migrate", pluginId, migrations)
};
const authBridge = {
  register: (payload) => electron.ipcRenderer.invoke("auth:register", payload),
  login: (username, password) => electron.ipcRenderer.invoke("auth:login", username, password),
  logout: () => electron.ipcRenderer.invoke("auth:logout"),
  me: () => electron.ipcRenderer.invoke("auth:me"),
  getRecoveryQuestion: (username) => electron.ipcRenderer.invoke("auth:get-recovery-question", username),
  resetPasswordWithRecovery: (payload) => electron.ipcRenderer.invoke("auth:reset-password-with-recovery", payload)
};
electron.contextBridge.exposeInMainWorld("storage", storageBridge);
electron.contextBridge.exposeInMainWorld("auth", authBridge);
