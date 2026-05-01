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
      <GamificationNotificationHub />
      <AppUpdateBanner />
      <Sidebar />
      <main
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
