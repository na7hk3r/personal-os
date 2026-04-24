import type { StorageBridge, AuthBridge } from '@core/types'

declare global {
  interface Window {
    storage: StorageBridge
    auth: AuthBridge
  }
}

export {}
