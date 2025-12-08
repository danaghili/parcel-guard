import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth'
import { settingsApi, type Settings as SettingsType } from '@/lib/api'
import { NotificationSettings } from '@/components/settings/NotificationSettings'
import { PinChangeModal } from '@/components/settings/PinChangeModal'
import { StorageSettings } from '@/components/settings/StorageSettings'
import { ThemeToggle } from '@/components/settings/ThemeToggle'

export function Settings(): JSX.Element {
  const { logout, user } = useAuth()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showPinChange, setShowPinChange] = useState(false)
  const [showStorage, setShowStorage] = useState(false)
  const [settings, setSettings] = useState<SettingsType | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const data = await settingsApi.get()
      setSettings(data)
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }

  const handleLogout = async (): Promise<void> => {
    await logout()
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">App configuration</p>
      </header>

      <div className="space-y-6">
        {/* Appearance */}
        <section className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <ThemeToggle onSettingsChange={setSettings} />
        </section>

        {/* Quick Links */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Manage
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
            <Link
              to="/cameras"
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="text-gray-900 dark:text-white">Cameras</span>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              to="/system"
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-gray-900 dark:text-white">System Health</span>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>

        {/* Admin section - only visible to admins */}
        {user?.isAdmin && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Admin
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
              <Link
                to="/users"
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span className="text-gray-900 dark:text-white">User Management</span>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </section>
        )}

        {/* Account section */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Account
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
            <button
              onClick={() => setShowPinChange(true)}
              className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-gray-900 dark:text-white">Change PIN</span>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </section>

        {/* System section */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            System
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
            <button
              onClick={() => setShowStorage(true)}
              className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
                <span className="text-gray-900 dark:text-white">Storage</span>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={() => setShowNotifications(true)}
              className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="text-gray-900 dark:text-white">Notifications</span>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </section>

        {/* PIN Change Modal */}
        <PinChangeModal isOpen={showPinChange} onClose={() => setShowPinChange(false)} />

        {/* Storage Settings Modal */}
        {showStorage && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Storage Settings</h2>
                <button
                  onClick={() => setShowStorage(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <StorageSettings settings={settings} onSettingsChange={setSettings} />
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowStorage(false)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notification Settings Modal */}
        {showNotifications && (
          <NotificationSettings onClose={() => setShowNotifications(false)} />
        )}

        {/* Logout */}
        <section className="pt-2">
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg p-4 font-medium transition-colors"
          >
            Logout
          </button>
        </section>

        {/* App info */}
        <section className="pt-2 pb-4">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>ParcelGuard v0.6.0</p>
            <p className="mt-1">Phase 6A: Settings & Administration</p>
          </div>
        </section>
      </div>
    </div>
  )
}
