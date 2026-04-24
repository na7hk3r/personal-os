import { Database, Circle } from 'lucide-react'
import { pluginManager } from '@core/plugins/PluginManager'
import { APP_VERSION } from '@core/utils/version'

export function DashboardFooter() {
  const activeCount = pluginManager.getAllPlugins().filter((p) => p.status === 'active').length

  return (
    <footer className="flex flex-col gap-3 pt-4 border-t border-border sm:flex-row sm:items-center sm:justify-between">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <img src="/GRUPO.png" alt="Personal OS" className="h-6 object-contain opacity-70" />
        <span className="text-xs text-muted" title={`Personal OS v${APP_VERSION}`}>v{APP_VERSION}</span>
      </div>

      {/* System status */}
      <div className="flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <Database size={12} className="text-success" />
          Local · SQLite
        </span>
        <span className="flex items-center gap-1.5">
          <Circle size={8} className="fill-success text-success" />
          {activeCount} {activeCount === 1 ? 'plugin activo' : 'plugins activos'}
        </span>
      </div>
    </footer>
  )
}
