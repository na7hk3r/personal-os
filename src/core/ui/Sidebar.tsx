import { NavLink } from 'react-router-dom'
import { useMemo } from 'react'
import {
  LayoutDashboard,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  SquarePen,
  Ruler,
  BriefcaseBusiness,
  NotebookPen,
  Link2,
  CalendarDays,
  Flame,
  LogOut,
  type LucideIcon,
} from 'lucide-react'
import { useCoreStore } from '../state/coreStore'
import { pluginManager } from '../plugins/PluginManager'
import { eventBus } from '../events/EventBus'
import { useGamificationStore } from '@core/gamification/gamificationStore'
import { getLevelTier, getLevelTitle } from '@core/gamification/gamificationUtils'
import { useAuthStore } from '@core/state/authStore'
import { APP_VERSION } from '@core/utils/version'

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  SlidersHorizontal,
  Dumbbell,
  SquarePen,
  Ruler,
  BriefcaseBusiness,
  NotebookPen,
  Link2,
}

function renderNavIcon(iconName: string, size = 18) {
  const Icon = iconMap[iconName]
  if (Icon) return <Icon size={size} />
  return <LayoutDashboard size={size} />
}

function hasPluginActivityToday(pluginId: string): boolean {
  const PLUGIN_EVENTS: Record<string, string[]> = {
    fitness: [
      'FITNESS_WEIGHT_RECORDED',
      'FITNESS_DAILY_ENTRY_SAVED',
      'FITNESS_MEAL_LOGGED',
      'FITNESS_WORKOUT_COMPLETED',
      'FITNESS_MEASUREMENT_SAVED',
      'WEIGHT_RECORDED',
      'DAILY_ENTRY_SAVED',
      'MEAL_LOGGED',
      'WORKOUT_COMPLETED',
      'MEASUREMENT_SAVED',
    ],
    work: [
      'WORK_TASK_CREATED',
      'WORK_TASK_COMPLETED',
      'WORK_TASK_MOVED',
      'WORK_NOTE_CREATED',
      'TASK_CREATED',
      'TASK_COMPLETED',
      'TASK_MOVED',
      'NOTE_CREATED',
    ],
  }
  const ONE_DAY = 86_400_000
  const cutoff = Date.now() - ONE_DAY
  const pluginEvents = new Set(PLUGIN_EVENTS[pluginId] ?? [])
  return eventBus
    .getHistory(100)
    .some((h) => h.timestamp >= cutoff && pluginEvents.has(h.event))
}

const NAV_LINK_CLASS = (isActive: boolean) =>
  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
    isActive
      ? 'bg-accent/20 text-accent-light shadow-[inset_0_0_0_1px_rgba(124,58,237,0.25)]'
      : 'text-muted hover:bg-surface-lighter hover:text-white'
  }`

export function Sidebar() {
  const sidebarCollapsed = useCoreStore((s) => s.settings.sidebarCollapsed)
  const updateSettings = useCoreStore((s) => s.updateSettings)
  // Subscribed to force re-render when plugins are activated/deactivated; the
  // resulting `getActiveNavItems()` call below reads fresh data from PluginManager.
  const activePlugins = useCoreStore((s) => s.activePlugins)
  const { points, level, streak } = useGamificationStore()
  const logout = useAuthStore((s) => s.logout)
  const tier = getLevelTier(level)
  const levelTitle = getLevelTitle(level)
  const pointsInLevel = points % 100

  const TIER_STYLE: Record<string, string> = {
    bronze: 'from-xp-bronze to-amber-300 text-[#2a1808]',
    silver: 'from-xp-silver to-slate-200 text-[#1f2937]',
    gold: 'from-xp-gold to-yellow-200 text-[#3a2a00]',
    platinum: 'from-xp-platinum to-cyan-200 text-[#08212f]',
  }

  // Re-derive nav items whenever activePlugins changes; PluginManager registers/unregisters
  // navItems inside initPlugin/deactivatePlugin, so we use activePlugins as the trigger.
  const navItems = useMemo(
    () =>
      pluginManager
        .getActiveNavItems()
        .filter((item, index, arr) => arr.findIndex((candidate) => candidate.path === item.path) === index),
    [activePlugins],
  )

  const toggleCollapse = () => {
    updateSettings({ sidebarCollapsed: !sidebarCollapsed })
  }

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-full flex-col border-r border-border bg-surface-light/95 backdrop-blur-md transition-all duration-200 ${
        sidebarCollapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        {!sidebarCollapsed && (
          <div className="flex min-w-0 items-center gap-2">
            <img src="/smc-logo-alt.png" alt="SMC" className="h-8 w-8 shrink-0 rounded border border-border/70" />
            <div className="min-w-0">
              <p className="truncate text-xs uppercase tracking-[0.18em] text-muted">Personal OS</p>
              <p className="truncate text-sm font-semibold text-white">Executive Suite</p>
            </div>
          </div>
        )}
        <button
          onClick={toggleCollapse}
          className="shrink-0 rounded p-1 text-muted hover:bg-surface-lighter"
        >
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {/* Core: Dashboard */}
        <NavLink to="/" end className={({ isActive }) => NAV_LINK_CLASS(isActive)}>
          <LayoutDashboard size={18} className="shrink-0" />
          {!sidebarCollapsed && <span className="truncate">Dashboard</span>}
        </NavLink>

        {/* Core: Control Center */}
        <NavLink to="/control" className={({ isActive }) => NAV_LINK_CLASS(isActive)}>
          <SlidersHorizontal size={18} className="shrink-0" />
          {!sidebarCollapsed && <span className="truncate">Control Center</span>}
        </NavLink>

        {/* Core: Notas */}
        <NavLink to="/notes" className={({ isActive }) => NAV_LINK_CLASS(isActive)}>
          <NotebookPen size={18} className="shrink-0" />
          {!sidebarCollapsed && <span className="truncate">Notas</span>}
        </NavLink>

        {/* Core: Enlaces */}
        <NavLink to="/links" className={({ isActive }) => NAV_LINK_CLASS(isActive)}>
          <Link2 size={18} className="shrink-0" />
          {!sidebarCollapsed && <span className="truncate">Enlaces</span>}
        </NavLink>

        {/* Core: Planner */}
        <NavLink to="/planner" className={({ isActive }) => NAV_LINK_CLASS(isActive)}>
          <CalendarDays size={18} className="shrink-0" />
          {!sidebarCollapsed && <span className="truncate">Planner</span>}
        </NavLink>

        {/* Plugin nav items */}
        {navItems.length > 0 && (
          <>
            {!sidebarCollapsed && (
              <p className="px-3 pb-1 pt-3 text-[10px] uppercase tracking-[0.18em] text-muted">Módulos</p>
            )}
            {navItems.map((item) => {
              const hasActivity = hasPluginActivityToday(item.pluginId)
              const isChild = !!item.parentId

              if (isChild) {
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    className={({ isActive }) =>
                      `relative flex items-center gap-2 rounded-md text-xs transition-all duration-200 ${
                        sidebarCollapsed ? 'justify-center px-3 py-2' : 'py-1.5 pl-8 pr-3'
                      } ${
                        isActive
                          ? 'bg-accent/10 text-accent-light'
                          : 'text-muted/70 hover:bg-surface-lighter/50 hover:text-muted'
                      }`
                    }
                  >
                    {sidebarCollapsed ? (
                      renderNavIcon(item.icon, 18)
                    ) : (
                      <>
                        <span className="text-[10px] text-muted/40">└</span>
                        <span className="text-muted/80">{renderNavIcon(item.icon, 14)}</span>
                        <span className="truncate">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                )
              }

              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  end
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-accent/20 text-accent-light shadow-[inset_0_0_0_1px_rgba(124,58,237,0.25)]'
                        : 'text-white/80 hover:bg-surface-lighter hover:text-white'
                    }`
                  }
                >
                  <span className="relative shrink-0 text-base leading-none">
                    {renderNavIcon(item.icon, 18)}
                    {hasActivity && (
                      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-surface-light bg-success" />
                    )}
                  </span>
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              )
            })}
          </>
        )}
      </nav>

      {/* Gamification mini widget */}
      {!sidebarCollapsed && (
        <div className="mx-2 mb-2 rounded-xl border border-border bg-surface/60 p-3 space-y-2">
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br text-xs font-black shadow ${TIER_STYLE[tier]}`}
              title={`${levelTitle} (${tier})`}
            >
              {level}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">Nivel {level} · {levelTitle}</p>
              <p className="text-[10px] text-muted">{points} puntos</p>
            </div>
            {streak > 0 && (
              <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-warning">
                <Flame size={12} />
                {streak}
              </span>
            )}
          </div>
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-lighter">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-accent to-accent-light transition-all duration-500"
              style={{ width: `${pointsInLevel}%` }}
            />
          </div>
          <p className="text-right text-[10px] text-muted">{pointsInLevel}/100 para nivel {level + 1}</p>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-border p-3 text-center text-xs text-muted">
        {!sidebarCollapsed && (
          <div className="space-y-2">
            <button
              onClick={() => void logout()}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-muted transition-colors hover:border-accent/40 hover:text-white"
            >
              <LogOut size={14} />
              Cerrar sesion
            </button>
            <img src="/ntkr-logo.png" alt="NTKR" className="mx-auto h-5 w-auto opacity-85" />
            <span title={`Personal OS v${APP_VERSION}`}>v{APP_VERSION}</span>
          </div>
        )}
      </div>
    </aside>
  )
}
