import { contextBridge, ipcRenderer } from 'electron'
import type { StorageBridge } from '../src/core/types'
import type { AuthBridge, BackupBridge, OllamaBridge, NotificationsBridge } from '../src/core/types'

const storageBridge: StorageBridge = {
  query: (sql, params) => ipcRenderer.invoke('storage:query', sql, params),
  execute: (sql, params) => ipcRenderer.invoke('storage:execute', sql, params),
  migrate: (pluginId, migrations) => ipcRenderer.invoke('storage:migrate', pluginId, migrations),
}

const authBridge: AuthBridge = {
  register: (payload) => ipcRenderer.invoke('auth:register', payload),
  login: (username, password) => ipcRenderer.invoke('auth:login', username, password),
  logout: () => ipcRenderer.invoke('auth:logout'),
  me: () => ipcRenderer.invoke('auth:me'),
  getRecoveryQuestion: (username) => ipcRenderer.invoke('auth:get-recovery-question', username),
  resetPasswordWithRecovery: (payload) => ipcRenderer.invoke('auth:reset-password-with-recovery', payload),
}

const backupBridge: BackupBridge = {
  exportPlain: () => ipcRenderer.invoke('backup:export-plain'),
  exportEncrypted: (passphrase) => ipcRenderer.invoke('backup:export-encrypted', passphrase),
  importPlain: () => ipcRenderer.invoke('backup:import-plain'),
  importEncrypted: (passphrase) => ipcRenderer.invoke('backup:import-encrypted', passphrase),
}

const ollamaBridge: OllamaBridge = {
  health: () => ipcRenderer.invoke('ollama:health'),
  listModels: () => ipcRenderer.invoke('ollama:list-models'),
  generate: (req) => ipcRenderer.invoke('ollama:generate', req),
}

const notificationsBridge: NotificationsBridge = {
  isSupported: () => ipcRenderer.invoke('notifications:supported'),
  show: (payload) => ipcRenderer.invoke('notifications:show', payload),
}

contextBridge.exposeInMainWorld('storage', storageBridge)
contextBridge.exposeInMainWorld('auth', authBridge)
contextBridge.exposeInMainWorld('backup', backupBridge)
contextBridge.exposeInMainWorld('ollama', ollamaBridge)
contextBridge.exposeInMainWorld('notifications', notificationsBridge)
