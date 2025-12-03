import { useState, useEffect, useCallback } from 'react'
import {
  settingsApi,
  camerasApi,
  type Settings,
  type NotificationStatus,
  type Camera,
} from '../../lib/api'
import { Spinner } from '../ui/Spinner'

interface NotificationSettingsProps {
  onClose: () => void
}

export function NotificationSettings({ onClose }: NotificationSettingsProps): JSX.Element {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [status, setStatus] = useState<NotificationStatus | null>(null)
  const [cameras, setCameras] = useState<Camera[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  // Load settings, status, and cameras
  useEffect(() => {
    async function loadData(): Promise<void> {
      try {
        const [settingsData, statusData, camerasData] = await Promise.all([
          settingsApi.get(),
          settingsApi.getNotificationStatus(),
          camerasApi.list(),
        ])
        setSettings(settingsData)
        setStatus(statusData)
        setCameras(camerasData)
      } catch (err) {
        console.error('Failed to load notification settings:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Update a setting
  const updateSetting = useCallback(
    async <K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> => {
      if (!settings) return

      setSaving(true)
      try {
        const updated = await settingsApi.update({ [key]: value })
        setSettings(updated)
      } catch (err) {
        console.error('Failed to update setting:', err)
      } finally {
        setSaving(false)
      }
    },
    [settings],
  )

  // Update camera notification toggle
  const updateCameraNotifications = useCallback(
    async (cameraId: string, enabled: boolean): Promise<void> => {
      try {
        const updated = await camerasApi.update(cameraId, { notificationsEnabled: enabled })
        setCameras((prev) => prev.map((c) => (c.id === cameraId ? updated : c)))
      } catch (err) {
        console.error('Failed to update camera notifications:', err)
      }
    },
    [],
  )

  // Send test notification
  const handleTestNotification = useCallback(async (): Promise<void> => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await settingsApi.testNotification()
      setTestResult(result)
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to send test notification',
      })
    } finally {
      setTesting(false)
    }
  }, [])

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-slate-800 rounded-lg p-8">
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  if (!settings || !status) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full">
          <p className="text-red-400">Failed to load notification settings</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-800 rounded-lg w-full max-w-lg my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold">Notification Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Status indicator */}
          {!status.configured && (
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
              <p className="text-yellow-200 text-sm">
                Notifications not configured. Set the <code className="bg-slate-700 px-1 rounded">NTFY_TOPIC</code> environment variable on the server.
              </p>
            </div>
          )}

          {status.configured && status.topic && (
            <div className="bg-slate-700/50 rounded-lg p-3">
              <p className="text-sm text-slate-400">
                ntfy.sh topic: <span className="text-slate-200 font-mono">{status.topic}</span>
              </p>
            </div>
          )}

          {/* Enable notifications */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Notifications</p>
              <p className="text-sm text-slate-400">Receive alerts when motion is detected</p>
            </div>
            <button
              onClick={() => updateSetting('notificationsEnabled', !settings.notificationsEnabled)}
              disabled={saving || !status.configured}
              className={`
                relative w-12 h-6 rounded-full transition-colors
                ${settings.notificationsEnabled ? 'bg-primary-600' : 'bg-slate-600'}
                ${!status.configured ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <span
                className={`
                  absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
                  ${settings.notificationsEnabled ? 'left-7' : 'left-1'}
                `}
              />
            </button>
          </div>

          {/* Test notification */}
          {status.configured && (
            <div>
              <button
                onClick={handleTestNotification}
                disabled={testing || !settings.notificationsEnabled}
                className={`
                  w-full px-4 py-2 rounded-lg font-medium text-sm
                  transition-colors flex items-center justify-center gap-2
                  ${
                    settings.notificationsEnabled
                      ? 'bg-slate-700 hover:bg-slate-600'
                      : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                  }
                `}
              >
                {testing ? (
                  <>
                    <Spinner size="sm" />
                    Sending...
                  </>
                ) : (
                  'Send Test Notification'
                )}
              </button>
              {testResult && (
                <p
                  className={`mt-2 text-sm ${testResult.success ? 'text-green-400' : 'text-red-400'}`}
                >
                  {testResult.message}
                </p>
              )}
            </div>
          )}

          {/* Quiet hours */}
          <div className="border-t border-slate-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium">Quiet Hours</p>
                <p className="text-sm text-slate-400">Pause notifications during these hours</p>
              </div>
              <button
                onClick={() => updateSetting('quietHoursEnabled', !settings.quietHoursEnabled)}
                disabled={saving}
                className={`
                  relative w-12 h-6 rounded-full transition-colors
                  ${settings.quietHoursEnabled ? 'bg-primary-600' : 'bg-slate-600'}
                `}
              >
                <span
                  className={`
                    absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
                    ${settings.quietHoursEnabled ? 'left-7' : 'left-1'}
                  `}
                />
              </button>
            </div>

            {settings.quietHoursEnabled && (
              <div className="flex items-center gap-3 mt-3">
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400">From</span>
                  <input
                    type="time"
                    value={settings.quietHoursStart}
                    onChange={(e) => updateSetting('quietHoursStart', e.target.value)}
                    className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400">To</span>
                  <input
                    type="time"
                    value={settings.quietHoursEnd}
                    onChange={(e) => updateSetting('quietHoursEnd', e.target.value)}
                    className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
                  />
                </label>
              </div>
            )}

            {status.quietHoursActive && settings.quietHoursEnabled && (
              <p className="mt-2 text-sm text-yellow-400">Quiet hours currently active</p>
            )}
          </div>

          {/* Cooldown */}
          <div className="border-t border-slate-700 pt-4">
            <div className="mb-2">
              <p className="font-medium">Notification Cooldown</p>
              <p className="text-sm text-slate-400">
                Minimum time between notifications per camera
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="30"
                max="300"
                step="30"
                value={settings.notificationCooldown}
                onChange={(e) => updateSetting('notificationCooldown', parseInt(e.target.value, 10))}
                className="flex-1 accent-primary-500"
              />
              <span className="text-sm text-slate-300 w-16 text-right">
                {settings.notificationCooldown < 60
                  ? `${settings.notificationCooldown}s`
                  : `${Math.floor(settings.notificationCooldown / 60)}m`}
              </span>
            </div>
          </div>

          {/* Per-camera toggles */}
          {cameras.length > 0 && (
            <div className="border-t border-slate-700 pt-4">
              <p className="font-medium mb-3">Camera Notifications</p>
              <div className="space-y-2">
                {cameras.map((camera) => (
                  <div
                    key={camera.id}
                    className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          camera.status === 'online' ? 'bg-green-400' : 'bg-slate-500'
                        }`}
                      />
                      <span className="text-sm">{camera.name}</span>
                    </div>
                    <button
                      onClick={() =>
                        updateCameraNotifications(
                          camera.id,
                          !camera.settings?.notificationsEnabled,
                        )
                      }
                      className={`
                        relative w-10 h-5 rounded-full transition-colors
                        ${camera.settings?.notificationsEnabled ? 'bg-primary-600' : 'bg-slate-600'}
                      `}
                    >
                      <span
                        className={`
                          absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform
                          ${camera.settings?.notificationsEnabled ? 'left-5' : 'left-0.5'}
                        `}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
