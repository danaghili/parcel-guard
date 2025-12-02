import { useAuth } from '@/hooks/useAuth'

export function Settings(): JSX.Element {
  const { logout } = useAuth()

  const handleLogout = async (): Promise<void> => {
    await logout()
  }

  return (
    <div className="p-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-slate-400 text-sm">App configuration</p>
      </header>

      <div className="space-y-4">
        {/* Account section */}
        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Account
          </h2>
          <div className="bg-slate-800 rounded-lg divide-y divide-slate-700">
            <button
              className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-700/50 transition-colors"
              disabled
            >
              <span>Change PIN</span>
              <span className="text-slate-500 text-sm">Coming soon</span>
            </button>
          </div>
        </section>

        {/* System section */}
        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
            System
          </h2>
          <div className="bg-slate-800 rounded-lg divide-y divide-slate-700">
            <button
              className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-700/50 transition-colors"
              disabled
            >
              <span>Storage</span>
              <span className="text-slate-500 text-sm">Phase 3</span>
            </button>
            <button
              className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-700/50 transition-colors"
              disabled
            >
              <span>Notifications</span>
              <span className="text-slate-500 text-sm">Phase 5</span>
            </button>
          </div>
        </section>

        {/* Logout */}
        <section className="pt-4">
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg p-4 font-medium transition-colors"
          >
            Logout
          </button>
        </section>

        {/* App info */}
        <section className="pt-4">
          <div className="text-center text-sm text-slate-500">
            <p>ParcelGuard v0.1.0</p>
            <p className="mt-1">Phase 1: Core Infrastructure</p>
          </div>
        </section>
      </div>
    </div>
  )
}
