import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useCoreStore } from '../state/coreStore'
import { GamificationNotificationHub } from './GamificationNotificationHub'
import { SystemSuggestions } from './SystemSuggestions'
import { AppUpdateBanner } from './components/AppUpdateBanner'
import { CopilotPanel } from './CopilotPanel'

const COPILOT_COLLAPSED_KEY = 'core:copilotPanel:collapsed'

export function Shell() {
  const sidebarCollapsed = useCoreStore((s) => s.settings.sidebarCollapsed)
  const theme = useCoreStore((s) => s.settings.theme)
  const [copilotCollapsed, setCopilotCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage?.getItem(COPILOT_COLLAPSED_KEY) === 'true'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme || 'default')
  }, [theme])

  // Permite que otras superficies (ej. DailyScoreScreen) abran el copiloto
  // sin acoplarse al estado local de Shell. Persiste también el flag para
  // que recargas mantengan la preferencia.
  useEffect(() => {
    const handler = () => {
      setCopilotCollapsed(false)
      try { window.localStorage?.setItem(COPILOT_COLLAPSED_KEY, 'false') } catch { /* ignore */ }
    }
    window.addEventListener('copilot:open', handler as EventListener)
    return () => window.removeEventListener('copilot:open', handler as EventListener)
  }, [])

  const toggleCopilot = () => {
    setCopilotCollapsed((prev) => {
      const next = !prev
      try { window.localStorage?.setItem(COPILOT_COLLAPSED_KEY, next ? 'true' : 'false') } catch { /* ignore */ }
      return next
    })
  }

  return (
    <div
      className="flex h-screen overflow-hidden text-white"
      style={{ background: 'var(--bg-gradient)' }}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Saltar al contenido principal
      </a>
      <GamificationNotificationHub />
      <AppUpdateBanner />
      <Sidebar />
      <main
        id="main-content"
        role="main"
        tabIndex={-1}
        className={`flex-1 overflow-y-auto transition-all duration-200 ${
          sidebarCollapsed ? 'ml-16' : 'ml-60'
        }`}
      >
        <div className="mx-auto max-w-7xl p-6">
          <div className="mb-2 flex justify-end">
            <SystemSuggestions />
          </div>
          <Outlet />
        </div>
      </main>
      <CopilotPanel collapsed={copilotCollapsed} onToggle={toggleCopilot} />
    </div>
  )
}

