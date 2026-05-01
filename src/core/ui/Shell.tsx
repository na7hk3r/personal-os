import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useCoreStore } from '../state/coreStore'
import { GamificationNotificationHub } from './GamificationNotificationHub'
import { SystemSuggestions } from './SystemSuggestions'
import { AppUpdateBanner } from './components/AppUpdateBanner'

export function Shell() {
  const sidebarCollapsed = useCoreStore((s) => s.settings.sidebarCollapsed)
  const theme = useCoreStore((s) => s.settings.theme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme || 'default')
  }, [theme])

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
    </div>
  )
}
