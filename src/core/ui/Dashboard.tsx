import { useNavigate } from 'react-router-dom'
import { Puzzle, SlidersHorizontal, Zap } from 'lucide-react'
import { pluginManager } from '../plugins/PluginManager'
import { SystemStatusHero } from './SystemStatusHero'
import { QuickActionsBar } from './QuickActionsBar'
import { GlobalProgress } from './GlobalProgress'
import { RecentActivityFeed } from './RecentActivityFeed'
import { SystemSuggestions } from './SystemSuggestions'
import { DashboardFooter } from './DashboardFooter'

export function Dashboard() {
  const navigate = useNavigate()
  const widgets = pluginManager.getActiveWidgets()
  const navItems = pluginManager.getActiveNavItems()
  const allPlugins = pluginManager.getAllPlugins()

  const hasFitnessKpi = widgets.some((w) => w.id === 'fitness-kpi')
  const hasWorkSummary = widgets.some((w) => w.id === 'work-summary')
  const useStackedPrimaryLayout = widgets.length === 2 && hasFitnessKpi && hasWorkSummary

  const orderedWidgets = useStackedPrimaryLayout
    ? [...widgets].sort((a, b) => {
        const orderMap: Record<string, number> = {
          'fitness-kpi': 0,
          'work-summary': 1,
        }
        return (orderMap[a.id] ?? 99) - (orderMap[b.id] ?? 99)
      })
    : widgets

  // Map pluginId → first navItem path for click navigation
  const pluginPath: Record<string, string> = {}
  for (const item of navItems) {
    if (!pluginPath[item.pluginId]) pluginPath[item.pluginId] = item.path
  }

  return (
    <div className="space-y-5">
      {/* 1. Hero */}
      <SystemStatusHero />

      {/* 2. Quick Actions */}
      <QuickActionsBar />

      {/* 3. Global Progress */}
      <GlobalProgress />

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
              const stackedSizeClass = useStackedPrimaryLayout
                ? widget.id === 'fitness-kpi'
                  ? 'xl:min-h-[150px]'
                  : widget.id === 'work-summary'
                    ? 'xl:min-h-[260px]'
                    : ''
                : ''

              return (
                <div
                  key={widget.id}
                  className={`group rounded-xl border border-border bg-surface-light/85 p-4 shadow-lg transition-all duration-150 hover:border-accent/40 hover:shadow-xl ${
                    useStackedPrimaryLayout ? 'h-full flex flex-col' : ''
                  } ${stackedSizeClass}`}
                >
                  <button
                    onClick={() => path && navigate(path)}
                    className="mb-3 flex w-full items-center justify-between text-left"
                  >
                    <h3 className="truncate text-sm font-medium text-muted transition-colors group-hover:text-accent-light">
                      {widget.title}
                    </h3>
                    {path && (
                      <span className="shrink-0 pl-2 text-[10px] text-muted/0 transition-all group-hover:text-muted">
                        Ver módulo →
                      </span>
                    )}
                  </button>
                  <div className={useStackedPrimaryLayout ? 'flex-1' : ''}>
                    <Component />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Activity Feed: takes 1/3 width on xl */}
          <div className="min-h-[300px] xl:col-span-1">
            <RecentActivityFeed />
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

