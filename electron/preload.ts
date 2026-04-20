import { contextBridge, ipcRenderer } from 'electron'
import type { StorageBridge } from '../src/core/types'

const storageBridge: StorageBridge = {
  query: (sql, params) => ipcRenderer.invoke('storage:query', sql, params),
  execute: (sql, params) => ipcRenderer.invoke('storage:execute', sql, params),
  migrate: (pluginId, migrations) => ipcRenderer.invoke('storage:migrate', pluginId, migrations),
}

contextBridge.exposeInMainWorld('storage', storageBridge)
