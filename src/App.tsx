import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Shell } from './core/ui/Shell'
import { Dashboard } from './core/ui/Dashboard'
const ControlCenter = lazy(() => import('./core/ui/ControlCenter').then((m) => ({ default: m.ControlCenter })))
const CoreNotesPage = lazy(() => import('./core/ui/pages/NotesPage').then((m) => ({ default: m.CoreNotesPage })))
const CoreLinksPage = lazy(() => import('./core/ui/pages/LinksPage').then((m) => ({ default: m.CoreLinksPage })))
const CorePlannerPage = lazy(() => import('./core/ui/pages/PlannerPage').then((m) => ({ default: m.CorePlannerPage })))
const CalendarPage = lazy(() => import('./core/ui/pages/CalendarPage').then((m) => ({ default: m.CalendarPage })))
const ReviewPage = lazy(() => import('./core/ui/pages/ReviewPage').then((m) => ({ default: m.ReviewPage })))
import { CommandPalette } from './core/ui/CommandPalette'
import { OnboardingWizard } from './core/ui/onboarding/OnboardingWizard'
import { pluginManager } from './core/plugins/PluginManager'
import { getAvailablePlugins } from './core/plugins/PluginRegistry'
import { useCoreStore } from './core/state/coreStore'
import { useGamificationStore } from './core/gamification/gamificationStore'
import { useAuthStore } from './core/state/authStore'
import { AuthScreen } from './core/ui/auth/AuthScreen'
import { ErrorBoundary } from './core/ui/components/ErrorBoundary'
import { GlobalErrorBoundary } from './core/ui/components/GlobalErrorBoundary'
import { ToastProvider } from './core/ui/components/ToastProvider'
import { messages } from './core/ui/messages'
import { automationsService } from './core/services/automationsService'
import { notificationsService } from './core/services/notificationsService'

// Import and register plugins
import './plugins/fitness'
import './plugins/work'
import './plugins/finance'

/**
 * Safe mode skips plugin initialization so the shell can boot even if a plugin
 * throws during init. Triggered via `#safe` in the hash of the URL (e.g. the
 * user can launch with `personal-os#safe`).
 */
function isSafeModeRequested(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.hash.includes('safe')
}

function RouteFallback() {
  return (
    <div className="flex items-center justify-center px-6 py-10 text-sm text-muted">
      Cargando…
    </div>
  )
}

export function App() {
  const [ready, setReady] = useState(false)
  const [safeMode] = useState(isSafeModeRequested)
  const authStatus = useAuthStore((s) => s.status)
  const initializeSession = useAuthStore((s) => s.initializeSession)
  const currentUser = useAuthStore((s) => s.currentUser)
  const activePluginIds = useCoreStore((s) => s.activePlugins)
  const onboardingComplete = useCoreStore((s) => s.onboardingComplete)
  const loadFromStorage = useCoreStore((s) => s.loadFromStorage)
  const loadGamificationFromStorage = useGamificationStore((s) => s.loadFromStorage)

  const pluginPages = useMemo(() => pluginManager.getActivePages(), [activePluginIds, ready])

  useEffect(() => {
    void initializeSession()
  }, [initializeSession])

  useEffect(() => {
    if (authStatus !== 'authenticated' || !currentUser) {
      setReady(false)
      return
    }

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

        if (safeMode) {
          // Keep every plugin inactive; user can re-enable from ControlCenter.
          for (const manifest of allPlugins) {
            pluginManager.setPluginStatus(manifest.id, 'inactive')
          }
          console.warn('[App] Safe mode enabled: plugins will not be initialized.')
        } else {
          // Get active plugin IDs from store (loaded from storage)
          const activeIds = useCoreStore.getState().activePlugins

          // Initialize only the active plugins; deactivate others. Individual
          // plugin failures are captured by PluginManager and surfaced via
          // plugin.status === 'error', so one bad plugin cannot halt boot.
          for (const manifest of allPlugins) {
            if (activeIds.includes(manifest.id)) {
              await pluginManager.initPlugin(manifest.id)
            } else {
              pluginManager.setPluginStatus(manifest.id, 'inactive')
            }
          }
        }

        // Boot core services that depend on the active user DB
        await automationsService.init().catch((err) => console.error('[App] automations init failed', err))
        await notificationsService.init().catch((err) => console.error('[App] notifications init failed', err))
      } catch (err) {
        console.error('[App] Bootstrap failed:', err)
      } finally {
        setReady(true)
      }
    }
    void bootstrap()
  }, [authStatus, currentUser, loadFromStorage, loadGamificationFromStorage, safeMode])

  if (authStatus === 'checking') {
    return (
      <div className="relative flex h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_#16324f_0%,_#101923_45%,_#070d14_100%)] text-white">
        <div className="relative rounded-2xl border border-white/10 bg-surface-light/70 px-10 py-8 text-center shadow-2xl backdrop-blur">
          <p className="text-base font-medium">{messages.loading.checkingSession}</p>
        </div>
      </div>
    )
  }

  if (authStatus !== 'authenticated') {
    return <AuthScreen />
  }

  if (!ready) {
    return (
      <div className="relative flex h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_#16324f_0%,_#101923_45%,_#070d14_100%)] text-white">
        <div className="absolute inset-0 opacity-20">
          <img src="/grupo_alt.jpg" alt="Background corporativo" className="h-full w-full object-cover" />
        </div>
        <div className="relative rounded-2xl border border-white/10 bg-surface-light/70 px-10 py-8 text-center shadow-2xl backdrop-blur">
          <img src="/gif-eye.gif" alt="Loader" className="mx-auto h-16 w-16 rounded-full" />
          <p className="mt-4 text-base font-medium">{messages.loading.initializing}</p>
          <p className="mt-1 text-sm text-muted">{messages.loading.initializingDetail}</p>
        </div>
      </div>
    )
  }

  return (
    <GlobalErrorBoundary>
      <ToastProvider>
        <ErrorBoundary label="app-root">
          <HashRouter>
            {ready && !onboardingComplete && <OnboardingWizard />}
            <CommandPalette />
            {safeMode && (
              <div
                role="status"
                className="fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-full border border-amber-400/40 bg-amber-500/15 px-4 py-1.5 text-xs font-medium text-amber-100 shadow-lg backdrop-blur"
              >
                Modo seguro activo — plugins desactivados
              </div>
            )}
            <Routes>
              <Route element={<Shell />}>
                <Route index element={<Dashboard />} />
                <Route path="/control" element={<Suspense fallback={<RouteFallback />}><ControlCenter /></Suspense>} />
                <Route path="/notes" element={<Suspense fallback={<RouteFallback />}><CoreNotesPage /></Suspense>} />
                <Route path="/links" element={<Suspense fallback={<RouteFallback />}><CoreLinksPage /></Suspense>} />
                <Route path="/planner" element={<Suspense fallback={<RouteFallback />}><CorePlannerPage /></Suspense>} />
                <Route path="/calendar" element={<Suspense fallback={<RouteFallback />}><CalendarPage /></Suspense>} />
                <Route path="/review" element={<Suspense fallback={<RouteFallback />}><ReviewPage /></Suspense>} />
                {pluginPages.map((page) => {
                  const PageComponent = page.component
                  return (
                    <Route
                      key={page.id}
                      path={page.path}
                      element={
                        <ErrorBoundary label={`plugin:${page.pluginId}`}>
                          <Suspense fallback={<RouteFallback />}>
                            <PageComponent />
                          </Suspense>
                        </ErrorBoundary>
                      }
                    />
                  )
                })}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </HashRouter>
        </ErrorBoundary>
      </ToastProvider>
    </GlobalErrorBoundary>
  )
}
