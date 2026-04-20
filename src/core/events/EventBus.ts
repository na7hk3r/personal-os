import type { EventHandler, UnsubscribeFn } from '../types'

type PersistFn = (event: string, payload: unknown, source: string) => void

export class EventBus {
  private listeners = new Map<string, Set<EventHandler>>()
  private history: { event: string; payload: unknown; timestamp: number }[] = []
  private maxHistory = 100
  private persistFn: PersistFn | null = null

  setPersistenceCallback(fn: PersistFn): void {
    this.persistFn = fn
  }

  emit(event: string, payload?: unknown, options?: { source?: string; persist?: boolean }): void {
    this.history.push({ event, payload, timestamp: Date.now() })
    if (this.history.length > this.maxHistory) {
      this.history.shift()
    }

    if (this.persistFn && options?.source && options?.persist !== false) {
      try {
        this.persistFn(event, payload, options.source)
      } catch (err) {
        console.error(`[EventBus] Error persisting event "${event}":`, err)
      }
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
