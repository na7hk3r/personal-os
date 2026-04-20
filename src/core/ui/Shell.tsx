import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useCoreStore } from '../state/coreStore'

export function Shell() {
  const sidebarCollapsed = useCoreStore((s) => s.settings.sidebarCollapsed)

  return (
    <div className="flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_#17314e_0%,_#0e1723_42%,_#070d14_100%)] text-white">
      <Sidebar />
      <main
        className={`flex-1 overflow-y-auto transition-all duration-200 ${
          sidebarCollapsed ? 'ml-16' : 'ml-60'
        }`}
      >
        <div className="mx-auto max-w-7xl p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
