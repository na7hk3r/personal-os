import { contextBridge, ipcRenderer } from 'electron'
import type { StorageBridge } from '../src/core/types'
import type { AuthBridge } from '../src/core/types'

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

contextBridge.exposeInMainWorld('storage', storageBridge)
contextBridge.exposeInMainWorld('auth', authBridge)
