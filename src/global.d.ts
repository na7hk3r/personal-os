import type { StorageBridge } from '@core/types'

declare global {
  interface Window {
    storage: StorageBridge
  }
}

export {}
