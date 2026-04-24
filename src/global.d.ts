import type { StorageBridge, AuthBridge, BackupBridge, OllamaBridge, NotificationsBridge } from '@core/types'

declare global {
  interface Window {
    storage: StorageBridge
    auth: AuthBridge
    backup: BackupBridge
    ollama: OllamaBridge
    notifications: NotificationsBridge
  }
}

export {}
