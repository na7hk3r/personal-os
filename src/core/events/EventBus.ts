import type { EventHandler, UnsubscribeFn } from '../types'

export class EventBus {
  private listeners = new Map<string, Set<EventHandler>>()
  private history: { event: string; payload: unknown; timestamp: number }[] = []
  private maxHistory = 100

  emit(event: string, payload?: unknown): void {
    this.history.push({ event, payload, timestamp: Date.now() })
    if (this.history.length > this.maxHistory) {
      this.history.shift()
    }

    const handlers = this.listeners.get(event)
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(payload)
        } catch (err) {
          console.error(`[EventBus] Error in handler for "${event}":`, err)
        }
      }
    }
  }

  on(event: string, handler: EventHandler): UnsubscribeFn {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler)

    return () => {
      this.off(event, handler)
    }
  }

  off(event: string, handler: EventHandler): void {
    this.listeners.get(event)?.delete(handler)
  }

  getHistory(limit = 50) {
    return this.history.slice(-limit)
  }

  clear(): void {
    this.listeners.clear()
    this.history = []
  }
}

// Singleton
export const eventBus = new EventBus()
