import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCoreStore } from '../state/coreStore'
import { pluginManager } from '../plugins/PluginManager'

export function ControlCenter() {
  const navigate = useNavigate()
  const profile = useCoreStore((s) => s.profile)
  const settings = useCoreStore((s) => s.settings)
  const activePluginIds = useCoreStore((s) => s.activePlugins)
  const updateProfile = useCoreStore((s) => s.updateProfile)
  const updateSettings = useCoreStore((s) => s.updateSettings)
  const setActivePlugins = useCoreStore((s) => s.setActivePlugins)

  const [busyPluginId, setBusyPluginId] = useState<string | null>(null)
  const [pluginMessage, setPluginMessage] = useState('')

  const plugins = pluginManager.getAllPlugins()

  const syncActivePluginsState = () => {
    const ids = pluginManager
      .getAllPlugins()
      .filter((plugin) => plugin.status === 'active')
      .map((plugin) => plugin.manifest.id)
    setActivePlugins(ids)
  }

  const togglePlugin = async (pluginId: string) => {
    setPluginMessage('')
    setBusyPluginId(pluginId)

    try {
      const plugin = pluginManager.getPlugin(pluginId)
      if (!plugin) return

      const isActive = plugin.status === 'active'
      if (isActive) {
        pluginManager.deactivatePlugin(pluginId)
      } else {
        await pluginManager.initPlugin(pluginId)
      }

      syncActivePluginsState()

      const updated = pluginManager.getPlugin(pluginId)
      if (updated?.status === 'active') {
        setPluginMessage(`Plugin ${updated.manifest.name} activado correctamente.`)
      } else if (updated?.status === 'inactive') {
        setPluginMessage(`Plugin ${updated.manifest.name} desactivado.`)
      } else if (updated?.status === 'error') {
        setPluginMessage(`No se pudo activar ${updated.manifest.name}: ${updated.error ?? 'error desconocido'}`)
      }
    } finally {
      setBusyPluginId(null)
    }
  }

  const activePlugins = useMemo(
    () => plugins.filter((plugin) => plugin.status === 'active').length,
    [plugins, activePluginIds],
  )

  const metrics = {
    widgets: pluginManager.getActiveWidgets().length,
    pages: pluginManager.getActivePages().length,
    navItems: pluginManager.getActiveNavItems().length,
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-surface-light/90 p-6 shadow-xl">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Control Center</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Gobernanza de Personal OS</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Administra identidad, preferencias, módulos y salud general de la plataforma desde un único panel.
            </p>
          </div>
          <img
            src="/ntkr-logo-alt.png"
            alt="Marca NTKR"
            className="h-14 w-auto self-start rounded-md border border-border/80 bg-surface p-2"
          />
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-border/80 bg-surface px-4 py-2">
          <img src="/gif-mano.gif" alt="Activity" className="h-9 w-9 rounded-md" />
          <p className="text-xs text-muted">Monitoreo operativo activo en tiempo real</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <article className="rounded-2xl border border-border bg-surface-light/80 p-5">
          <p className="text-xs uppercase tracking-wide text-muted">Módulos activos</p>
          <p className="mt-2 text-3xl font-semibold">{activePlugins}</p>
          <p className="mt-1 text-sm text-muted">de {plugins.length} registrados</p>
        </article>

        <article className="rounded-2xl border border-border bg-surface-light/80 p-5">
          <p className="text-xs uppercase tracking-wide text-muted">Widgets en dashboard</p>
          <p className="mt-2 text-3xl font-semibold">{metrics.widgets}</p>
          <p className="mt-1 text-sm text-muted">conectados y listos</p>
        </article>

        <article className="rounded-2xl border border-border bg-surface-light/80 p-5">
          <p className="text-xs uppercase tracking-wide text-muted">Rutas de operación</p>
          <p className="mt-2 text-3xl font-semibold">{metrics.pages}</p>
          <p className="mt-1 text-sm text-muted">{metrics.navItems} entradas de navegación</p>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-border bg-surface-light/85 p-6">
          <h2 className="text-lg font-semibold">Perfil principal</h2>
          <p className="mt-1 text-sm text-muted">Configura la identidad base de tus métricas.</p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs text-muted">Nombre</span>
              <input
                value={profile.name}
                onChange={(e) => updateProfile({ name: e.target.value })}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted">Edad</span>
              <input
                type="number"
                value={profile.age || ''}
                onChange={(e) => updateProfile({ age: Number(e.target.value) || 0 })}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted">Altura (cm)</span>
              <input
                type="number"
                value={profile.height || ''}
                onChange={(e) => updateProfile({ height: Number(e.target.value) || 0 })}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted">Meta peso (kg)</span>
              <input
                type="number"
                value={profile.weightGoal || ''}
                onChange={(e) => updateProfile({ weightGoal: Number(e.target.value) || 0 })}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-muted">Fecha de inicio</span>
              <input
                type="date"
                value={profile.startDate}
                onChange={(e) => updateProfile({ startDate: e.target.value })}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-surface-light/85 p-6">
          <h2 className="text-lg font-semibold">Preferencias y ajustes</h2>
          <p className="mt-1 text-sm text-muted">Control de interfaz y estado operacional.</p>

          <div className="mt-5 space-y-4">
            <label className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
              <div>
                <p className="text-sm font-medium">Sidebar colapsado</p>
                <p className="text-xs text-muted">Ahorra espacio y concentra contenido</p>
              </div>
              <input
                type="checkbox"
                checked={settings.sidebarCollapsed}
                onChange={(e) => updateSettings({ sidebarCollapsed: e.target.checked })}
                className="h-4 w-4"
              />
            </label>

            <label className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
              <div>
                <p className="text-sm font-medium">Tema de interfaz</p>
                <p className="text-xs text-muted">Preparado para evolución dark/light</p>
              </div>
              <select
                value={settings.theme}
                onChange={(e) => updateSettings({ theme: e.target.value as 'dark' | 'light' })}
                className="rounded-md border border-border bg-surface px-2 py-1 text-sm"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </label>
          </div>

          <div className="mt-6 rounded-xl border border-border bg-surface p-4">
            <h3 className="text-sm font-semibold">Gestor de plugins</h3>
            <p className="mt-1 text-xs text-muted">Desde aquí puedes ver y agregar módulos al flujo operativo activándolos.</p>

            {pluginMessage && (
              <div className="mt-3 rounded-lg border border-border bg-surface-light px-3 py-2 text-xs text-muted">
                {pluginMessage}
              </div>
            )}

            <div className="mt-3 space-y-3">
              {plugins.map((plugin) => {
                const isActive = plugin.status === 'active'
                const isBusy = busyPluginId === plugin.manifest.id

                return (
                  <div key={plugin.manifest.id} className="rounded-lg border border-border bg-surface-light/70 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          <span className="mr-2">{plugin.manifest.icon}</span>
                          {plugin.manifest.name}
                        </p>
                        <p className="mt-1 text-xs text-muted">{plugin.manifest.description}</p>
                        <p className="mt-1 text-[11px] text-muted">Versión {plugin.manifest.version}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          plugin.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : plugin.status === 'error'
                              ? 'bg-red-500/15 text-red-300'
                              : 'bg-slate-500/15 text-slate-300'
                        }`}
                      >
                        {plugin.status}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          if (plugin.manifest.navItems?.[0]?.path) {
                            navigate(plugin.manifest.navItems[0].path)
                          }
                        }}
                        disabled={!isActive || isBusy || !plugin.manifest.navItems?.length}
                        className="rounded-md border border-border px-3 py-1.5 text-xs text-muted disabled:opacity-50"
                      >
                        Abrir módulo
                      </button>
                      <button
                        onClick={() => void togglePlugin(plugin.manifest.id)}
                        disabled={isBusy}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                          isActive
                            ? 'border border-border bg-surface text-muted'
                            : 'bg-accent text-white'
                        } ${isBusy ? 'opacity-60' : ''}`}
                      >
                        {isBusy ? 'Procesando...' : isActive ? 'Desactivar' : 'Agregar y activar'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 rounded-lg border border-border bg-surface px-3 py-3 text-xs text-muted">
              <p className="font-medium text-white">¿Cómo agregar nuevos plugins?</p>
              <p className="mt-1">En esta versión, los plugins disponibles se incluyen en el build y aquí se activan/desactivan sin fricción.</p>
            </div>
          </div>
        </article>
      </section>
    </div>
  )
}
