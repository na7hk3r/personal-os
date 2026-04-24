import type { StorageBridge, AuthBridge } from '@core/types'

declare global {
  interface Window {
    storage: StorageBridge
    auth: AuthBridge
  }

  // Inyectado por electron-vite (ver electron.vite.config.ts) desde package.json.
  // Garantiza que la versión mostrada en UI siempre coincide con el build.
  const __APP_VERSION__: string
}

export {}
