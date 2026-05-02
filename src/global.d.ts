import type {
  StorageBridge,
  AuthBridge,
  BackupBridge,
  OllamaBridge,
  NotificationsBridge,
  DiagnosticBridge,
  AppUpdateBridge,
  ScheduledBackupBridge,
  DbEncryptionBridge,
  ProfileBridge,
} from '@core/types'

declare global {
  interface Window {
    storage: StorageBridge
    auth: AuthBridge
    backup: BackupBridge
    profile: ProfileBridge
    ollama: OllamaBridge
    notifications: NotificationsBridge
    diagnostic: DiagnosticBridge
    appUpdate: AppUpdateBridge
    scheduledBackup: ScheduledBackupBridge
    dbEncryption: DbEncryptionBridge
  }

  // Inyectado por Vite (define) en build/dev. Ver electron.vite.config.ts.
  const __APP_VERSION__: string
}

export {}
