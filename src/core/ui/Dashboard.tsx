import { pluginManager } from '../plugins/PluginManager'
import { GamificationBar } from './GamificationBar'

export function Dashboard() {
  const widgets = pluginManager.getActiveWidgets()

  if (widgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-muted">
        <p className="text-4xl mb-4">🧩</p>
        <h2 className="text-xl font-semibold mb-2">Sin widgets activos</h2>
        <p className="text-sm">Activa plugins para ver contenido en el dashboard.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-surface-light/90 p-6 shadow-2xl">
        <div className="absolute right-0 top-0 h-full w-1/3 opacity-20">
          <img src="/GRUPO.png" alt="Visual corporativo" className="h-full w-full object-cover" />
        </div>
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Overview</p>
          <h1 className="mt-2 text-3xl font-semibold">Dashboard Ejecutivo</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Vista consolidada de productividad y bienestar con enfoque de operación diaria.
          </p>
        </div>
      </section>

      <GamificationBar />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {widgets.map((widget) => {
          const Component = widget.component
          return (
            <div
              key={widget.id}
              className="rounded-xl border border-border bg-surface-light/85 p-4 shadow-lg"
            >
              <h3 className="text-sm font-medium text-muted mb-3">{widget.title}</h3>
              <Component />
            </div>
          )
        })}
      </div>
    </div>
  )
}
