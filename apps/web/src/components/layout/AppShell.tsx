import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

export function AppShell(): JSX.Element {
  // Enable keyboard navigation shortcuts
  useKeyboardShortcuts()

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Skip to main content link for keyboard/screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg"
      >
        Skip to main content
      </a>

      {/* Main content - with padding for bottom nav */}
      <main id="main-content" className="pb-20" tabIndex={-1}>
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  )
}
