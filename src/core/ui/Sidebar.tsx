import { NavLink } from 'react-router-dom'
import { LayoutDashboard, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCoreStore } from '../state/coreStore'
import { pluginManager } from '../plugins/PluginManager'

const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  LayoutDashboard,
}

export function Sidebar() {
  const sidebarCollapsed = useCoreStore((s) => s.settings.sidebarCollapsed)
  const updateSettings = useCoreStore((s) => s.updateSettings)

  const navItems = pluginManager
    .getActiveNavItems()
    .filter((item, index, arr) => arr.findIndex((candidate) => candidate.path === item.path) === index)

  const toggleCollapse = () => {
    updateSettings({ sidebarCollapsed: !sidebarCollapsed })
  }

  return (
    <aside
      className={`fixed top-0 left-0 h-full bg-surface-light/95 border-r border-border flex flex-col transition-all duration-200 z-40 backdrop-blur-md ${
        sidebarCollapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <img src="/smc-logo-alt.png" alt="SMC" className="h-8 w-8 rounded border border-border/70" />
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Personal OS</p>
              <p className="text-sm font-semibold text-white">Executive Suite</p>
            </div>
          </div>
        )}
        <button
          onClick={toggleCollapse}
          className="p-1 rounded hover:bg-surface-lighter text-muted"
        >
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-1 px-2 overflow-y-auto">
        {/* Dashboard (always present) */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
              isActive
                ? 'bg-accent/20 text-accent-light shadow-[inset_0_0_0_1px_rgba(124,58,237,0.25)]'
                : 'text-muted hover:bg-surface-lighter hover:text-white'
            }`
          }
        >
          <LayoutDashboard size={18} />
          {!sidebarCollapsed && <span>Dashboard</span>}
        </NavLink>

        <NavLink
          to="/control"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
              isActive
                ? 'bg-accent/20 text-accent-light shadow-[inset_0_0_0_1px_rgba(124,58,237,0.25)]'
                : 'text-muted hover:bg-surface-lighter hover:text-white'
            }`
          }
        >
          <SlidersHorizontal size={18} />
          {!sidebarCollapsed && <span>Control Center</span>}
        </NavLink>

        {!sidebarCollapsed && (
          <p className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-[0.18em] text-muted">Módulos</p>
        )}

        {/* Plugin nav items */}
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-accent/20 text-accent-light shadow-[inset_0_0_0_1px_rgba(124,58,237,0.25)]'
                  : 'text-muted hover:bg-surface-lighter hover:text-white'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            {!sidebarCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border text-center text-xs text-muted">
        {!sidebarCollapsed && (
          <div className="space-y-2">
            <img src="/ntkr-logo.png" alt="NTKR" className="mx-auto h-5 w-auto opacity-85" />
            <span>v1.0.0</span>
          </div>
        )}
      </div>
    </aside>
  )
}
