import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function AppShell(): JSX.Element {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Main content - with padding for bottom nav */}
      <main className="pb-20">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  )
}
