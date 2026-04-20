import type {
  CoreAPI,
  PluginManifest,
  PluginEntry,
  PluginStatus,
  WidgetDefinition,
  PageDefinition,
  NavItemDefinition,
} from '../types'
import { eventBus } from '../events/EventBus'
import { storageAPI } from '../storage/StorageAPI'
import { CORE_EVENTS } from '../events/events'
import { useCoreStore } from '../state/coreStore'
import { useGamificationStore } from '../gamification/gamificationStore'

class PluginManager {
  private plugins = new Map<string, PluginEntry>()
  private widgets: WidgetDefinition[] = []
  private pages: PageDefinition[] = []
  private navItems: NavItemDefinition[] = []

  constructor() {
    // Wire up persistence: all plugin events are logged to SQLite via the EventBus callback
    eventBus.setPersistenceCallback((event, payload, source) => {
      storageAPI
        .logEvent(event, source, (payload as Record<string, unknown>) ?? {})
        .catch((err) => console.error('[PluginManager] Failed to persist event:', err))
    })
  }

  private upsertById<T extends { id: string }>(collection: T[], items: T[]): T[] {
    const map = new Map(collection.map((item) => [item.id, item]))
    for (const item of items) {
      map.set(item.id, item)
    }
    return Array.from(map.values())
  }

  register(manifest: PluginManifest): void {
    const existing = this.plugins.get(manifest.id)
    if (existing) {
      existing.manifest = manifest
      return
    }
    this.plugins.set(manifest.id, { manifest, status: 'registered' })
  }

  async initPlugin(pluginId: string): Promise<void> {
    const entry = this.plugins.get(pluginId)
    if (!entry) throw new Error(`Plugin "${pluginId}" not registered`)
    if (entry.status !== 'registered' && entry.status !== 'inactive') return

    this.setStatus(pluginId, 'initializing')

    try {
      // Run migrations if any
      if (entry.manifest.migrations?.length) {
        await storageAPI.migrate(pluginId, entry.manifest.migrations)
      }

      // Build scoped CoreAPI
      const api = this.buildCoreAPI(pluginId)

      // Call plugin init
      await entry.manifest.init(api)

      // Register static UI definitions
      if (entry.manifest.widgets) {
        this.widgets = this.upsertById(this.widgets, entry.manifest.widgets)
      }
      if (entry.manifest.pages) {
        this.pages = this.upsertById(this.pages, entry.manifest.pages)
      }
      if (entry.manifest.navItems) {
        this.navItems = this.upsertById(this.navItems, entry.manifest.navItems)
      }

      this.setStatus(pluginId, 'active')
      entry.manifest.activate?.()
      eventBus.emit(CORE_EVENTS.PLUGIN_ACTIVATED, { pluginId })
    } catch (err) {
      this.setStatus(pluginId, 'error')
      entry.error = err instanceof Error ? err.message : String(err)
      console.error(`[PluginManager] Failed to init plugin "${pluginId}":`, err)
    }
  }

  deactivatePlugin(pluginId: string): void {
    const entry = this.plugins.get(pluginId)
    if (!entry || entry.status !== 'active') return

    entry.manifest.deactivate?.()

    // Remove UI registrations for this plugin
    this.widgets = this.widgets.filter((w) => w.pluginId !== pluginId)
    this.pages = this.pages.filter((p) => p.pluginId !== pluginId)
    this.navItems = this.navItems.filter((n) => n.pluginId !== pluginId)

    this.setStatus(pluginId, 'inactive')
    eventBus.emit(CORE_EVENTS.PLUGIN_DEACTIVATED, { pluginId })
  }

  // Getters
  getPlugin(id: string): PluginEntry | undefined {
    return this.plugins.get(id)
  }

  getAllPlugins(): PluginEntry[] {
    return Array.from(this.plugins.values())
  }

  getActiveWidgets(): WidgetDefinition[] {
    return [...this.widgets]
  }

  getActivePages(): PageDefinition[] {
    return [...this.pages]
  }

  getActiveNavItems(): NavItemDefinition[] {
    return [...this.navItems].sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
  }

  // Private

  private setStatus(pluginId: string, status: PluginStatus): void {
    const entry = this.plugins.get(pluginId)
    if (entry) entry.status = status
  }

  private buildCoreAPI(pluginId: string): CoreAPI {
    return {
      storage: {
        query: (sql, params) => storageAPI.query(sql, params),
        execute: (sql, params) => storageAPI.execute(sql, params),
        migrate: (pid, migrations) => storageAPI.migrate(pid, migrations),
      },
      events: {
        emit: (event, payload) => eventBus.emit(event, payload, { source: pluginId, persist: true }),
        on: (event, handler) => eventBus.on(event, handler),
        off: (event, handler) => eventBus.off(event, handler),
      },
      ui: {
        registerWidget: (widget) => {
          widget.pluginId = pluginId
          this.widgets = this.upsertById(this.widgets, [widget])
        },
        registerPage: (page) => {
          page.pluginId = pluginId
          this.pages = this.upsertById(this.pages, [page])
        },
        registerNavItem: (item) => {
          item.pluginId = pluginId
          this.navItems = this.upsertById(this.navItems, [item])
        },
      },
      getProfile: () => useCoreStore.getState().profile,
      gamification: {
        addPoints: (amount, reason) => {
          useGamificationStore.getState().addPoints(amount, reason)
        },
        checkAchievement: (achievementId) => {
          const store = useGamificationStore.getState()
          if (!store.unlockedIds.includes(achievementId)) {
            store.unlockAchievement(achievementId)
          }
        },
      },
    }
  }
}

export const pluginManager = new PluginManager()
