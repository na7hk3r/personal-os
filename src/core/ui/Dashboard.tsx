import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, Maximize2, Minimize2, Puzzle, SlidersHorizontal, Zap } from 'lucide-react'
import { pluginManager } from '../plugins/PluginManager'
import { SystemStatusHero } from './SystemStatusHero'
import { QuickActionsBar } from './QuickActionsBar'
import { GlobalProgress } from './GlobalProgress'
import { DailyMissions } from './DailyMissions'
import { MainDayTasks } from './MainDayTasks'
import { RecentActivityFeed } from './RecentActivityFeed'
import { SystemSuggestions } from './SystemSuggestions'
import { DashboardFooter } from './DashboardFooter'
import { useGamificationStore } from '@core/gamification/gamificationStore'

const DASHBOARD_LAYOUT_SETTINGS_KEY = 'dashboardLayoutState'

interface DashboardLayoutState {
  collapsedModules: Record<string, boolean>
  expandedModuleId: string | null
  activityCollapsed: boolean
  widgetOrder: string[]
}

function mergeWidgetsByOrder<T extends { id: string }>(widgets: T[], order: string[]): T[] {
  if (order.length === 0) return widgets

  const byId = new Map(widgets.map((widget) => [widget.id, widget]))
  const inOrder: T[] = []

  for (const id of order) {
    const widget = byId.get(id)
    if (widget) inOrder.push(widget)
    byId.delete(id)
  }

  return [...inOrder, ...Array.from(byId.values())]
}

function moveToFront<T extends { id: string }>(widgets: T[], id: string | null): T[] {
  if (!id) return widgets
  const index = widgets.findIndex((widget) => widget.id === id)
  if (index <= 0) return widgets
  const clone = [...widgets]
  const [target] = clone.splice(index, 1)
  clone.unshift(target)
  return clone
}

export function Dashboard() {
  const navigate = useNavigate()
  const missions = useGamificationStore((s) => s.dailyMissions)
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({})
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null)
  const [activityCollapsed, setActivityCollapsed] = useState(false)
  const [widgetOrder, setWidgetOrder] = useState<string[]>([])
  const widgets = pluginManager.getActiveWidgets()
  const navItems = pluginManager.getActiveNavItems()
  const allPlugins = pluginManager.getAllPlugins()
  const hasDailyMissions = missions.length > 0

  const hasFitnessKpi = widgets.some((w) => w.id === 'fitness-kpi')
  const hasWorkSummary = widgets.some((w) => w.id === 'work-summary')
  const useStackedPrimaryLayout = widgets.length === 2 && hasFitnessKpi && hasWorkSummary

  const baseWidgets = useStackedPrimaryLayout
    ? [...widgets].sort((a, b) => {
      const orderMap: Record<string, number> = {
        'fitness-kpi': 0,
        'work-summary': 1,
      }
      return (orderMap[a.id] ?? 99) - (orderMap[b.id] ?? 99)
    })
    : widgets

  const orderedWidgets = moveToFront(mergeWidgetsByOrder(baseWidgets, widgetOrder), expandedModuleId)

  // Map pluginId → first navItem path for click navigation
  const pluginPath: Record<string, string> = {}
  for (const item of navItems) {
    if (!pluginPath[item.pluginId]) pluginPath[item.pluginId] = item.path
  }

  const toggleModule = (id: string) => {
    setCollapsedModules((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))

    if (expandedModuleId === id) {
      setExpandedModuleId(null)
    }
  }

  const toggleExpandModule = (id: string) => {
    setExpandedModuleId((prev) => (prev === id ? null : id))
    setWidgetOrder((prev) => {
      const filtered = prev.filter((item) => item !== id)
      return [id, ...filtered]
    })
    setCollapsedModules((prev) => ({
      ...prev,
      [id]: false,
    }))
  }

  useEffect(() => {
    if (!window.storage) return

    void window.storage
      .query(
        `SELECT value FROM settings WHERE key = ? LIMIT 1`,
        [DASHBOARD_LAYOUT_SETTINGS_KEY],
      )
      .then((rows) => {
        const list = rows as { value: string }[]
        const raw = list[0]?.value
        if (!raw) return

        const parsed = JSON.parse(raw) as Partial<DashboardLayoutState>
        if (parsed.collapsedModules && typeof parsed.collapsedModules === 'object') {
          setCollapsedModules(parsed.collapsedModules)
        }
        if (typeof parsed.expandedModuleId === 'string' || parsed.expandedModuleId === null) {
          setExpandedModuleId(parsed.expandedModuleId)
        }
        if (typeof parsed.activityCollapsed === 'boolean') {
          setActivityCollapsed(parsed.activityCollapsed)
        }
        if (Array.isArray(parsed.widgetOrder)) {
          setWidgetOrder(parsed.widgetOrder.filter((item): item is string => typeof item === 'string'))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setWidgetOrder((prev) => {
      const validIds = new Set(baseWidgets.map((widget) => widget.id))
      const filtered = prev.filter((id) => validIds.has(id))
      if (filtered.length === prev.length) return prev
      return filtered
    })

    if (expandedModuleId && !baseWidgets.some((widget) => widget.id === expandedModuleId)) {
      setExpandedModuleId(null)
    }
  }, [baseWidgets, expandedModuleId])

  useEffect(() => {
    if (!window.storage) return

    const payload: DashboardLayoutState = {
      collapsedModules,
      expandedModuleId,
      activityCollapsed,
      widgetOrder,
    }

    void window.storage.execute(
      `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
      [DASHBOARD_LAYOUT_SETTINGS_KEY, JSON.stringify(payload)],
    )
  }, [collapsedModules, expandedModuleId, activityCollapsed, widgetOrder])

  return (
    <div className="space-y-5">
      {/* 1. Hero */}
      <SystemStatusHero />

      {/* 2. Quick Actions */}
      <QuickActionsBar />

      {/* 3. Global Progress + Daily Missions */}
      {hasDailyMissions ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <GlobalProgress />
          </div>
          <div className="xl:col-span-1 flex flex-col gap-4">
            <DailyMissions />
            <MainDayTasks />
          </div>
        </div>
      ) : (
        <GlobalProgress />
      )}

      {/* 4. Modules + Activity feed */}
      {widgets.length > 0 ? (
        <div className={`grid grid-cols-1 gap-4 xl:grid-cols-3 ${useStackedPrimaryLayout ? 'xl:min-h-[430px]' : ''}`}>
          {/* Modules: takes 2/3 width on xl */}
          <div
            className={`grid grid-cols-1 gap-4 xl:col-span-2 ${
              useStackedPrimaryLayout ? 'xl:grid-rows-[0.82fr_1.18fr]' : 'md:grid-cols-2'
            }`}
          >
            {orderedWidgets.map((widget) => {
              const Component = widget.component
              const path = pluginPath[widget.pluginId]
              const isCollapsed = Boolean(collapsedModules[widget.id])
              const isExpanded = expandedModuleId === widget.id && !isCollapsed
              const stackedSizeClass = useStackedPrimaryLayout
                ? widget.id === 'fitness-kpi'
                  ? 'xl:min-h-[150px]'
                  : widget.id === 'work-summary'
                    ? 'xl:min-h-[260px]'
                    : ''
                : ''

              const moduleSizeClass = isExpanded
                ? 'md:col-span-2 min-h-[360px] xl:min-h-[440px]'
                : isCollapsed
                  ? ''
                  : 'min-h-[220px]'

              return (
                <div
                  key={widget.id}
                  className={`group rounded-xl border border-border bg-surface-light/85 p-4 shadow-lg transition-all duration-150 hover:border-accent/40 hover:shadow-xl ${
                    useStackedPrimaryLayout && !isCollapsed ? 'h-full flex flex-col' : ''
                  } ${stackedSizeClass} ${moduleSizeClass}`}
                >
                  <div className={`flex w-full items-center justify-between gap-2 text-left ${isCollapsed ? '' : 'mb-3'}`}>
                    <h3 className="truncate text-sm font-medium text-muted transition-colors group-hover:text-accent-light">
                      {widget.title}
                    </h3>
                    <div className="flex items-center gap-1">
                      {path && (
                        <button
                          onClick={() => navigate(path)}
                          className="shrink-0 rounded-md border border-border/70 px-2 py-1 text-[10px] text-muted transition-colors hover:border-accent/40 hover:text-accent-light"
                        >
                          Ver módulo
                        </button>
                      )}
                      <button
                        onClick={() => toggleExpandModule(widget.id)}
                        className="shrink-0 rounded-md border border-border/70 px-2 py-1 text-[10px] text-muted transition-colors hover:border-accent/40 hover:text-accent-light"
                        title={isExpanded ? 'Volver tamaño normal' : 'Expandir módulo'}
                      >
                        {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                      </button>
                      <button
                        onClick={() => toggleModule(widget.id)}
                        className="shrink-0 rounded-md border border-border/70 px-2 py-1 text-[10px] text-muted transition-colors hover:border-accent/40 hover:text-accent-light"
                        title={isCollapsed ? 'Expandir módulo' : 'Colapsar módulo'}
                      >
                        {isCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                      </button>
                    </div>
                  </div>
                  <div
                    className={`${useStackedPrimaryLayout && !isCollapsed ? 'flex-1' : ''} ${
                      isExpanded ? 'max-h-[62vh] overflow-y-auto pr-1' : ''
                    } ${isCollapsed ? 'hidden' : ''}`}
                  >
                    {!isCollapsed && <Component />}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Activity Feed: takes 1/3 width on xl */}
          <div className="xl:col-span-1">
            <div className="rounded-xl border border-border bg-surface-light/85 p-4 shadow-lg">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium text-muted">Actividad reciente</h3>
                <button
                  onClick={() => setActivityCollapsed((prev) => !prev)}
                  className="shrink-0 rounded-md border border-border/70 px-2 py-1 text-[10px] text-muted transition-colors hover:border-accent/40 hover:text-accent-light"
                  title={activityCollapsed ? 'Expandir módulo' : 'Colapsar módulo'}
                >
                  {activityCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                </button>
              </div>
              {!activityCollapsed && <RecentActivityFeed />}
            </div>
          </div>
        </div>
      ) : (
        /* Empty state mejorado */
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="flex flex-col rounded-2xl border border-border bg-surface-light/60 p-8 xl:col-span-2">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-surface">
                <Puzzle size={24} className="text-muted" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-white">Sin módulos activos</p>
                <p className="text-sm text-muted">Activá al menos un plugin para ver contenido en el dashboard</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {allPlugins.map((plugin) => (
                <div
                  key={plugin.manifest.id}
                  className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4"
                >
                  <span className="mt-0.5 text-xl shrink-0">{plugin.manifest.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{plugin.manifest.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted">{plugin.manifest.description}</p>
                  </div>
                  <span
                    className={`shrink-0 self-start rounded-full px-2 py-0.5 text-[11px] ${
                      plugin.status === 'active'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-slate-500/10 text-slate-400'
                    }`}
                  >
                    {plugin.status === 'active' ? 'activo' : 'inactivo'}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/control')}
              className="mt-6 flex items-center justify-center gap-2 self-start rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent/85"
            >
              <SlidersHorizontal size={15} />
              Ir al Control Center
            </button>

            <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
              <Zap size={12} className="text-accent-light" />
              Tip: activar un plugin agrega widgets, páginas y navegación automáticamente.
            </p>
          </div>

          <div className="min-h-[200px] xl:col-span-1">
            <RecentActivityFeed />
          </div>
        </div>
      )}

      {/* 5. Suggestions */}
      <SystemSuggestions />

      {/* 6. Footer */}
      <DashboardFooter />
    </div>
  )
}

