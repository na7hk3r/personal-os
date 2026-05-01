import type {
  StorageBridge,
  AuthBridge,
  BackupBridge,
  OllamaBridge,
  NotificationsBridge,
  DiagnosticBridge,
  AppUpdateBridge,
  ScheduledBackupBridge,
} from '@core/types'

declare global {
  interface Window {
    storage: StorageBridge
    auth: AuthBridge
    backup: BackupBridge
    ollama: OllamaBridge
    notifications: NotificationsBridge
    diagnostic: DiagnosticBridge
    appUpdate: AppUpdateBridge
    scheduledBackup: ScheduledBackupBridge
  }

  // Inyectado por Vite (define) en build/dev. Ver electron.vite.config.ts.
  const __APP_VERSION__: string
}

export {}
