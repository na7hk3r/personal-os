import { useEffect, useMemo, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Shell } from './core/ui/Shell'
import { Dashboard } from './core/ui/Dashboard'
import { ControlCenter } from './core/ui/ControlCenter'
import { CoreNotesPage } from './core/ui/pages/NotesPage'
import { CoreLinksPage } from './core/ui/pages/LinksPage'
import { CorePlannerPage } from './core/ui/pages/PlannerPage'
import { OnboardingWizard } from './core/ui/onboarding/OnboardingWizard'
import { pluginManager } from './core/plugins/PluginManager'
import { getAvailablePlugins } from './core/plugins/PluginRegistry'
import { useCoreStore } from './core/state/coreStore'
import { useGamificationStore } from './core/gamification/gamificationStore'

// Import and register plugins
import './plugins/fitness'
import './plugins/work'

export function App() {
  const [ready, setReady] = useState(false)
  const activePluginIds = useCoreStore((s) => s.activePlugins)
  const setActivePlugins = useCoreStore((s) => s.setActivePlugins)
  const onboardingComplete = useCoreStore((s) => s.onboardingComplete)
  const loadFromStorage = useCoreStore((s) => s.loadFromStorage)
  const loadGamificationFromStorage = useGamificationStore((s) => s.loadFromStorage)

  const pluginPages = useMemo(() => pluginManager.getActivePages(), [activePluginIds, ready])

  useEffect(() => {
    async function bootstrap() {
      try {
        // Load persisted state first (onboarding flag, profile, activePlugins)
        await loadFromStorage()
        await loadGamificationFromStorage()

        // Register all plugins (but don't init yet)
        const allPlugins = getAvailablePlugins()
        for (const manifest of allPlugins) {
          pluginManager.register(manifest)
        }

        // Get active plugin IDs from store (loaded from storage)
        const activeIds = useCoreStore.getState().activePlugins

        // Initialize only the active plugins; deactivate others
        for (const manifest of allPlugins) {
          if (activeIds.includes(manifest.id)) {
            await pluginManager.initPlugin(manifest.id)
          } else {
            // Ensure inactive plugins are in 'inactive' state (not 'registered')
            pluginManager.setPluginStatus(manifest.id, 'inactive')
          }
        }
      } catch (err) {
        console.error('[App] Bootstrap failed:', err)
      } finally {
        setReady(true)
      }
    }
    bootstrap()
  }, [setActivePlugins, loadFromStorage, loadGamificationFromStorage])

  if (!ready) {
    return (
      <div className="relative flex h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_#16324f_0%,_#101923_45%,_#070d14_100%)] text-white">
        <div className="absolute inset-0 opacity-20">
          <img src="/grupo_alt.jpg" alt="Background corporativo" className="h-full w-full object-cover" />
        </div>
        <div className="relative rounded-2xl border border-white/10 bg-surface-light/70 px-10 py-8 text-center shadow-2xl backdrop-blur">
          <img src="/gif-eye.gif" alt="Loader" className="mx-auto h-16 w-16 rounded-full" />
          <p className="mt-4 text-base font-medium">Inicializando Personal OS</p>
          <p className="mt-1 text-sm text-muted">Cargando módulos, datos y preferencias...</p>
        </div>
      </div>
    )
  }

  return (
    <HashRouter>
      {ready && !onboardingComplete && <OnboardingWizard />}
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Dashboard />} />
          <Route path="/control" element={<ControlCenter />} />
          <Route path="/notes" element={<CoreNotesPage />} />
          <Route path="/links" element={<CoreLinksPage />} />
          <Route path="/planner" element={<CorePlannerPage />} />
          {pluginPages.map((page) => (
            <Route
              key={page.id}
              path={page.path}
              element={<page.component />}
            />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
