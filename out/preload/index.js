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
const backupBridge = {
  exportPlain: () => electron.ipcRenderer.invoke("backup:export-plain"),
  exportEncrypted: (passphrase) => electron.ipcRenderer.invoke("backup:export-encrypted", passphrase),
  importPlain: () => electron.ipcRenderer.invoke("backup:import-plain"),
  importEncrypted: (passphrase) => electron.ipcRenderer.invoke("backup:import-encrypted", passphrase)
};
const ollamaBridge = {
  health: () => electron.ipcRenderer.invoke("ollama:health"),
  listModels: () => electron.ipcRenderer.invoke("ollama:list-models"),
  generate: (req) => electron.ipcRenderer.invoke("ollama:generate", req)
};
const notificationsBridge = {
  isSupported: () => electron.ipcRenderer.invoke("notifications:supported"),
  show: (payload) => electron.ipcRenderer.invoke("notifications:show", payload)
};
electron.contextBridge.exposeInMainWorld("storage", storageBridge);
electron.contextBridge.exposeInMainWorld("auth", authBridge);
electron.contextBridge.exposeInMainWorld("backup", backupBridge);
electron.contextBridge.exposeInMainWorld("ollama", ollamaBridge);
electron.contextBridge.exposeInMainWorld("notifications", notificationsBridge);
